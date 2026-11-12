// Princeton TD's live sprite, off the main thread (ROUND6 3.1): a module Worker that imports the game's own tower
// renderers (arena/ptd-sprite.js) and draws each figure's form into the OffscreenCanvas its page canvas handed over.
// arena/ptd-figure.js owns the clock and every decision; this file only mirrors its state and draws.
//
// The clock: the page posts the battle's clock (`clock`: its virtual time and rate) whenever the pace changes; here
// V = virt + (now - at) * rate. A figure's own time is F = base + V while it runs, held while frozen; every time below
// (aim, fire) is in F. Every message that carries a time also carries the page's clock (virt, rate), so a frozen
// battle stepped on by battlePace.step never leaves this side on an old V. A `clock` with `draw` (the page's pace step)
// draws every running figure once at the new time and answers `paced`. Messages in: smoke, clock, add, form, size, aim,
// fire, run, step, tint, drop, stats, still (a scene's cropped form, fixes-2 I1). Out: smoke, frame (with the step's id),
// paced, error, stats, still.

let sprite = null;
const figs = new Map();
const clk = { virt: 0, at: performance.now(), rate: 1 };
const V = () => clk.virt + (performance.now() - clk.at) * clk.rate;
const fTime = (f) => (f.frozen ? f.held : f.base + V());

const ease = (x) => 1 - (1 - x) ** 3;
function rotationAt(f, F) {
  const a = f.aim;
  if (!a) return f.rotation;
  const k = a.ms > 0 ? Math.min(1, Math.max(0, (F - a.t0) / a.ms)) : 1;
  return a.from + (a.to - a.from) * ease(k);
}

function draw(f) {
  if (!sprite || !f.ctx || !f.form) return;
  const F = fTime(f);
  f.lastF = F; f.lastAge = f.lastAttack == null ? null : F - f.lastAttack;
  const g = f.ctx, s = f.scale;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, f.canvas.width, f.canvas.height);
  g.setTransform(s, 0, 0, s, 0, 0);
  sprite.drawForm(g, {
    type: f.form.type, level: f.form.level, x: f.form.tile[0], y: f.form.tile[1], zoom: f.form.zoom,
    time: F / 1000, attackAge: f.lastAttack == null ? Infinity : Math.max(0, F - f.lastAttack), rotation: rotationAt(f, F),
  });
  if (f.form.feather) sprite.featherEdges(g, f.form.w, f.form.h, f.form.feather);
  if (f.tint) {
    // the side's grade, applied here when the page's SVG filter costs too much on a live canvas
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = f.tint.share;
    g.fillStyle = f.tint.color;
    g.fillRect(0, 0, f.canvas.width, f.canvas.height);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  f.frames++;
}

// one loop for every figure, each at its own rate (30 fps desktop, 15 coarse), only while one is running
let timer = 0;
function loop() {
  timer = 0;
  const now = performance.now();
  let next = Infinity;
  for (const f of figs.values()) {
    if (!f.running || f.frozen || !clk.rate) continue;
    const every = 1000 / f.fps;
    if (now >= f.due) {
      draw(f);
      f.due = Math.max(f.due + every, now + every * 0.5);
    }
    next = Math.min(next, f.due);
  }
  if (next < Infinity) timer = setTimeout(loop, Math.max(1, next - performance.now()));
}
function kick() { if (!timer) timer = setTimeout(loop, 0); }

async function load(url) { sprite ??= await import(url); return sprite; }

