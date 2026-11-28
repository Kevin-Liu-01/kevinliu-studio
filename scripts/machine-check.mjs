// The Machine view against another build (docs/architecture.md, Machine view). Serve both builds first (any static
// server with clean URLs), then:
//   PLAYWRIGHT_CORE=<playwright-core folder> node scripts/machine-check.mjs <before-url> <after-url> <out-dir>
// ENGINE=chromium switches from WebKit; PAGES=/,/about picks pages; ONLY=home-1440,about-390 picks page-width pairs.
// 1. Human view unchanged: main and branch screenshots, motion paused, compared pixel by pixel.
// 2. Alignment: every region's box in Human and Machine on the branch, at 1440, 730, 390 and 320.
// 3. The switch: keyboard operable, aria-pressed, persisted, layout shifts during it, focus, no horizontal scroll.
// 4. Screenshots of both modes; the accessibility tree in Machine mode.
import fs from 'node:fs';
import { KEY } from '../src/lib/state.mjs';
const pw = await import(process.env.PLAYWRIGHT_CORE + '/index.mjs');
const [MAIN, BR, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIDTHS = [[1440, 900, 1], [730, 900, 2], [390, 844, 3], [320, 640, 2]];
const PAGES = (process.env.PAGES ?? '/,/cards/claude-of-tanks,/about,/nope').split(',');
const REGIONS = ['header.top .brand', 'header.top .links a', 'header.top .seg', 'header.top .seg > button', '#sound', '#pause', '.wall > .pocket', '.dock', '.dock .well', '.dock .gauge', '#play', 'footer.foot', '.cardpage .stand', '.cardpage .stand > .card', '.cardpage h1', '.cardpage .cp-facts > li', '.cardpage .cp-moves > li', '.pager a', '.prose h1', '.prose li'];
// layout shifts are measured only in Chromium (WebKit reports no layout-shift entries); its WebGL stalls a loaded Mac's
// headless run for over 30 s on the wall, and a shift is layout, so it runs without WebGL
const ENGINE = process.env.ENGINE ?? 'webkit';
const browser = await pw[ENGINE].launch({ headless: true, ...(ENGINE === 'chromium' ? { args: ['--disable-3d-apis', '--disable-webgl'] } : {}) });
const report = { human: [], boxes: [], toggle: [], overflow: [], a11y: {} };

async function open(base, path, [w, h, dpr], mode, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: 'reduce', isMobile: w < 640, hasTouch: w < 640, ...extra });
  await ctx.addInitScript(({ m, K }) => {
    // the mode is set once per context, so a reload reads what the page stored, not this script's value
    try { if (!sessionStorage.getItem('mc-set')) { localStorage.setItem(K.mode, m); localStorage.setItem(K.pause, '1'); sessionStorage.setItem('mc-set', '1'); } } catch {}
    window.__shifts = [];
    window.__shiftsMeasured = PerformanceObserver.supportedEntryTypes.includes('layout-shift');
    if (window.__shiftsMeasured) new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ v: e.value, input: e.hadRecentInput, t: Math.round(e.startTime) }); }).observe({ type: 'layout-shift', buffered: true });
  }, { m: mode, K: KEY });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  await page.goto(base + path, { waitUntil: 'load', timeout: 300000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !('hold' in document.documentElement.dataset), null, { timeout: 15000 }).catch(() => {});
  await sleep(2500);
  return { ctx, page };
}
const rects = (page) => page.evaluate((sels) => {
  const o = {};
  // a fixed box (the dock) is measured in the viewport, a page box in the document, so a scroll between the two
  // measurements (focus moving to the footer's switch on a phone) moves neither
  const fixed = (e) => { for (; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true; return false; };
  for (const s of sels) document.querySelectorAll(s).forEach((e, i) => { const r = e.getBoundingClientRect(), f = fixed(e); o[`${s}[${i}]`] = [r.x + (f ? 0 : scrollX), r.y + (f ? 0 : scrollY), r.width, r.height].map((n) => Math.round(n * 100) / 100); });
  return o;
}, REGIONS);
const diffPixels = async (a, b) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const n = await p.evaluate(async ([x, y]) => {
    const load = (b64) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
    const [i1, i2] = await Promise.all([load(x), load(y)]);
    if (i1.width !== i2.width || i1.height !== i2.height) return { size: [i1.width, i1.height, i2.width, i2.height] };
    const c = new OffscreenCanvas(i1.width, i1.height), g = c.getContext('2d');
    g.drawImage(i1, 0, 0); const d1 = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(i2, 0, 0); const d2 = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let k = 0; k < d1.length; k += 4) if (Math.abs(d1[k] - d2[k]) + Math.abs(d1[k + 1] - d2[k + 1]) + Math.abs(d1[k + 2] - d2[k + 2]) > 24) n++;
    return { differ: n, of: d1.length / 4 };
  }, [a.toString('base64'), b.toString('base64')]);
  await ctx.close();
  return n;
};
const tag = (path) => (path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '-'));

