// The seam's three runtime additions (MODES.md section 2), built on the battle's runtime (vendor/broadcast/kit.js) by
// extension rather than inside it, since r3/battle belongs to the merge run: this file is what that run ports into
// runtime/src/director.ts, runtime/src/stage.ts and broadcast/src/fx.ts. Pages hand the Director hooks and the Stage
// anchors through these classes; they never patch the runtime.
//   1. Director: awaited before(shot) and after(shot) hooks around each scene, the `board` moment, flush(shot) for a
//      shot with no scene.
//   2. Stage: `anchors` (the deal and the pop-up start from the card's place on the board, a FLIP into their slot in
//      front of the bars), and each card's linked ground kept once built instead of disposed at the next card.
//   3. The `board` ending every short attack takes: the bars open to 0.86, the scene's world, its dealt card and its
//      contact clear at the impact, and the board carries the reaction and owns the number.
//   4. A scene staged in a band over the board (`Stage.box`): the layout names the band, the Stage plays the scene in a
//      host around it, its bars close on the band's edges and let the board through, dimmed.
const { runtime } = window.showdown;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeInOut = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2; };
/** Run `f` in the first frame that begins after `t0` (as shared/fx.js afterFrame). */
const afterFrame = (t0, f) => requestAnimationFrame((ts) => (ts > t0 ? f() : afterFrame(t0, f)));

// ============================================================ 3. the board ending
const has = (b, o) => (Array.isArray(b.when) ? b.when.includes(o) : b.when === o);
/** The readouts an effect draws straight on the scene (a timecode, a caption, a ledger, an axis, a wave): they keep
 *  their own opacity, so a fade of the fx layer cannot clear them; the board moment ends them. */
const READOUTS = new Set(['timecode', 'caption', 'ledger', 'axis', 'wave']);
export function boardShort(beats) {
  const imp = beats.find((b) => b.do === 'impact');
  if (!imp) return beats;
  const I = imp.at, END = I + 300;
  const out = beats.filter((b) => {
    if (b.do === 'damage') return false;
    if (b.do === 'fx' && b.name === 'contact') return false;
    if ((b.do === 'set' || b.do === 'show') && b.layer === 'target') return false;
    if (b.do === 'target' || b.do === 'whip' || b.do === 'dutch') return false;
    if (b.do === 'flash' && b.area === 'target') return false;
    if (b.do === 'flash' && (!b.area || b.area === 'frame') && has(b, 'hit') && !has(b, 'crit')) return false;
    if (b.do === 'bars' && b.at >= I - 200) return false;
    if (b.do === 'fade' && b.at >= I - 120) return false;
    // the contact is the board's: no burst, gauge, readout or tracer of the scene's lands on the cards
    if (b.do === 'particles' && b.at + (b.dur ?? 0) >= I - 130) return false;
    return true;
  }).map((b) => (b.dur !== undefined && b.at + b.dur > END ? { ...b, dur: Math.max(0, END - b.at) } : b))
    .map((b) => (b.do === 'fx' && READOUTS.has(b.name) && b.dur !== undefined && b.at + b.dur > I - 130 ? { ...b, dur: Math.max(0, I - 130 - b.at) } : b))
    .filter((b) => b.at <= END && !(b.do === 'fx' && READOUTS.has(b.name) && b.at >= I - 130));
  // the dealt card fades with the world as its own card or figure takes the contact: one of each on screen
  out.push(
    { at: Math.max(0, I - 130), do: 'cue', name: 'board' },
    { at: Math.max(0, I - 120), dur: 130, do: 'bars', to: 0.86, ease: 'matte' },
    { at: Math.max(0, I - 110), dur: 120, do: 'fade', layers: ['ground', 'plate', 'feature', 'cutout'] },
    // the scene's fx (gauges, readouts, tracers) and its call-out clear at the board moment, before the contact
    { at: Math.max(0, I - 130), dur: 110, do: 'fade', layers: ['fx', 'callout'] },
    { at: I + 100, dur: 160, do: 'fade' },
    { at: I + 100, dur: 200, do: 'bars', to: 1, ease: 'matte' },
  );
  return out;
}

// ============================================================ 4. a scene staged in a band over the board
/** The matte every scene's bars rest on (Broadcast's 2.39:1, `AP` in the grammar). */
const AP = 0.744;
/** A band's bars: a scene's matte (AP) lands on the band's edges, a wider opening opens toward the host's edges and a
 *  tighter one (a slam) closes in proportion. `open` is the band's share of the host's height. */
