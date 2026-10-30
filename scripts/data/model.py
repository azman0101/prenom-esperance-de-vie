"""Modèle agrégé : association statistique, sans interprétation causale."""
import math
import numpy as np
from scipy.optimize import minimize

MODEL_VERSION = "cloglog-ridge-v2"
MIN_BIRTHS = 1000
MIN_DEATHS = 20
MIN_IMPROVEMENT = 0.01


def remaining_life(q, tail_life, age, ratio=1.0):
    """Intégrale conditionnelle, puis queue exponentielle après le dernier âge."""
    last = len(q) - 1
    if age >= last:
        return tail_life / ratio
    survival, result = 1.0, 0.0
    for x in range(age, last):
        following = survival * (1 - q[x]) ** ratio
        result += (survival + following) / 2
        survival = following
    return result + survival * tail_life / ratio


def probability(hazard, beta):
    return np.clip(-np.expm1(-hazard * np.exp(beta)), 1e-12, 1 - 1e-12)


def loss(deaths, risk, p):
    return float(-np.sum(deaths * np.log(p) + (risk - deaths) * np.log1p(-p)))


def fit(rows, penalty):
    """Effet prénom/sexe et déviation décennale, pénalisés séparément.

    Colonnes : name, sex, decade, year, deaths, risk, baseline_q.
    L'offset est externe (tables INSEE), jamais appris sur les décès de validation.
    """
    base_keys = sorted({(r[0], r[1]) for r in rows})
    group_keys = sorted({(r[0], r[1], r[2]) for r in rows})
    bi = {k: i for i, k in enumerate(base_keys)}
    gi = {k: i + len(bi) for i, k in enumerate(group_keys)}
    b = np.array([bi[r[:2]] for r in rows])
    g = np.array([gi[r[:3]] for r in rows])
    d, risk, q = np.array([r[4:] for r in rows], dtype=float).T
    h = -np.log1p(-q)
    weights = np.r_[np.full(len(bi), penalty), np.full(len(gi), penalty * 4)]

    def objective(theta):
        eta = np.clip(theta[b] + theta[g], -5, 5)
        z = h * np.exp(eta)
        p = probability(h, eta)
        value = loss(d, risk, p) + .5 * np.sum(weights * theta ** 2)
        derivative = (risk - d) * z - d * z / np.expm1(np.minimum(z, 700))
        gradient = (np.bincount(b, weights=derivative, minlength=len(theta))
                    + np.bincount(g, weights=derivative, minlength=len(theta))
                    + weights * theta)
        return value, gradient

    result = minimize(objective, np.zeros(len(bi) + len(gi)), jac=True,
                      method="L-BFGS-B", bounds=[(-2.5, 2.5)] * (len(bi) + len(gi)),
                      options={"maxiter": 300, "ftol": 1e-10})
    if not result.success:
        raise ValueError(f"Échec de convergence : {result.message}")
    theta = result.x
    z = h * np.exp(theta[b] + theta[g])
    information = risk * z ** 2 / np.expm1(np.minimum(z, 700))
    diagonal = (np.bincount(b, weights=information, minlength=len(theta))
                + np.bincount(g, weights=information, minlength=len(theta)) + weights)
    # Covariance du couple effet global/décennie : inversion du bloc étoile.
    cross = np.bincount(g, weights=information, minlength=len(theta))
    base_groups = {k: [] for k in bi}
    for key in gi:
        base_groups[key[:2]].append(gi[key])
    effects = {}
    for key, index in gi.items():
        parent = bi[key[:2]]
        children = base_groups[key[:2]]
        schur = diagonal[parent] - sum(cross[j] ** 2 / diagonal[j] for j in children)
        variance = 1 / diagonal[index] + (1 - cross[index] / diagonal[index]) ** 2 / schur
        beta = float(theta[parent] + theta[index])
        se = math.sqrt(variance)
        effects[key] = {"ratio": math.exp(beta),
                        "lower": math.exp(beta - 1.96 * se),
                        "upper": math.exp(beta + 1.96 * se)}
    return effects


def train(rows, group_births):
    report = {"version": MODEL_VERSION, "validated": False, "folds": [],
              "minimumBirths": MIN_BIRTHS, "minimumDeaths": MIN_DEATHS,
              "interval": "Approximation de Laplace à 95 %, hors biais de couverture"}
    rows = [r for r in rows if r[5] > 0 and 0 <= r[4] <= r[5] and 0 < r[6] < 1]
    if not rows:
        report["reason"] = "Aucune cellule de calibration exploitable"
        return {}, report
    last_year = max(r[3] for r in rows)
    report["trainedThrough"] = last_year
    best = None
    for penalty in (1.0, 10.0, 100.0):
        print(f"Validation chronologique : pénalité {penalty:g}", flush=True)
        folds = []
        for end in (last_year - 6, last_year - 4, last_year - 2):
            training = [r for r in rows if r[3] <= end]
            testing = [r for r in rows if end < r[3] <= end + 2]
            if not training or not testing:
                continue
            effects = fit(training, penalty)
            training_events = {}
            for row in training:
                training_events[row[:3]] = training_events.get(row[:3], 0) + row[4]
            # Valider la même règle de publication qu'en production : les
            # groupes trop petits doivent déjà revenir à la référence ici.
            effects = {key: value for key, value in effects.items()
                       if group_births.get(key, 0) >= MIN_BIRTHS
                       and training_events.get(key, 0) >= MIN_DEATHS}
            ds = np.array([r[4] for r in testing], dtype=float)
            risks = np.array([r[5] for r in testing], dtype=float)
            qs = np.array([r[6] for r in testing], dtype=float)
            betas = np.array([math.log(effects.get(r[:3], {"ratio": 1})["ratio"]) for r in testing])
            predicted = probability(-np.log1p(-qs), betas)
            baseline = loss(ds, risks, qs)
            score = loss(ds, risks, predicted)
            folds.append({"trainThrough": end, "testThrough": end + 2,
                          "improvement": (baseline - score) / baseline,
                          "baselineLoss": baseline, "modelLoss": score,
                          "deaths": int(sum(ds)), "predictedDeaths": float(sum(risks * predicted))})
        improvement = float(np.mean([f["improvement"] for f in folds])) if len(folds) == 3 else -1
        if best is None or improvement > best[0]:
            best = improvement, penalty, folds
    improvement, penalty, folds = best
    report.update(penalty=penalty, folds=folds, improvement=improvement,
                  validated=len(folds) == 3 and improvement >= MIN_IMPROVEMENT)
    if not report["validated"]:
        report["reason"] = "Gain hors échantillon inférieur à 1 % ; référence INSEE seule"
        return {}, report
    effects = fit(rows, penalty)
    events = {}
    for r in rows:
        events[r[:3]] = events.get(r[:3], 0) + r[4]
    eligible = {k: v for k, v in effects.items()
                if group_births.get(k, 0) >= MIN_BIRTHS and events.get(k, 0) >= MIN_DEATHS}
    report["eligibleGroups"] = len(eligible)
    return eligible, report
