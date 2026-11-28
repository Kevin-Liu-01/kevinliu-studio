// Memory on phone profiles (docs/performance.md, Memory). Serve a build first (any static server with clean URLs).
//   PLAYWRIGHT_CORE=<path to a playwright-core whose WebKit and Chromium are installed> \
//   node scripts/memory/soak.mjs <base-url> <label> <mode: pages|soak> [iphone-14 iphone-se pixel-7] [--secs 180]
//   PAGES=/,/about limits the pages; ILL_MODE=machine opens them in the Machine view.
// Writes scripts/memory/out/<label>-<mode>.jsonl (ignored); python3 scripts/memory/summarize.py <file>... prints it.
// Run WebKit profiles one at a time: its helper processes are found by build path, so two WebKit runs see each other.
// Process numbers are phys_footprint (what iOS counts), from macOS `footprint`.
// pages: a fresh context per page, load, wait, scroll to the bottom and back, open what the page opens; peak per page.
// soak: one context per profile scrolls and navigates every page for --secs (180) seconds, sampling every 2 s.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
if (!process.env.PLAYWRIGHT_CORE) { console.error('set PLAYWRIGHT_CORE to a playwright-core folder'); process.exit(2); }
const pw = await import(new URL('index.mjs', `file://${process.env.PLAYWRIGHT_CORE.replace(/\/?$/, '/')}`).href);

const args = process.argv.slice(2);
const [BASE, LABEL, MODE] = args;
const secsAt = args.indexOf('--secs');
const SECS = secsAt > 0 ? Number(args[secsAt + 1]) : 180;
const names = args.slice(3).filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
const PROFILES = {
  'iphone-14': { engine: 'webkit', device: 'iPhone 14' },
  'iphone-se': { engine: 'webkit', device: 'iPhone SE' },
  'pixel-7': { engine: 'chromium', device: 'Pixel 7' },
};
const profiles = (names.length ? names : Object.keys(PROFILES)).filter((n) => PROFILES[n]);
const OUT = new URL(`./out/${LABEL}-${MODE}.jsonl`, import.meta.url);
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const probe = fs.readFileSync(new URL('./probe.js', import.meta.url), 'utf8');
const write = (o) => fs.appendFileSync(OUT, JSON.stringify(o) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CARDS = fs.readdirSync(new URL('../../dist/cards/', import.meta.url)).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));

function procs() {
  return execSync('ps -A -o pid=,ppid=,rss=,command=', { maxBuffer: 1 << 26 }).toString().split('\n').filter(Boolean).map((l) => {
    const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    return m && { pid: +m[1], ppid: +m[2], rss: +m[3] / 1024, cmd: m[4] };
  }).filter(Boolean);
}
// phys_footprint (what iOS jetsam counts, IOSurfaces included), in MB
function fp(pid) {
  try {
    const m = execSync(`footprint -p ${pid}`, { maxBuffer: 1 << 24 }).toString().match(/Footprint: ([\d.]+) (KB|MB|GB)/);
    return m ? +m[1] * { KB: 1 / 1024, MB: 1, GB: 1024 }[m[2]] : 0;
  } catch { return 0; }
}
// process memory of this browser only: chromium by its process tree, webkit by its build's XPC services started after launch
function procMem(engine, root, before) {
  const all = procs();
  if (engine === 'chromium') {
    const tree = new Set([root]);
    let grew = true;
    while (grew) { grew = false; for (const p of all) if (tree.has(p.ppid) && !tree.has(p.pid)) { tree.add(p.pid); grew = true; } }
    const mine = all.filter((p) => tree.has(p.pid));
    const renderer = mine.filter((p) => /--type=renderer/.test(p.cmd)).map((p) => fp(p.pid));
    const gpu = mine.filter((p) => /--type=gpu-process/.test(p.cmd)).reduce((s, p) => s + fp(p.pid), 0);
    return { contentMB: Math.round(Math.max(0, ...renderer)), contentSumMB: Math.round(renderer.reduce((a, b) => a + b, 0)), gpuMB: Math.round(gpu) };
  }
  const mine = all.filter((p) => !before.has(p.pid) && /ms-playwright\/webkit-/.test(p.cmd));
  const wc = mine.filter((p) => /WebContent/.test(p.cmd)).map((p) => fp(p.pid));
  const gpu = mine.filter((p) => /WebKit\.GPU/.test(p.cmd)).reduce((s, p) => s + fp(p.pid), 0);
  return { contentMB: Math.round(Math.max(0, ...wc)), contentSumMB: Math.round(wc.reduce((a, b) => a + b, 0)), gpuMB: Math.round(gpu), nproc: [wc.length, mine.filter((p) => /WebKit\.GPU/.test(p.cmd)).length] };
}

async function launch(name) {
  const { engine, device } = PROFILES[name];
  const before = new Set(procs().map((p) => p.pid));
  const browser = await pw[engine].launch(engine === 'chromium' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] } : { headless: true });
  let root = null;
  if (engine === 'chromium') {
    // the newest chrome process launched with our flags and no --type is the browser
    const cand = procs().filter((p) => !before.has(p.pid) && /enable-precise-memory-info/.test(p.cmd) && !/--type=/.test(p.cmd));
    root = cand.length ? cand[cand.length - 1].pid : null;
  }
  const ctx = await browser.newContext({ ...pw.devices[device], serviceWorkers: 'block' });
  await ctx.addInitScript(probe);
  // ILL_MODE=machine opens every page in the Machine view (the mode Base.astro reads before paint)
  if (process.env.ILL_MODE) await ctx.addInitScript((m) => { try { localStorage.setItem('ill-mode', m); } catch {} }, process.env.ILL_MODE);
  return { browser, ctx, mem: () => procMem(engine, root, before), engine };
}