export function bandAperture(open) {
  const aB = clamp(1 - (1 - open) / 1.01, 0.05, 0.99);
  return (a) => (a <= AP ? (a * aB) / AP : aB + ((a - AP) * (1 - aB)) / (1 - AP));
}
/** The beats of a scene played in a band: every aperture it sets (its bars, a set, a matte effect) through the band's. */
export function banded(beats, open) {
  if (!beats || !open) return beats;
  const f = bandAperture(open);
  return beats.map((b) => {
    if (b.do === 'bars' && typeof b.to === 'number') return { ...b, to: f(b.to) };
    if (b.do === 'set' && b.layer === 'bars' && typeof b.to?.aperture === 'number') return { ...b, to: { ...b.to, aperture: f(b.to.aperture) } };
    if (b.do === 'fx' && typeof b.params?.a === 'number') return { ...b, params: { ...b.params, a: f(b.params.a) } };
    return b;
  });
}

// ============================================================ time edits on a scene's beats
/** Insert `ms` of stillness at time `t`: beats from `t` on start later, beats running across it last longer. */
export function insertAt(beats, t, ms, stretch = true) {
  if (!ms) return beats;
  return beats.map((b) => (b.at >= t ? { ...b, at: b.at + ms } : stretch && b.dur !== undefined && b.at + b.dur > t ? { ...b, dur: b.dur + ms } : b));
}
/** A full scene's own number: the damage that landed from its first frame (no count-up), held at least `NUMBER_HOLD`
 *  ms before the scene's closing fade takes it; the scene's ending waits for it. */
export const NUMBER_HOLD = 640;
export function holdNumber(beats) {
  const dmg = beats.filter((b) => b.do === 'damage');
  if (!dmg.length) return beats;
  const on = Math.min(...dmg.map((b) => b.at));
  const fades = beats.filter((b) => b.do === 'fade' && b.at > on && (!b.layers || b.layers.includes('damage')));
  const fadeAt = fades.length ? Math.min(...fades.map((b) => b.at)) : Infinity;
  // never past a full scene's 2400 ms limit (four scenes give back up to 60 ms of the hold)
  const end = Math.max(...beats.map((b) => b.at + (b.dur ?? 0)));
  const need = Number.isFinite(fadeAt) ? Math.max(0, Math.min(on + NUMBER_HOLD - fadeAt, runtime.LIMITS.full - end)) : 0;
  // the closing (its bars and fade start within 40 ms of the fade) moves as one block
  return insertAt(beats.map((b) => (b.do === 'damage' ? { ...b, roll: false } : b)), fadeAt - 40, need);
}
/** The match-deciding blow: a hit-stop of `ms` on the lethal contact. The scene's own stop at its impact is lengthened
 *  (or one is added) and everything after the impact moves later by the difference, so nothing is skipped; what runs
 *  across the impact (the bars opening, the camera) holds where it stands during the stop, as the stop freezes it. */
export const FINISH_STOP = 280;
export function finishStop(beats, ms = FINISH_STOP) {
  const imp = beats.find((b) => b.do === 'impact');
  if (!imp) return beats;
  const I = imp.at;
  const stop = beats.find((b) => b.do === 'hitstop' && Math.abs(b.at - I) <= 30);
  const extra = Math.max(0, ms - (stop?.dur ?? 0));
  const out = insertAt(beats, I + 1, extra, false).map((b) => (b === stop || (stop && b.do === 'hitstop' && b.at === stop.at) ? { ...b, dur: Math.max(b.dur ?? 0, ms) } : b));
  if (!stop) out.push({ at: I, dur: ms, do: 'hitstop' });
  return out;
}
/** A move's second use in a battle: its short scene framed again. The footage comes in tighter and off centre, drifting
 *  the other way, so the repeat reads as a new angle; the camera, the bars and the call-out keep the first use's frame. */
export function altFraming(beats, side) {
  const k = side === 'rival' ? -1 : 1;
  return beats.map((b) => (b.do === 'feature' ? { ...b, from: { ...(b.from ?? {}), scale: 1.34, x: 5 * k, y: -3 }, to: { ...(b.to ?? {}), scale: 1.2, x: 2 * k, y: -1 } } : b));
}
/** The result staged from the board: no world and no dealt card, so the winner's cards or figure and both leaders in
 *  their victory and defeat poses stay in frame between bars at 0.8 while the title is called large and held. The
 *  `board` cue at its start starts the board's finale. */
export function boardResult() {
  return [
    { at: 0, do: 'cue', name: 'board' },
    { at: 0, dur: 240, do: 'bars', to: 0.8, ease: 'matte' },
    { at: 120, dur: 240, do: 'callout', from: { reveal: 0 }, to: { reveal: 1 }, ease: 'snap', style: 'result' },
    { at: 360, do: 'impact' },
    { at: 360, dur: 480, do: 'particles', preset: 'discipline', count: 60, origin: [50, 50], when: 'player' },
    { at: 1260, dur: 160, do: 'fade', layers: ['callout', 'particles'] },
    { at: 1260, dur: 180, do: 'bars', to: 1, ease: 'matte' },
  ];
}

