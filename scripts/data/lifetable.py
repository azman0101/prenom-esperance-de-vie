"""Espérance résiduelle conditionnelle à partir d'une table de quotients de mortalité."""


def remaining_life(q, tail_life, age):
    """Intégrale conditionnelle, puis queue exponentielle après le dernier âge."""
    last = len(q) - 1
    if age >= last:
        return tail_life
    survival, result = 1.0, 0.0
    for x in range(age, last):
        following = survival * (1 - q[x])
        result += (survival + following) / 2
        survival = following
    return result + survival * tail_life
