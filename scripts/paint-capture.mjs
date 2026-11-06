#!/usr/bin/env node
// A paint recording that survives a loaded machine, for the ui-recording-timeline skill (docs/performance.md).
// It screencasts one browser page over CDP until <stop-file> exists and writes every frame the compositor sends as a
// JPEG with its own timestamp, plus frames.txt (an ffmpeg concat list giving each frame its real duration). Nothing
// is encoded live, so frames are never dropped for falling behind (agent-browser's `record` stops when its encoder
// lags 500 ms). Then: ffmpeg -f concat -safe 0 -i <out>/frames.txt -fps_mode vfr -pix_fmt yuv420p <out>.mp4
// usage: node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" <out-dir> <stop-file> [max-ms]
import fs from 'node:fs';
import path from 'node:path';

const [url, out, stop, maxMs = '60000'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const ws = new WebSocket(url);
let id = 0;
const waiting = new Map();
const frames = [];
let sessionId;
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); return; }
  if (msg.method === 'Page.screencastFrame') {
    const { data, metadata, sessionId: sid } = msg.params;
    const f = `f${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(out, f), Buffer.from(data, 'base64'));
    frames.push({ f, ts: metadata.timestamp });
    send('Page.screencastFrameAck', { sessionId: sid }, msg.sessionId);
  }
};
const send = (method, params = {}, sid) => new Promise((r) => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
await new Promise((r) => (ws.onopen = r));
const { result } = await send('Target.getTargets');
const page = result.targetInfos.find((t) => t.type === 'page' && t.attached && !t.url.startsWith('chrome')) ?? result.targetInfos.find((t) => t.type === 'page' && !t.url.startsWith('chrome'));
sessionId = (await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })).result.sessionId;
await send('Page.enable', {}, sessionId);
const r = await send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 960, maxHeight: 960, everyNthFrame: 1 }, sessionId);
if (r.error) { console.error(r.error); process.exit(1); }
fs.writeFileSync(path.join(out, 'started'), '');
const t0 = Date.now();
while (!fs.existsSync(stop) && Date.now() - t0 < +maxMs) await new Promise((res) => setTimeout(res, 50));
await send('Page.stopScreencast', {}, sessionId);
ws.close();
if (!frames.length) { console.error('no frames'); process.exit(1); }
frames.sort((a, b) => a.ts - b.ts); // acks can return out of order
const lines = [];
frames.forEach((s, i) => {
  const next = i + 1 < frames.length ? frames[i + 1].ts : s.ts + 0.5; // hold the last frame half a second
  lines.push(`file '${s.f}'`, `duration ${(next - s.ts).toFixed(6)}`);
});
lines.push(`file '${frames.at(-1).f}'`);
fs.writeFileSync(path.join(out, 'frames.txt'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify(frames.map((x) => ({ f: x.f, t: +(x.ts - frames[0].ts).toFixed(4) }))));
console.log(`${frames.length} frames over ${(frames.at(-1).ts - frames[0].ts).toFixed(2)} s -> ${out}`);