// ============================================================ 2. the deal and the pop-up start from the anchor
/** The deal (or pop-up) starts from `ctx.anchors.source`, the card's place on the board, and FLIPs into its slot over
 *  its first `key` ms; with no anchor it keeps its own entry. The anchor was read once before the scene began; the
 *  slot's own box and origin are read once per slot, side, variant, stage size and band, then reused, so a scene's
 *  first frame reads nothing it has read before. */
const SLOTS = new Map();
function slotBox(root, c) {
  const key = [c.params.slot ?? '', c.scene.kind, c.scene.side, c.scene.variant, ...(c.size?.() ?? []), c.band?.top ?? '', c.band?.height ?? ''].join('|');
  let g = SLOTS.get(key);
  if (!g) {
    const r = root.getBoundingClientRect();
    if (!(r.width > 2)) return null;
    const o = getComputedStyle(root).transformOrigin.split(' ').map(parseFloat);
    g = { r: { left: r.left, top: r.top, width: r.width, height: r.height }, o };
    SLOTS.set(key, g);
  }
  return g;
}
function anchored(def, key) {
  return {
    mount(c) {
      const s = def.mount ? def.mount(c) : undefined;
      const root = s?.p?.root, a = c.anchors?.source;
      if (root && a && a.width > 2 && c.scene.variant !== 'reduced') {
        const g = slotBox(root, c), r = g?.r;
        if (r) {
          const k = a.height / r.height;
          const o = g.o;
          const O = [r.left + (o[0] || r.width / 2), r.top + (o[1] || r.height / 2)];
          const Ca = [a.left + a.width / 2, a.top + a.height / 2], Cs = [r.left + r.width / 2, r.top + r.height / 2];
          s.flip = { k, dx: Ca[0] - O[0] - k * (Cs[0] - O[0]), dy: Ca[1] - O[1] - k * (Cs[1] - O[1]), until: Number(c.params[key] ?? 300) };
        }
      }
      return s;
    },
    frame(s, t, p, c) {
      def.frame(s, t, p, c);
      const f = s?.flip;
      if (!f || t >= f.until) return;
      const e = easeInOut(t / f.until), k = c.scene.side === 'rival' ? -1 : 1;
      s.p.root.style.transform = `translate3d(${(f.dx * (1 - e)).toFixed(1)}px,${(f.dy * (1 - e)).toFixed(1)}px,0) rotate(${(-2 * e * k).toFixed(2)}deg) scale(${(f.k + (1 - f.k) * e).toFixed(4)})`;
      s.p.root.style.opacity = '1';
    },
    unmount: def.unmount,
  };
}
/** An effect that expects a part of the scene the board ending took away never stops the scene. */
const FX_FAIL = new Set();
function guarded(name, def) {
  const safe = (f) => (f ? (...a) => { try { return f(...a); } catch (err) { if (!FX_FAIL.has(name)) { FX_FAIL.add(name); console.warn(`effect ${name}:`, err); } return undefined; } } : undefined);
  return { mount: safe(def.mount), frame: safe(def.frame) ?? (() => {}), unmount: safe(def.unmount) };
}
/** Register the Broadcast's effects and scenes as the Broadcast does, with the deal anchored and the board ending. */
export function install(K, engine, scenes = K.SCENES) {
  K.registerAll((name, def) => runtime.registerFx(name, guarded(name, name === 'deal' ? anchored(def, 'land') : name === 'popup' ? anchored(def, 'fly') : def)));
  for (const d of [...K.grammar(), ...K.defaults(engine.FIGHTERS), ...scenes]) {
    const kind = d.kind ?? 'attack';
    if (kind === 'attack') runtime.defineCutscene({ ...d, full: d.full ? holdNumber(d.full) : d.full, ...(d.short ? { short: boardShort(d.short) } : {}) });
    // the result's reduced still holds 1.3 s, so both leaders' poses stand under the title before the panel
    else if (kind === 'result') runtime.defineCutscene({ ...d, full: boardResult(), still: { at: 900 }, hold: 1300 });
    else runtime.defineCutscene(d);
  }
}
/** The shortest still with a number: it shows the frame after its contact, is read 640 ms and goes 80 ms before the end. */
const STILL_MIN = 760;
/** The scene a shot plays: the registry's, with the finish's hit-stop or the second use's framing when the plan says. */
export function sceneOf(shot) {
  const s = shot.scene, open = shot.box?.open;
  // a brief still (a repeat, or an attack under Auto, in reduced motion) holds no longer than its short scene runs,
  // and never less than its number needs (read 640 ms, gone 80 ms before the still ends, Stage.play)
  if (s.variant === 'reduced' && shot.brief) {
    const def = runtime.findCutscene(s), short = runtime.compileScene({ ...s, variant: 'short' }).duration;
    return runtime.compileScene(s, { ...def, hold: Math.max(STILL_MIN, Math.min(def.hold ?? 1100, short)) });
  }
  if (s.variant === 'off' || s.variant === 'reduced' || ((s.kind !== 'attack' || (!shot.finish && !shot.framing)) && !open)) return runtime.compileScene(s);
  const def = runtime.findCutscene(s);
  const shortOf = def.short ?? runtime.findCutscene({ kind: s.kind })?.short ?? def.full;
  const timed = s.kind === 'attack' && (shot.finish || shot.framing);
  const edit = (b) => banded(timed ? (shot.finish ? finishStop(b) : altFraming(b, s.side)) : b, open);
  return runtime.compileScene(s, { ...def, full: edit(def.full), short: edit(shortOf) });
}