async function sample(page) {
  try { return await page.evaluate(() => window.__mm && window.__mm()); } catch { return null; }
}

// what a visitor does on each page beyond scrolling
async function act(page, path) {
  if (path === '/') {
    // open the lens on one card and close it
    const c = await page.$('.wall .pocket:not(.tile) .card, .wall .pocket:not(.tile) > *:first-child');
    if (c) { await c.tap().catch(() => c.click().catch(() => {})); await sleep(1500); await page.keyboard.press('Escape').catch(() => {}); await sleep(600); }
  } else if (path.startsWith('/battle')) {
    await sleep(4000);
    for (let i = 0; i < 4; i++) {
      const b = await page.$('button:not([disabled]):visible');
      if (!b) break;
      await b.tap().catch(() => b.click().catch(() => {}));
      await sleep(1500);
    }
  }
}

const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : ['/', '/cards/turboslide', '/cards/claude-of-tanks', '/about', '/battle', '/battle/arena', '/404'];

async function pagesMode(name) {
  for (const path of PAGES) {
    const { browser, ctx, mem } = await launch(name);
    const page = await ctx.newPage();
    let peak = {}, peakMem = { contentMB: 0, contentSumMB: 0, gpuMB: 0 };
    const take = async () => {
      const s = await sample(page); const m = mem();
      if (s) for (const [k, v] of Object.entries(s)) if (typeof v === 'number' && (peak[k] == null || v > peak[k])) peak[k] = v;
      for (const k of ['contentMB', 'contentSumMB', 'gpuMB']) peakMem[k] = Math.max(peakMem[k], m[k] ?? 0);
      return s;
    };
    const t0 = Date.now();
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 }).catch((e) => console.log('goto', path, e.message));
    await sleep(3000); await take();
    { // the wall at ten scroll positions, each held long enough for its tiles, prints and pictures
      const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight).catch(() => 0);
      for (let k = 1; k <= 10; k++) { await page.evaluate((y) => scrollTo(0, y), (h * k) / 10).catch(() => {}); await sleep(900); await take(); }
      await page.evaluate(() => scrollTo(0, 0)).catch(() => {}); await sleep(900); await take();
    }
    await act(page, path); await take();
    await sleep(3000);
    const settled = await take();
    const rec = { label: LABEL, profile: name, path, peak, settled, peakMem, ms: Date.now() - t0 };
    write(rec);
    console.log(name, path, JSON.stringify({ canvasMB: peak.canvasMB, glLive: peak.glLive, texMB: peak.texMB, imgMB: peak.imgMB, playing: peak.playing, videoLoaded: peak.videoLoaded, heapMB: peak.heapMB, ...peakMem }));
    await browser.close();
  }
}

async function soakMode(name) {
  const { browser, ctx, mem } = await launch(name);
  const page = await ctx.newPage();
  const t0 = Date.now();
  let i = 0, crashed = 0, step = '';
  page.on('crash', () => { crashed++; console.log('CRASH', name); });
  const tick = setInterval(async () => {
    const s = await sample(page); const m = mem();
    write({ label: LABEL, profile: name, t: Math.round((Date.now() - t0) / 1000), step, url: page.url().replace(BASE, ''), ...m, ...(s || {}) });
  }, 2000);
  const left = () => SECS * 1000 - (Date.now() - t0);
  const visited = new Set();
  while (left() > 0 || visited.size < 6) {
    const plan = ['/', `/cards/${CARDS[i % CARDS.length]}`, '/about', '/battle', '/battle/arena', '/', 'BACK', 'BACK', `/cards/${CARDS[(i + 9) % CARDS.length]}`, '/404'];
    for (step of plan) {
      if (left() <= 0 && visited.size >= 6) break;
      if (step === 'BACK') await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      else await page.goto(BASE + step, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
      const path = new URL(page.url()).pathname;
      visited.add(path.replace(/\/cards\/.*/, '/cards/*'));
      const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight).catch(() => 0);
      for (let k = 1; k <= 6; k++) { await page.evaluate((y) => scrollTo(0, y), (h * k) / 6).catch(() => {}); await sleep(350); }
      await page.evaluate(() => scrollTo(0, 0)).catch(() => {}); await sleep(300);
      if (path === '/') {
        const c = await page.$('.wall .pocket:not(.tile) .card');
        if (c) { await c.click({ timeout: 3000 }).catch(() => {}); await sleep(1500); await page.keyboard.press('Escape').catch(() => {}); await sleep(500); }
      } else if (path.startsWith('/battle')) {
        await sleep(2500);
        for (let j = 0; j < 2; j++) { const b = await page.$('button:not([disabled]):visible'); if (!b) break; await b.click({ timeout: 3000 }).catch(() => {}); await sleep(1000); }
      }
    }
    i++;
  }
  clearInterval(tick);
  await sleep(2100);
  write({ label: LABEL, profile: name, end: true, crashed, loops: i, visited: [...visited] });
  console.log(name, 'soak done', { loops: i, crashed, visited: [...visited] });
  await browser.close();
}

for (const name of profiles) {
  if (MODE === 'pages') await pagesMode(name);
  else await soakMode(name);
}