for (const path of PAGES) {
  for (const W of WIDTHS) {
    const t = `${tag(path)}-${W[0]}`;
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(t)) continue;
    try {
    // 1. human view, main against branch
    const m = await open(MAIN, path, W, 'human'); const b = await open(BR, path, W, 'human');
    const [sm, sb] = [await m.page.screenshot(), await b.page.screenshot()];
    fs.writeFileSync(`${OUT}/${t}-human-main.png`, sm); fs.writeFileSync(`${OUT}/${t}-human.png`, sb);
    const rm = await rects(m.page), rb = await rects(b.page);
    const boxDiff = Object.keys({ ...rm, ...rb }).filter((k) => JSON.stringify(rm[k]) !== JSON.stringify(rb[k]));
    report.human.push({ page: t, pixels: await diffPixels(sm, sb), boxesThatDiffer: boxDiff.slice(0, 8), shiftsMain: await m.page.evaluate(() => window.__shiftsMeasured ? window.__shifts.filter((s) => !s.input).reduce((a, s) => a + s.v, 0) : 'not measured'), shifts: await b.page.evaluate(() => window.__shiftsMeasured ? window.__shifts.filter((s) => !s.input).reduce((a, s) => a + s.v, 0) : 'not measured') });
    await m.ctx.close();
    // 2 and 3. switch to Machine by keyboard where the switch shows (the header's from 640 up, the footer's below)
    const page = b.page;
    const before = await rects(page);
    const sel = W[0] >= 640 ? 'header.top .seg [data-mode-set="machine"]' : '.foot .tomachine';
    await page.focus(sel); await page.keyboard.press('Enter'); await sleep(800);
    const after = await rects(page);
    const moved = Object.keys(before).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map((k) => `${k} ${before[k]} -> ${after[k]}`);
    const st = await page.evaluate((K) => ({
      mode: document.documentElement.dataset.mode, stored: localStorage.getItem(K.mode),
      pressed: [...document.querySelectorAll('[data-mode-set]')].map((x) => `${x.dataset.modeSet}:${x.getAttribute('aria-pressed')}`).join(' '),
      focus: document.activeElement && (document.activeElement.dataset.modeSet ?? document.activeElement.tagName),
      shiftsAll: window.__shiftsMeasured ? window.__shifts.reduce((a, s) => a + s.v, 0) : 'not measured', shiftsNoInput: window.__shiftsMeasured ? window.__shifts.filter((s) => !s.input).reduce((a, s) => a + s.v, 0) : 'not measured',
      hscroll: document.scrollingElement.scrollWidth - innerWidth,
      overflowing: [...document.querySelectorAll('.rec, .mx')].filter((e) => e.checkVisibility() && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1) && getComputedStyle(e).overflow !== 'visible').map((e) => (e.closest('.pocket')?.querySelector('[data-id]')?.dataset.id ?? e.closest('[id]')?.id ?? e.className) + ' ' + e.scrollHeight + '/' + e.clientHeight),
    }), KEY);
    fs.writeFileSync(`${OUT}/${t}-machine.png`, await page.screenshot());
    if (W[0] === 1440 || W[0] === 390) fs.writeFileSync(`${OUT}/${t}-machine-full.png`, await page.screenshot({ fullPage: true }));
    // back to Human by keyboard, and a reload keeps the stored mode
    await page.reload({ waitUntil: 'load' }); await sleep(1500);
    const kept = await page.evaluate(() => document.documentElement.dataset.mode);
    const back = W[0] >= 640 ? 'header.top .seg [data-mode-set="human"]' : '.foot .tohuman';
    await page.focus(back).catch(() => {}); await page.keyboard.press('Enter'); await sleep(500);
    const backTo = await page.evaluate(() => document.documentElement.dataset.mode);
    report.toggle.push({ page: t, ...st, keptAfterReload: kept, backTo, moved: moved.slice(0, 12), movedCount: moved.length });
    if (path === '/' && W[0] === 1440) {
      await page.focus('header.top .seg [data-mode-set="machine"]'); await page.keyboard.press('Enter'); await sleep(500);
      report.a11y.home = (await page.locator('main').ariaSnapshot()).slice(0, 3000);
      report.a11y.footer = (await page.locator('footer').ariaSnapshot()).slice(0, 1500);
    }
    await b.ctx.close();
    console.log(t, JSON.stringify(report.human.at(-1)), JSON.stringify({ ...report.toggle.at(-1), moved: report.toggle.at(-1).moved.slice(0, 3) }));
    } catch (e) { report.failed = [...(report.failed ?? []), `${t}: ${String(e.message).split('\n')[0]}`]; console.log(t, 'FAILED', e.message.split('\n')[0]); }
  }
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
await browser.close();