// kevinliu.studio phone memory: a touch screen or a small-memory device keeps one card's world besides the one on screen; the others give
// their WebGL context back (scripts/phone-memory.mjs)
const LEAN_GROUNDS = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (typeof navigator !== 'undefined' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
export class Stage extends runtime.Stage {
  /** Where the scene opens from and lands on, viewport px (the Director sets them from the layout before each play). */
  anchors = { source: null, target: null };
  grounds = new Map();
  /** The band the scene plays in (`box`), or null for the whole window. */
  band = null;
  constructor(host, o) {
    super(host, o);
    this.shaderOn = Boolean(o?.shaderGrounds);
    // the picture layers (the world, the plate, the footage, the target, the flash) in one box under the bars, so a
    // band can clip them to its opening while the bars let the board through
    const pics = document.createElement('div');
    pics.className = 'sd-pics';
    this.root.insertBefore(pics, this.els.ground);
    pics.append(this.els.ground, this.slots.ground, this.els.plate, this.els.feature, this.els.target, this.slots.below, this.els.flash);
    this.pics = pics;
    this.host = host;
  }
  /** Play the next scenes in a band of the window ({ top, height, open }, viewport px; `open` is the band's share of the
   *  host's height), or (null) over the whole window. */
  box(b) {
    const h = this.host, was = this.band;
    if (!b && !was) return;
    if (b && was && b.top === was.top && b.height === was.height && b.open === was.open) return;
    this.band = b ?? null;
    if (b) {
      // placed by a transform and sized by its height: its start never moves, so the page never shifts
      Object.assign(h.style, { transform: `translate3d(0,${b.top}px,0)`, height: `${b.height}px`, bottom: 'auto' });
      h.style.setProperty('--ap', `${(((1 - bandAperture(b.open)(AP)) * 50.5)).toFixed(3)}%`);
      h.dataset.band = '';
    } else {
      for (const k of ['transform', 'height', 'bottom', '--ap']) h.style.removeProperty(k);
      delete h.dataset.band;
      this.pics.style.clipPath = ''; this.pics.style.backgroundColor = ''; this.floor = '';
    }
    this.sizeCanvas();
  }
  render(f, sought) {
    super.render(f, sought);
    // in a band the pictures end at the bars' edges: what lies past them is the board, dimmed
    if (this.band && f) {
      const v = (1 - (f.layers.bars.aperture ?? 1)) * 50.5;
      const c = v > 0.05 ? `inset(${v.toFixed(2)}% 0)` : '';
      if (this.pics.style.clipPath !== c) this.pics.style.clipPath = c;
      // the band's own floor, as dark as its world is present: a camera whip never shows the board through the band
      const fl = c ? `rgba(11,11,13,${Math.round((f.layers.ground.opacity ?? 0) * 100) / 100})` : '';
      if (this.floor !== fl) { this.floor = fl; this.pics.style.backgroundColor = fl; }
    }
    if (f) {
      if ((f.layers.callout.opacity ?? 0) > 0.01) this.keep(this.els.callout, [this.calloutText], this.calloutText);
      if ((f.layers.damage.opacity ?? 0) > 0.01 && !('board' in this.root.dataset)) this.keep(this.els.damage, [this.number, this.receipt]);
    }
  }
  /** Keep a layer's words inside the window: the call-out and the number with its receipt. A scene's camera whip, its
   *  1.25 entry punch about a far origin, or a long receipt on a phone can carry them past an edge; the layer then
   *  takes the smallest extra move (CSS `translate`, and a `scale` only when its words are wider than the window) that
   *  brings their box back inside, measured from where the scene alone would put them, so it lets go as soon as the
   *  scene brings them back. `glyphs` adds the text's own line boxes to the elements'. */
  keep(layer, parts, glyphs = null) {
    const k = (layer.keep ??= { tx: 0, ty: 0, s: 1, C: null });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (r) => { if (r.width < 1 || r.height < 1) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); };
    for (const e of parts) if (e?.textContent.trim()) add(e.getBoundingClientRect());
    if (glyphs?.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(glyphs); for (const r of rg.getClientRects()) add(r); }
    if (!(x1 > x0)) return;
    // the layer's transform origin on screen, before its own transforms (read once a scene)
    if (!k.C) {
      const p = (layer.offsetParent ?? this.root).getBoundingClientRect(), o = getComputedStyle(layer).transformOrigin.split(' ').map(parseFloat);
      k.C = [p.left + layer.offsetLeft + (o[0] || 0), p.top + layer.offsetTop + (o[1] || 0)];
    }
    const [cx, cy] = k.C, W = innerWidth, H = innerHeight, m = 1;
    // where the scene alone puts the words: undo this layer's last correction
    const ux0 = cx + (x0 - cx - k.tx) / k.s, ux1 = cx + (x1 - cx - k.tx) / k.s, uy0 = cy + (y0 - cy - k.ty) / k.s, uy1 = cy + (y1 - cy - k.ty) / k.s;
    let s = Math.min(1, (W - 2 * m) / (ux1 - ux0), (H - 2 * m) / (uy1 - uy0));
    if (s > 0.995) s = 1;
    const shift = (a0, a1, c, L) => { const b0 = c + s * (a0 - c), b1 = c + s * (a1 - c); return b1 - b0 > L - 2 * m ? L / 2 - (b0 + b1) / 2 : b0 < m ? m - b0 : b1 > L - m ? L - m - b1 : 0; };
    const tx = shift(ux0, ux1, cx, W), ty = shift(uy0, uy1, cy, H);
    if (Math.abs(tx - k.tx) < 0.05 && Math.abs(ty - k.ty) < 0.05 && s === k.s) return;
    k.tx = tx; k.ty = ty; k.s = s;
    layer.style.translate = tx || ty ? `${tx.toFixed(1)}px ${ty.toFixed(1)}px` : '';
    layer.style.scale = s < 1 ? s.toFixed(4) : '';
  }
  /** A new scene starts with its layers where it puts them. */
  unkeep() { for (const l of [this.els.callout, this.els.damage]) { l.keep = null; l.style.translate = ''; l.style.scale = ''; } }
  fxContext(...a) { return { ...super.fxContext(...a), anchors: this.anchors, band: this.band }; }
  /** Each picture's load, once: a scene's media is fetched and decoded the first time any shot asks (or `warm` asks
   *  ahead of it) and never waited for again, so a repeat or a prepared shot starts without a wait. */
  loadOnce(refs, timeout = 600) {
    this.loads ??= new Map();
    const list = refs.filter(Boolean).map((r) => {
      let p = this.loads.get(r.src);
      // the kit's own cap would run on the scene clock: give it none and cap the wait in real time here
      if (!p) { p = Promise.race([runtime.preload([r], 1e9), new Promise((done) => (window.battlePace?.realTimeout ?? setTimeout)(done, 8000))]).then(() => { p.done = true; }); this.loads.set(r.src, p); }
      return p;
    });
    if (list.every((p) => p.done)) return null;
    // a wait for loading is real time, whatever the battle's speed (shared/pace.js)
    const wait = window.battlePace?.realTimeout ?? setTimeout;
    return Promise.race([Promise.all(list), new Promise((r) => wait(r, timeout))]);
  }
  /** What a scene shows: its plate, its subject's cutout, its target, its footage (or still) and its world. */
  mediaOf(scene, still, stillFeature, shaderGrounds) {
    const m = this.media;
    const subject = scene.kind === 'ko' ? null : scene.card;
    const targetCard = scene.kind === 'ko' ? scene.card : scene.target;
    const ground = m.ground(scene.card, shaderGrounds && !still);
    let feature = null;
    if (scene.move) {
      if (!still || stillFeature === 'clip') feature = m.feature(scene.card, scene.move.index);
      else if (stillFeature !== 'none') feature = m.still(scene.card, scene.move.index);
    }
    return {
      subject, targetCard, ground, feature, plate: m.plate(scene.card), cutout: subject ? m.cutout(subject) : null,
      target: targetCard ? m.cutout(targetCard) ?? m.portrait(targetCard) : null,
      groundImage: ground && ground.kind !== 'shader' ? ground : ground?.kind === 'shader' ? ground.fallback : null,
    };
  }
  /** Fetch a coming shot's media into the cache now, while the current one plays (the Director asks for the next shot
   *  of its batch): the bytes only, never a decode, so the scene on screen keeps its frames; `prepare` decodes them
   *  when the shot is next. */
  warm(scene) {
    if (!scene || scene.variant === 'off') return;
    for (const r of this.refsOf(scene)) this.fetchOnce(r.src);
  }
  refsOf(scene) {
    const still = scene.variant === 'reduced', x = this.mediaOf(scene, still, undefined, this.shaderOn && scene.variant === 'full');
    return [x.plate, x.cutout, x.target, x.feature, x.groundImage].filter(Boolean);
  }
  fetchOnce(src) {
    this.fetched ??= new Map();
    let p = this.fetched.get(src);
    if (!p) { p = fetch(src, { priority: 'low' }).then((r) => r.blob()).then(() => true).catch(() => null); this.fetched.set(src, p); }
    return p;
  }
  /** Fetch the media of shots that may come in a later batch (the moves the cards in play may use next), one file at a
   *  time behind whatever is loading, so the next turn's first scene finds its footage in the cache. */
  ahead(scenes) {
    this.fetched ??= new Map();
    const srcs = [...new Set(scenes.flatMap((sc) => this.refsOf(sc).map((r) => r.src)))].filter((src) => !this.fetched.has(src) && !this.loads?.has(src));
    this.aheadQ = (this.aheadQ ?? Promise.resolve()).then(async () => { for (const src of srcs) await this.fetchOnce(src); });
  }
  /** The runtime's prepare (stage.ts), with each picture loaded once (loadOnce): what a shot shows, set before it plays. */
  async prepare(scene, compiled) {
    const m = this.media;
    const x = this.mediaOf(scene, compiled.still, compiled.stillFeature, this.shaderGrounds);
    const { subject, targetCard, ground, feature, plate, cutout, target, groundImage } = x;
    this.palette = m.palette(scene.card);
    const wait = this.loadOnce([plate, cutout, target, feature, groundImage]);
    if (wait) await wait;
    this.refs = { ground: groundImage, plate, feature, cutout, target };
    const fit = feature ? (typeof this.fitOption === 'function' ? this.fitOption(feature, [this.W, this.H]) : this.fitOption ?? 'cover') : 'cover';
    this.rest = { feature: { ...(feature?.view ?? {}), cover: fit === 'contain' ? 0 : 1 } };
    this.setImage('plate', plate);
    this.setImage('cutout', cutout, subject ? m.title(subject) : '');
    this.setImage('target', target, targetCard ? m.title(targetCard) : '');
    this.setGround(ground);
    for (const k of ['target', 'cutout']) {
      const r = k === 'target' ? target : cutout;
      this.sil[k].style.setProperty('--sd-sil-src', r?.kind === 'image' ? `url("${r.src}")` : 'none');
      this.sil[k].hidden = !(r?.kind === 'image');
    }
    if (feature?.kind === 'video') {
      this.img.feature.hidden = true;
      this.video.hidden = false;
      if (this.video.getAttribute('src') !== feature.src) this.video.src = feature.src;
      this.video.poster = feature.poster ?? '';
    } else {
      this.video.hidden = true;
      this.video.pause();
      this.setImage('feature', feature);
    }
    this.lastSeek = -1;
    this.masks.textContent = '';
    this.maskRects = (feature?.mask ?? []).map((r) => {
      const e = document.createElement('div');
      e.className = 'sd-mask';
      e.style.cssText = `left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%;--sd-mask:${r.fill ?? this.palette.ink}`;
      if (r.style) e.dataset.style = r.style;
      this.masks.append(e);
      return { el: e, r };
    });
    this.root.style.setProperty('--sd-accent', runtime.legibleAccent(this.palette.accent));
    this.calloutText.textContent = scene.title;
    this.receiptText = runtime.receiptOf(scene);
    this.receipt.textContent = this.receiptText.full;
    this.number.textContent = scene.label;
    this.number.style.minWidth = /^\d+$/.test(scene.label) ? `${scene.label.length}ch` : '';
    this.els.credit.textContent = m.credit(scene.card) ?? '';
    this.fxMedia = { feature, plate, cutout, target, ground: groundImage, palette: this.palette, plateFile: (name) => m.plateFile(scene.card, name) };
  }
  /** A card's live ground links its program synchronously (about 350 ms): keep each one once linked, hidden while
   *  another card's world shows, instead of disposing it whenever the next scene's card differs. */
  /** A scene with a picture for its world puts the live ground away too: the runtime draws its current shader ground
   *  every frame, hidden or not, and each draw reads the canvas's size, which lays the page out again every frame of
   *  a short scene. The ground's canvas fills the stage, so its size is the stage's own (read once a resize). */
  setGround(ground) {
    const shader = ground?.kind === 'shader';
    if ((shader && this.shaderSource !== ground.source) || (!shader && this.shader)) {
      if (this.shader) { this.shader.canvas.hidden = true; this.grounds.set(this.shaderSource, this.shader); }
      if (LEAN_GROUNDS) for (const [src, sh] of [...this.grounds]) if (src !== this.shaderSource && !(shader && src === ground.source)) { sh.dispose(); this.grounds.delete(src); }
      const kept = shader ? this.grounds.get(ground.source) ?? null : null;
      this.shader = kept;
      this.shaderSource = kept ? ground.source : '';
    }
    const r = super.setGround(ground);
    const cv = this.shader?.canvas;
    if (cv && !cv.sized) {
      cv.sized = true;
      Object.defineProperty(cv, 'clientWidth', { configurable: true, get: () => this.W });
      Object.defineProperty(cv, 'clientHeight', { configurable: true, get: () => this.H });
    }
    return r;
  }
  /** At the board moment the scene marks itself, so what the board now carries (the HP, the number) stands down. */
  play(scene, compiled, hooks = {}) {
    this.unkeep();
    // a still's number (reduced motion) shows the frame after its contact lands, never before it (or at 150 ms if the
    // still has no contact), as a board's still number does (shared/fx.js numeral)
    const still = (compiled?.variant ?? scene.variant) === 'reduced', num = this.number;
    let shown = !still;
    if (num) num.style.visibility = still ? 'hidden' : '';
    // and it goes 80 ms before the still does (once read 640 ms), so the next still's contact never finds it standing
    const t0 = performance.now(), dur = compiled?.duration ?? 0, token = (this.plays = (this.plays ?? 0) + 1);
    let at = 0;
    const reveal = () => { if (shown) return; shown = true; afterFrame(performance.now(), () => { if (num && this.plays === token) { num.style.visibility = ''; at = performance.now(); } }); };
    if (still) {
      setTimeout(reveal, 150);
      if (dur > 0) setTimeout(() => { if (num && at && performance.now() - at >= 640 && this.plays === token) num.style.visibility = 'hidden'; }, Math.max(0, t0 + dur - 80 - performance.now()));
    }
    const played = super.play(scene, compiled, { ...hooks, onCue: (name, t) => { if (name === 'board') this.root.dataset.board = ''; hooks.onCue?.(name, t); if (name === 'impact') reveal(); } });
    // the result's reduced still is staged from the board too: it has no cues, so its board moment is its first frame
    if (scene.kind === 'result' && (compiled?.variant ?? scene.variant) === 'reduced') { this.root.dataset.board = ''; hooks.onCue?.('board', 0); }
    return played;
  }
  finish() { super.finish(); delete this.root.dataset.board; this.unkeep(); }
}

