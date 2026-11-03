#!/usr/bin/env node
// Headless Chrome driver. Runs a page script against the tour without the Browser pane's
// hidden-tab timer throttling, and can save screenshots.
//   node tools/drive.mjs <url> <script.js>
// env: PORT (default 9341, use a different one per parallel run), WIN ("1512,800"),
//      SHOT_DIR (where __shot('name') writes name.png), DEBUG=1
// The script body runs in the page inside an async function; its return value is printed as JSON.
// In the script: `await __shot('name')` saves a PNG, `__e` holds uncaught page errors,
// `sleep(ms)` is available.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [url, scriptPath] = process.argv.slice(2);
if (!url || !scriptPath) { console.error('usage: drive.mjs <url> <script.js>'); process.exit(2); }
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = +(process.env.PORT || 9341);
const WIN = process.env.WIN || '1512,800';
const shotDir = process.env.SHOT_DIR || '/tmp';
mkdirSync(shotDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${process.env.UDD || '/tmp/zt-headless-' + PORT}`, `--window-size=${WIN}`, '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--mute-audio', '--disable-audio-output', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 60; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); target = list.find(t => t.type === 'page'); if (target) break; } catch {}
  await sleep(200);
}
if (!target) { chrome.kill(); console.error('chrome did not start'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const logs = [];
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = async e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.bindingCalled' && m.params.name === '__shotRaw') {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${shotDir}/${m.params.payload}.png`, Buffer.from(r.result.data, 'base64'));
    await send('Runtime.evaluate', { expression: `window.__shotDone && window.__shotDone(${JSON.stringify(m.params.payload)})` });
  }
  if (m.method === 'Runtime.bindingCalled' && m.params.name === '__cdpRaw') {
    const { id: cid, method, params } = JSON.parse(m.params.payload);
    const r = await send(method, params || {});
    await send('Runtime.evaluate', { expression: `window.__cdpDone && window.__cdpDone(${cid}, ${JSON.stringify(JSON.stringify(r.result || r.error || {}).slice(0, 2000))})` });
  }
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
    logs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  }
  if (m.method === 'Runtime.exceptionThrown') logs.push('exception: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 400));
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (process.env.DEBUG) console.error('[cdp]', JSON.stringify(r).slice(0, 900));
  if (r.result?.exceptionDetails) return JSON.stringify({ __exception: JSON.stringify(r.result.exceptionDetails).slice(0, 1200) });
  if (!r.result) return JSON.stringify({ __protocol: JSON.stringify(r).slice(0, 600) });
  return r.result.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Runtime.addBinding', { name: '__shotRaw' });
await send('Runtime.addBinding', { name: '__cdpRaw' });
const [w, hgt] = WIN.split(',').map(Number);
await send('Emulation.setDeviceMetricsOverride', { width: w, height: hgt, deviceScaleFactor: +(process.env.DPR || 1), mobile: false });
await send('Page.navigate', { url });
if (process.env.NOWAIT) await sleep(+(process.env.NOWAIT) > 1 ? +process.env.NOWAIT : 2500);
else for (let i = 0; i < 100; i++) { const r = await send('Runtime.evaluate', { expression: 'window.ZT && window.ZT.ready === true', returnByValue: true }); if (r.result?.result?.value === true) break; await sleep(150); }
await sleep(250);
await evaluate(`window.__e=[];addEventListener('error',e=>__e.push(e.message));addEventListener('unhandledrejection',e=>__e.push('rej:'+String(e.reason)));
window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.__cdpN=0;window.__cdpW={};window.__cdpDone=(i,r)=>{const f=window.__cdpW[i];delete window.__cdpW[i];f&&f(r)};
window.__cdp=(method,params)=>new Promise(res=>{const i=++window.__cdpN;window.__cdpW[i]=res;__cdpRaw(JSON.stringify({id:i,method,params}))});
window.__mouse=(type,x,y,o={})=>__cdp('Input.dispatchMouseEvent',Object.assign({type,x,y,button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:type==='mouseMoved'?0:1},o));
window.__moveTo=async(x,y)=>{await __mouse('mouseMoved',x,y)};
window.__clickAt=async(x,y)=>{await __mouse('mouseMoved',x,y);await __mouse('mousePressed',x,y);await __mouse('mouseReleased',x,y)};
window.__key=async(key,code,vk,type)=>{const p={key,code:code||key,windowsVirtualKeyCode:vk||0,nativeVirtualKeyCode:vk||0};if(type){await __cdp('Input.dispatchKeyEvent',Object.assign({type},p));return}await __cdp('Input.dispatchKeyEvent',Object.assign({type:'rawKeyDown'},p));await __cdp('Input.dispatchKeyEvent',Object.assign({type:'keyUp'},p))};
window.__type=async(text)=>{await __cdp('Input.insertText',{text})};
window.__shot=name=>new Promise(res=>{window.__shotDone=n=>{if(n===name)res(name)};__shotRaw(name)});1`);
const script = readFileSync(scriptPath, 'utf8');
const out = await evaluate(`(async()=>{${script}\n})().then(v=>JSON.stringify(v),e=>JSON.stringify({__thrown:String(e&&e.stack||e)}))`);
try { console.log(JSON.stringify(JSON.parse(out), null, 1)); } catch { console.log(out); }
if (logs.length) console.log('--- page console ---\n' + [...new Set(logs)].slice(0, 30).join('\n'));
ws.close(); chrome.kill();