const TYPES = ['cannon', 'station', 'library', 'mortar', 'lab', 'arch', 'club'];
const LEVELS = [1, 2, 3, '4a', '4b'];

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.t !== 'clock' && m.virt != null) Object.assign(clk, { virt: m.virt, rate: m.rate, at: performance.now() });
    switch (m.t) {
      case 'smoke': {
        // every form once, small, before any page canvas is handed over: a failure sends the page to its fallback
        await load(m.sprite);
        const c = new OffscreenCanvas(96, 96), g = c.getContext('2d');
        if (!g) throw new Error('no 2d context on an OffscreenCanvas');
        const t0 = performance.now();
        let n = 0;
        for (const type of TYPES) for (const level of LEVELS) {
          g.clearRect(0, 0, 96, 96);
          sprite.drawForm(g, { type, level, x: 48, y: 80, zoom: 0.35, time: 0.5 });
          n++;
        }
        const px = g.getImageData(0, 0, 96, 96).data;
        let painted = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i]) painted++;
        if (!painted) throw new Error('the smoke drew nothing');
        self.postMessage({ t: 'smoke', ok: true, forms: n, ms: performance.now() - t0 });
        break;
      }
      case 'clock': {
        Object.assign(clk, { virt: m.virt, rate: m.rate, at: performance.now() });
        if (m.draw != null) {
          for (const f of figs.values()) if (f.running && !f.frozen) draw(f);
          self.postMessage({ t: 'paced', n: m.draw });
        }
        kick();
        break;
      }
      case 'add': {
        const f = { id: m.id, canvas: m.canvas, ctx: m.canvas.getContext('2d'), scale: 1, fps: m.fps, due: 0, frames: 0,
          base: m.base, frozen: m.frozen, held: m.held, running: m.running, rotation: m.rotation, aim: null, lastAttack: null, form: null, tint: null };
        figs.set(m.id, f);
        Object.assign(f, sizeOf(f, m.size));
        f.form = m.form;
        draw(f);
        self.postMessage({ t: 'frame', id: m.id, step: m.step ?? null, frames: f.frames });
        kick();
        break;
      }
      case 'form': {
        const f = figs.get(m.id);
        if (!f) break;
        f.form = m.form;
        if (m.rotation != null) { f.rotation = m.rotation; f.aim = null; }
        Object.assign(f, sizeOf(f, m.size));
        draw(f);
        self.postMessage({ t: 'frame', id: m.id, step: m.step ?? null, frames: f.frames });
        break;
      }
      case 'size': { const f = figs.get(m.id); if (f) { Object.assign(f, sizeOf(f, m.size)); draw(f); } break; }
      case 'aim': { const f = figs.get(m.id); if (f) { f.rotation = m.to; f.aim = { from: m.from, to: m.to, t0: m.t0, ms: m.ms }; kick(); } break; }
      case 'fire': { const f = figs.get(m.id); if (f) { f.lastAttack = m.lastAttack; kick(); } break; }
      case 'run': {
        const f = figs.get(m.id);
        if (!f) break;
        Object.assign(f, { running: m.running, frozen: m.frozen, base: m.base, held: m.held });
        if (f.running && !f.frozen) { f.due = 0; kick(); }
        break;
      }
      case 'step': {
        const f = figs.get(m.id);
        if (!f) break;
        Object.assign(f, { base: m.base, held: m.held, frozen: m.frozen });
        draw(f);
        self.postMessage({ t: 'frame', id: m.id, step: m.step, frames: f.frames });
        break;
      }
      case 'tint': { const f = figs.get(m.id); if (f) { f.tint = m.tint; draw(f); } break; }
      case 'stats': self.postMessage({ t: 'stats', figs: [...figs.values()].map((f) => ({ id: f.id, frames: f.frames, running: f.running, frozen: f.frozen, w: f.canvas.width, h: f.canvas.height, lastF: f.lastF ?? null, lastAge: f.lastAge ?? null, virt: clk.virt, rate: clk.rate })) }); break;
      case 'still': {
        // a scene's form still (fixes-2 I1): the form at rest, the side's own aim, drawn at the scene's scale k and
        // cropped to its ink box (arena/ptd-ink.json: the still's pixels over alpha 24, holding forms.json's `box`) grown by
        // one still px at k plus 2 device px, so no opaque pixel lies on the crop's edge (critic of fixes-2 I1), with one
        // drawImage, then encoded here, so the
        // page's main thread only decodes a picture
        await load(m.sprite);
        const v = m.view, k = m.k, W = Math.ceil(v.w * k), H = Math.ceil(v.h * k);
        const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
        g.setTransform(k, 0, 0, k, 0, 0);
        sprite.drawForm(g, { type: m.type, level: m.level, x: v.tile[0], y: v.tile[1], zoom: m.zoom, time: 0, attackAge: Infinity, rotation: m.rotation ?? undefined });
        if (v.feather && sprite.featherEdges) sprite.featherEdges(g, v.w, v.h, v.feather);
        const b = v.ink ?? v.box, pad = Math.ceil(k) + 2;
        const x0 = Math.max(0, Math.floor(b[0] * k) - pad), y0 = Math.max(0, Math.floor(b[1] * k) - pad);
        const x1 = Math.min(W, Math.ceil(b[2] * k) + pad), y1 = Math.min(H, Math.ceil(b[3] * k) + pad);
        const out = new OffscreenCanvas(x1 - x0, y1 - y0);
        out.getContext('2d').drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
        c.width = c.height = 1;
        const blob = await out.convertToBlob({ type: 'image/webp', quality: 0.92 });
        out.width = out.height = 1;
        self.postMessage({ t: 'still', id: m.id, ok: true, blob, rect: [x0, y0, x1 - x0, y1 - y0] });
        break;
      }
      case 'drop': { const f = figs.get(m.id); if (f) { f.canvas.width = f.canvas.height = 1; figs.delete(m.id); } break; }
    }
  } catch (err) {
    if (m.t === 'clock' && m.draw != null) self.postMessage({ t: 'paced', n: m.draw });
    if (m.t === 'still') { self.postMessage({ t: 'still', id: m.id, ok: false, message: String(err?.message ?? err) }); return; }
    self.postMessage({ t: m.t === 'smoke' ? 'smoke' : 'error', ok: false, id: m.id, step: m.step ?? null, message: String(err?.message ?? err) });
  }
};

/** The backing store: the view's 2x px times `scale`, never larger than 600 x 900. */
function sizeOf(f, size) {
  if (!size) return {};
  const w = Math.max(1, Math.round(size.w * size.scale)), h = Math.max(1, Math.round(size.h * size.scale));
  if (f.canvas.width !== w) f.canvas.width = w;
  if (f.canvas.height !== h) f.canvas.height = h;
  return { scale: size.scale, fps: size.fps ?? f.fps };
}