// ============================================================ 1. the Director with the seam's hooks
/** The seam's verbs for a shot: what the board does before the scene and at its impact. */
export function verbsOf(shot) {
  const s = shot.scene;
  if (s.kind === 'attack') { const o = s.outcome; return { pre: 'command', land: o.has('miss') ? 'miss' : o.has('support') ? 'support' : o.has('crit') ? 'crit' : 'hit' }; }
  if (s.kind === 'switch') { const v = shot.post[0]?.reason === 'lead' ? 'entrance' : 'switch'; return { pre: v, land: v }; }
  if (s.kind === 'result') { const v = s.title === 'Draw' ? 'draw' : s.side === 'player' ? 'victory' : 'defeat'; return { pre: v, land: v }; }
  return { pre: s.kind, land: s.kind };
}
const ANCHORED = new Set(['attack', 'switch', 'trait', 'status', 'item', 'guard']);

export class Director {
  /** o: { cardOf, titleOf, reduced(), session (a Set kept across battles), seen (this battle's minor beats), plan(shot,
   *  auto), shaderGrounds, hold(shot), hooks: { event(e, shot), box(shot), before(shot), anchors(shot), shot(shot,
   *  phase), after(shot), flush(shot) } }. A phase is plan, start, board, impact or end. */
  constructor(stage, o) { this.stage = stage; this.o = o; this.gen = 0; }
  /** Abandon what is playing: no further shots, no further events delivered. */
  stop() { this.gen++; this.stage.stop(); this.stage.box(null); }
  async play(events, o = {}) {
    const my = this.gen, h = this.o.hooks;
    const shots = runtime.scenesFrom(events, { mode: 'auto', auto: Boolean(o.auto), reduced: this.o.reduced(), cardOf: this.o.cardOf, titleOf: this.o.titleOf, seen: this.o.seen(), session: o.replay ? undefined : this.o.session });
    // the whole batch is planned first, in order, so a blow knows whether a knockout scene follows it
    for (const shot of shots) this.o.plan?.(shot, Boolean(o.auto));
    shots.forEach((shot, i) => {
      shot.kos = new Map();
      for (const k of shots.slice(i + 1)) if (k.scene?.kind === 'ko') { const f = k.post[0]?.fighter; if (f && !shot.kos.has(f)) shot.kos.set(f, k); }
      /** Whether a knockout scene will tell that this card is out (else the board's number says Out). */
      shot.told = (uid) => { const k = shot.kos.get(uid); return Boolean(k && k.scene.variant !== 'off'); };
    });
    for (const [i, shot] of shots.entries()) {
      if (my !== this.gen) return;
      for (const e of shot.pre) h.event(e, shot);
      if (!shot.scene) { h.flush(shot); continue; }
      // the next shot with a scene loads its media while this one plays, and is compiled once this one has landed
      const next = shots.slice(i + 1).find((x) => x.scene && x.scene.variant !== 'off');
      this.stage.warm?.(next?.scene);
      this.upcoming = next ?? null;
      await this.present(shot, my);
    }
  }
  /** Compile a coming shot ahead (`sceneOf`, for the band its layout would give it now), in an idle moment. */
  compileAhead(next) {
    if (!next?.scene || next.ahead !== undefined && next.ahead !== null) return;
    const run = () => {
      if (next.ahead) return;
      const s = next.scene, box = s.variant === 'full' || s.variant === 'short' ? this.o.hooks.box?.(next) ?? null : null;
      next.ahead = { open: box?.open ?? null, compiled: sceneOf({ ...next, box }) };
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 800 }); else setTimeout(run, 0);
  }
  /** One shot: the board's pre-roll and the scene's media together, the scene from the anchors, its impact (the post
   *  events land there and never earlier), the board moment, and the board's settle. */
  async present(shot, my = this.gen) {
    const s = shot.scene, h = this.o.hooks;
    // the layout may stage the scene in a band over its board (the Mat); else it plays over the whole window
    shot.box = s.variant === 'full' || s.variant === 'short' ? h.box?.(shot) ?? null : null;
    this.stage.box(shot.box);
    // compiled ahead while the shot before it settled (`ahead`), when the band it plays in is the one it was compiled for
    const compiled = shot.ahead && shot.ahead.open === (shot.box?.open ?? null) ? shot.ahead.compiled : sceneOf(shot);
    shot.ahead = null;
    shot.compiled = compiled;
    shot.variant = compiled.variant;
    // the board carries every short attack (its board ending) and every cut (a repeat played on the board alone)
    shot.board = s.kind === 'attack' && (compiled.variant === 'short' || Boolean(shot.cut));
    shot.stops = shot.finish && s.kind === 'attack' && !this.o.reduced() && compiled.variant !== 'reduced' ? FINISH_STOP : 0;
    shot.verbs = verbsOf(shot);
    this.stage.shaderGrounds = Boolean(this.o.shaderGrounds) && compiled.variant === 'full';
    h.shot?.(shot, 'plan');
    // the pre-roll and the media together; each one's time is kept on the shot (what a slow start waited for)
    const t0 = performance.now(), took = (k) => () => { shot[k] = Math.round(performance.now() - t0); };
    // (once its pictures are set, the page dresses the scene and readies its cut-in while the pre-roll runs: phase
    // 'prepared', so the scene's first frame does only the scene's own work)
    await Promise.all([Promise.resolve(h.before?.(shot)).then(took('preMs')), compiled.variant !== 'off' ? this.stage.prepare(s, compiled).then(took('prepMs')).then(() => { if (my === this.gen) h.shot?.(shot, 'prepared'); }) : null]);
    await this.o.hold?.(shot);
    if (my !== this.gen) return;
    this.stage.anchors = compiled.variant !== 'off' && ANCHORED.has(s.kind) ? (h.anchors?.(shot) ?? { source: null, target: null }) : { source: null, target: null };
    h.shot?.(shot, 'start');
    let landed = false;
    const land = () => {
      if (landed || my !== this.gen) return;
      landed = true;
      for (const e of shot.post) h.event(e, shot);
      h.shot?.(shot, 'impact');
      // the deciding blow's hit-stop: the scene holds on its own stop; the board's reaction holds on its first frame
      if (shot.stops) h.stop?.(shot, shot.stops);
      // the next scene compiles in the first idle time after this contact, never in a scene's opening frames
      this.compileAhead(this.upcoming);
    };
    const t1 = performance.now();
    await this.stage.play(s, compiled, { onCue: (name) => { if (name === 'impact') land(); else if (name === 'board' && my === this.gen) h.shot?.(shot, 'board'); } });
    land();
    if (shot.box) this.stage.box(null);
    if (my !== this.gen) return;
    const t2 = performance.now();
    shot.playMs = Math.round(t2 - t1);
    await h.after?.(shot);
    shot.afterMs = Math.round(performance.now() - t2);
    h.shot?.(shot, 'end');
  }
}
