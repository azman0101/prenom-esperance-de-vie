// Vérification du site compilé avec Chromium/Chrome et le protocole DevTools.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const browser = process.env.CHROME_BIN || ['chromium', 'google-chrome'].find(bin => spawnSync('which', [bin]).status === 0);
assert.ok(browser, 'Installer Chromium/Chrome ou définir CHROME_BIN');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'prenoms-browser-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
const chrome = spawn(browser, ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--remote-debugging-port=9222', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
let socket;
try {
  let tabs;
  for (let i = 0; i < 100; i++) {
    try {
      tabs = await (await fetch('http://127.0.0.1:9222/json')).json();
      if (tabs.some(t => t.type === 'page') && (await fetch('http://127.0.0.1:4173/')).ok) break;
    } catch {}
    await delay(100);
  }
  assert.ok(tabs?.some(t => t.type === 'page'), 'Le navigateur doit démarrer');
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', e => {
    const value = JSON.parse(e.data);
    if (value.id) {
      const request = pending.get(value.id);
      if (!request) return;
      pending.delete(value.id);
      clearTimeout(request.timer);
      value.error ? request.reject(value.error) : request.resolve(value.result);
    } else if (value.method === 'Runtime.exceptionThrown') exceptions.push(value.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const seq = ++id;
    const timer = setTimeout(() => { pending.delete(seq); reject(new Error('Délai CDP : ' + method)); }, 20000);
    pending.set(seq, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: seq, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (expression, label) => {
    for (let i = 0; i < 100; i++) {
      try { if (await evaluate(expression)) return; } catch {}
      await delay(100);
    }
    throw new Error('Attente : ' + label);
  };
  const year = async value => evaluate(`(() => { const e=document.querySelector('input[aria-label="Année de naissance globale"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${value}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const screenshot = async file => {
    fs.mkdirSync('.cache/browser', { recursive: true });
    fs.writeFileSync('.cache/browser/' + file, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await until("document.querySelectorAll('#section-bento article').length===4", 'données initiales');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Année de naissance globale\"]').value"), '1970');
  await until("document.querySelector('canvas')!==null", 'montage différé WebGL');
  await year(2025);
  await until("document.querySelector('#section-bento article')?.innerText.includes('2025')", 'cohorte 2025');
  assert.ok(await evaluate("document.getElementById('section-top-names').innerText.includes('NOAH')"));
  await evaluate("Array.from(document.querySelectorAll('#section-top-names li')).find(e=>e.textContent.includes('NOAH')).querySelector('button').click()");
  await until("document.querySelectorAll('#section-bento article').length===5", 'ajout du palmarès');
  await evaluate("document.getElementById('section-bento').scrollIntoView()"); await delay(500);
  await screenshot('comparaison-desktop.png');
  await year(1969);
  await until("document.querySelector('#section-bento article')?.innerText.includes('Indisponible avant 1970')", 'absence de survie historique');
  await evaluate("document.querySelector('#section-curves input[type=checkbox]').click()");
  assert.ok(await evaluate("document.querySelectorAll('#section-curves path[stroke-dasharray]').length>0"));
  await send('Network.setBlockedURLs', { urls: ['*data/cohorts/2025.json'] });
  await year(2025);
  await until("document.body.innerText.includes('Données indisponibles')", 'échec réseau explicite');
  assert.equal(await evaluate("document.querySelectorAll('#section-bento article').length"), 0, 'Aucune ancienne cohorte sous une nouvelle année');
  await send('Network.setBlockedURLs', { urls: [] });
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Réessayer').click()");
  await until("document.querySelector('#section-bento article')?.innerText.includes('2025')", 'reprise après erreur');
  await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 10000000, uploadThroughput: 1000000 });
  await year(1920); await delay(30); await year(2025);
  await until("document.querySelector('#section-bento article')?.innerText.includes('2025')", 'changement rapide de cohorte');
  await delay(300);
  assert.ok(await evaluate("document.querySelector('#section-bento article').innerText.includes('2025')"));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.getElementById('section-top-names').scrollIntoView()"); await delay(500);
  await screenshot('palmares-mobile.png');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=390'), 'Pas de débordement horizontal de la page');
  assert.deepEqual(exceptions, [], 'Aucune exception JavaScript');
  console.log('Navigateur : WebGL, données 2025, ajout, historique, panne/reprise, annulation et mobile OK');
} finally {
  socket?.close();
  chrome.kill('SIGTERM'); server.kill('SIGTERM');
  await delay(500);
  fs.rmSync(profile, { recursive: true, force: true });
}
