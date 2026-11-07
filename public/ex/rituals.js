// The rituals, the rituals lane's: the print's springs and every sequence, all through Motion's one loop,
// on transform, opacity and shader uniforms. gallery.js owns the state and the wiring and calls these:
//   print     printOf, wake, aim, rest: a tiltable print's springs (tilt, rise, flip, push, lamp)
//   lift      open, step, close: FLIP from the pocket to inspection while the card's world prints out
//   fly       a copy flies to its well as a card joins your team, cropping into its T0 face as it lands
//   deal      the rival's three backs deal from the deck and turn; then, at idle, the six worlds warm for the battle
//   entry     the six dock cards flare, both leads' worlds pour to an 8 degree seam and each team's
//             subjects stand on its lead's world; then done() navigates under the View Transition
//   pack      the tear follows the hand along the crimp; the flaps open, the backs rise, each card turns
//             and prints, cheapest first; the costliest floods the dimmed room with its world, then all
//             fly to the wells
// One class of moment runs every ritual: a sequence is a pure function of its clock (Motion.timeline),
// so 10% speed, a skip to the end and a reverse are frames of it. Esc, a click outside or a second press
// ends any sequence; during a pack's reveal any input ends it, and Esc before the seal breaks reseals it.
// Reduced motion crossfades to the end state. Rituals(G) is called once by gallery.js with its shared
// state G; everything here reads G at call time.
(function () {
  'use strict';
  globalThis.Rituals = function (G) {
    const { Ground, Motion: M, ART } = globalThis;
    const RATIO = 88 / 63;
    const root = document.documentElement;
    const { $, $$, RM, say, and, optsOf, rectOf, titleOf, cost } = G;
    const { clamp, lerp, ease } = M;
    const win = M.win;
    const SND = () => globalThis.Sound || null;
    const snd = (id, o) => SND()?.play(id, o) ?? null;
    const pan = (el) => SND()?.panOf(el) ?? 0;
    // ease.crit stops 1% short of its end (0.990 at 1), so a card it carries stood 1.8 degrees turned and a pixel off its
    // slot; this is the same curve scaled to land exactly, so a card at its end stands flat, whole and unresampled
    const CRIT1 = ease.crit(1);
    const exact = (x) => (x >= 1 ? 1 : ease.crit(x) / CRIT1);
    const LAMP = 0.8; // the hand's lamp on a turned print's ground (write())
    const stage = $('#stage');
    // the room's dimmer: under the worlds, over the gallery
    const dim = document.createElement('div');
    dim.className = 'dimmer'; // the machine view's text owns .dim
    dim.setAttribute('aria-hidden', 'true');
    $('#world').before(dim);
    const live = () => !!(Ground && Ground.available);
    const LEAN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4;
    // a pour only while it reaches past the trim: an empty pour still copies the whole room
    function pour(key, o) {
      if (!live()) return;
      if (o.r > 0.5) Ground.pour(key, o);
      else if (Ground.pours.has(key)) Ground.unpour(key);
    }
    const unpour = (re) => { if (live()) for (const k of [...Ground.pours.keys()]) if (re.test(k)) Ground.unpour(k); };
    const own = (T) => { if (G.ritual === T) G.ritual = null; };
    // the card a well holds, in viewport px: the hold is inset by the well's border and padding
    function wellCard(well) {
      const r = rectOf(well);
      const w = parseFloat(getComputedStyle(well).getPropertyValue('--card')) || r.w - 6;
      const i = (r.w - w) / 2;
      return { x: r.x + i, y: r.y + i, w, h: w * RATIO };
    }
    const decoded = new Map();
    function decode(src) {
      if (!src || decoded.has(src)) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      decoded.set(src, img);
      img.decode().catch(() => {});
    }
    const tf = (x, y, s) => `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    // The sleeve's gloss, the one writer of every .glare. It blends with the print (card.css: overlay on
    // .glarebox), which needs its face isolated (.face.lit); an isolated face is drawn through a surface of its
    // own, which resamples the poster <img> on a 1x screen, so a face is isolated only while its gloss shows and
    // rests exactly as it first painted.
    // A card whose body a ritual is turning carries .turned, set and cleared only as the turn starts and ends, so a
    // style keyed to it restyles the card twice, where one keyed to the body's style attribute restyled the face, the
    // back, the sleeve and every picture in the card on every frame (card.css may key its 3D rules to it)
    function turn(card, body, t) {
      body.style.transform = t;
      const on = t !== '';
      if (card && card.classList.contains('turned') !== on) card.classList.toggle('turned', on);
    }
    const lit = new WeakSet();
    function gloss(g, op, x, y) {
      g.style.opacity = op.toFixed(3);
      g.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const on = op >= 0.0005;
      if (on !== lit.has(g)) {
        if (on) lit.add(g); else lit.delete(g);
        const f = g.closest('.face');
        if (f) f.classList.toggle('lit', on);
      }
    }

    // ---------- a tiltable print: a gallery card, the inspected card or a stage card ----------
    // Springs: tilt x and y (250 ms), rise (150 ms), flip (350 ms, zeta 0.9), push (a refusal), lamp.
    function printOf(el, surfId) {
      return {
        el, body: $('.body', el), art: $('.art', el), obj: !!$('.art.obj', el), band: $('.band', el), glare: $('.glare', el), surfId,
        // the subject's additive glow is .pop's sibling (plus-lighter needs the print as its backdrop), so it moves with it
        glw: $('.face > .glw', el),
        fx: $$('.fx', el), pop: !!$('.pop.art', el),
        // the rim's specular streak, moved by transform on its own layer (a custom property written per frame repaints
        // the whole card)
        spec: $$('.rim > .spec, .gl > .tw', el),
        rx: { x: 0, v: 0 }, ry: { x: 0, v: 0 }, rise: { x: 0, v: 0 }, flip: { x: 0, v: 0 }, push: { x: 0, v: 0 }, lz: { x: 0, v: 0 },
        lu: { x: 0.5, v: 0 }, lv: { x: 0.4, v: 0 },
        to: { rx: 0, ry: 0, rise: 0, flip: 0, lz: 0, lu: 0.5, lv: 0.4 }, gu: 0.5, gv: 0.4, sweep: -1, drag: null, extra: '',
        w: 0, h: 0, gen: -1,
      };
    }
    // A print's size is read once and again only after a resize, never in a motion frame that may follow a
    // write: a read there forces the whole page's style and layout.
    let sizeGen = 0;
    addEventListener('resize', () => { sizeGen++; });
    // a print's size read ahead, at idle (gallery.js), so the first frame that wakes it reads no layout
    function measure(p) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; p.gen = sizeGen; }
    // or given, by one that knows it (the lens card is the lens's size)
    function size(p, w, h) { p.w = w; p.h = h; p.gen = sizeGen; }
    const moving = new Set();
    function wake(p) { moving.add(p); M.add(tickPrints); }
    function tickPrints(dt) {
      for (const p of moving) {
        let busy = false;
        if (p.sweep >= 0) {
          // focus sweeps the lamp once across the face, 400 ms
          p.sweep = Math.min(1, p.sweep + dt / 0.4);
          p.to.lu = p.sweep; p.to.lv = 0.25 + 0.4 * p.sweep; p.to.lz = Math.sin(Math.PI * p.sweep);
          p.lu.x = p.to.lu; p.lv.x = p.to.lv; p.lz.x = p.to.lz; p.gu = p.lu.x; p.gv = p.lv.x;
          if (p.sweep >= 1) { p.sweep = -1; p.to.lz = 0; }
          busy = true;
        }
        busy = M.spring(p.rx, p.to.rx, 250, 1, dt) | busy;
        busy = M.spring(p.ry, p.to.ry, 250, 1, dt) | busy;
        busy = M.spring(p.rise, p.to.rise, 150, 1, dt) | busy;
        busy = M.spring(p.flip, p.to.flip, 350, 0.9, dt) | busy;
        busy = M.spring(p.push, 0, 420, 0.9, dt) | busy;
        busy = M.spring(p.lz, p.to.lz, 250, 1, dt) | busy;
        busy = M.spring(p.lu, p.to.lu, 250, 1, dt) | busy;
        busy = M.spring(p.lv, p.to.lv, 250, 1, dt) | busy;
        write(p);
        if (!busy && !p.drag) {
          moving.delete(p);
          const s = Ground.surfaces && Ground.surfaces.get(p.surfId);
          if (s && !p.keepActive) { s.active = false; s.dirty = true; }
        }
      }
      return moving.size > 0;
    }
    function write(p) {
      if (p.gen !== sizeGen || !p.w) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; p.gen = sizeGen; }
      const w = p.w || 1, h = p.h || 1;
      const rx = p.rx.x, ry = p.ry.x;
      const d = p.drag;
      const lift = p.rise.x + (d ? 8 : 0);
      const tx = d ? d.x : 0, ty = (d ? d.y : 0) + p.push.x;
      const flip = p.flip.x;
      const still = Math.abs(rx) + Math.abs(ry) + Math.abs(flip) + Math.abs(lift) + Math.abs(tx) + Math.abs(ty) < 0.001;
      // perspective four card widths; the tilt never passes 8 degrees (aim clamps it)
      turn(p.el, p.body, still ? '' : `perspective(${Math.round(4 * w)}px) translate3d(${tx.toFixed(2)}px, ${(ty - lift).toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${(ry + flip).toFixed(3)}deg)`);
      // parallax (EX.md 13): the type is printed on the card and never moves; the subject stands 3cqw above the print
      // and its front effects 4cqw, so each shifts by depth x sin(angle) and the subject moves more than its ground
      const sx = Math.sin((ry * Math.PI) / 180), sy = Math.sin((rx * Math.PI) / 180);
      // A standing subject also rises 3cqw off its ground by the tilt's or the lift's share, over the shade it
      // leaves on the print (art.js HEADROOM keeps its top inside the trim). It never scales, so its layer
      // keeps one raster and its edges stay crisp. A window is the scene itself and only shifts.
      if (p.art) {
        const up = p.obj ? clamp(Math.max(Math.hypot(rx, ry) / 8, p.rise.x / 4)) : 0;
        p.art.style.transform = still ? '' : `translate3d(${(0.03 * w * sx).toFixed(2)}px, ${(-0.03 * w * (sy + up)).toFixed(2)}px, 0)`;
        if (p.glw) p.glw.style.transform = p.art.style.transform;
        // a pop-out subject carries its own cast (card.css), so the lift never re-filters its picture every frame
        if (p.obj && !p.pop) p.art.style.filter = still || up < 0.01 ? '' : `drop-shadow(0 ${(0.024 * w * up).toFixed(2)}px ${(0.03 * w * up).toFixed(2)}px rgb(0 0 0 / ${(0.3 * up).toFixed(3)}))`;
      }
      for (const n of p.fx || []) n.style.transform = still ? '' : `translate3d(${(0.04 * w * sx).toFixed(2)}px, ${(-0.04 * w * sy).toFixed(2)}px, 0)`;
      if (p.glare) {
        // the gloss at 0.7: card.css draws it as a narrow streak in the card's own energy colour under overlay, which at
        // 0.35 barely read (face ex.5: best-spot panel S +3.0% at 0.35, +7.6% at 0.7, the window's within 0.3%)
        gloss(p.glare, 0.7 * clamp(p.lz.x), (p.gu - 0.5) * w, (p.gv - 0.5) * h);
      }
      // the rim's polish slides 0.3W either way with the tilt (-1 to 1 across and down); cleared at rest
      // and the cost 4 glitter's colour under its fixed flakes slides the same way, so other flakes catch the light (face ex.5)
      for (const n of p.spec || []) n.style.transform = still ? '' : `translate3d(${(0.3 * w * clamp(ry / 8, -1, 1)).toFixed(2)}px, ${(0.3 * w * clamp(rx / 8, -1, 1)).toFixed(2)}px, 0)`;
      const s = Ground.surfaces && Ground.surfaces.get(p.surfId);
      if (s) {
        s.tilt = [clamp(ry / 8, -1.2, 1.2), clamp(rx / 8, -1.2, 1.2)];
        // the hand's lamp on the ground at 0.8: at full strength it washed the window's colour out as the card turned
        // (Loop's window lost 3.5% of its saturation, the collector's panels up to 26%); at 0.8 it is 2.5%
        s.light = [p.lu.x, p.lv.x, LAMP * clamp(p.lz.x)];
        s.active = true; s.dirty = true;
        Ground.driver && Ground.driver();
      }
    }
    function aim(p, u, v) {
      // at most 8 degrees, toward the hand
      let ry = (u - 0.5) * 2 * 8, rx = -(v - 0.5) * 2 * 8;
      const m = Math.hypot(rx, ry);
      if (m > 8) { rx *= 8 / m; ry *= 8 / m; }
      p.to.rx = rx; p.to.ry = ry;
      p.to.lu = u; p.to.lv = v; p.to.lz = 1;
      p.gu = u; p.gv = v;
    }
    function rest(p) { p.to.rx = 0; p.to.ry = 0; p.to.rise = 0; p.to.lz = 0; p.to.lu = 0.5; p.to.lv = 0.4; wake(p); }

    // A card copy that lands in a well grows into the well's T0 face: its type fades as the container query drops it
    // under 120 px. The T0 face keeps the window, its pop-out, the rim and the logo at the same fractions, so the copy
    // never crops and the swap is still.
    function cropOf() { return () => {}; }

    // ---------- team: a copy flies from where the card is to its well (420 ms); the sleeve fades in as it lands ----------
    function fly(id, from, well, done) {
      const { S, cards } = G;
      const el = G.mini(id);
      el.classList.add('flyer');
      el.style.setProperty('--card', from.w + 'px');
      el.style.width = from.w + 'px';
      stage.append(el);
      const band = $('.band', el);
      const crop = cropOf(el);
      const c = cards[id];
      c.el.classList.remove('mine');
      const hold = $('.hold', well);
      const to = wellCard(well);
      hold.style.opacity = '0';
      const T = M.timeline(420, (t) => {
        const k = ease.crit(t / 420);
        const x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k) - Math.sin(Math.PI * k) * 40;
        el.style.transform = tf(x, y, lerp(1, to.w / from.w, k));
        crop(ease.io(win(t, 80, 380)));
        if (band) band.style.opacity = String(1 - win(t, 0, 200));
      }, () => {
        el.remove();
        hold.style.opacity = '';
        c.el.classList.toggle('mine', S.you.includes(id));
        if (done) done();
      });
      return T;
    }

    // ---------- the rival: three backs deal from the deck, then turn left to right (1.2 s) ----------
    function deal() {
      const { S, cards, wells } = G;
      const holds = wells.rival.map((w) => $('.hold', w));
      const minis = holds.map((h) => $('.card:not(.premini)', h));
      // the wells were just refilled: hide the new backs this frame and measure on the next, once the
      // browser has laid them out, so the deal never forces a layout of its own
      minis.forEach((m) => { if (m) m.style.opacity = '0'; });
      let deck = null, to = null;
      S.rival.forEach((id) => cards[id].el.classList.remove('theirs'));
      const T = M.timeline(1200, (t) => {
        if (!deck) {
          if (t === 0) return;
          deck = rectOf($('#deck'));
          to = wells.rival.map(wellCard);
          minis.forEach((m) => { if (m) m.style.opacity = ''; });
        }
        minis.forEach((m, j) => {
          if (!m) return;
          const k = ease.crit(win(t, j * 80, j * 80 + 420));
          const x = lerp(deck.x - to[j].x, 0, k), y = lerp(deck.y - to[j].y, 0, k) - Math.sin(Math.PI * k) * 60;
          const turned = ease.crit(win(t, 600 + j * 100, 600 + j * 100 + 300));
          m.style.transformOrigin = '0 0';
          m.style.transform = t >= 1200 ? '' : tf(x, y, lerp(deck.w / to[j].w, 1, k));
          turn(m, $('.body', m), t >= 1200 ? '' : `perspective(${Math.round(4 * to[j].w)}px) rotateY(${(180 * (1 - turned)).toFixed(2)}deg)`);
          m.style.zIndex = String(5 - j);
          // their ink rims each card as it turns face up, not while it is a back in flight
          const sl = $('.sleeve', m);
          if (sl) sl.style.opacity = t >= 1200 ? '' : turned.toFixed(3);
        });
      }, () => { minis.forEach((m) => { if (m) m.style.opacity = ''; }); S.rival.forEach((id) => cards[id].el.classList.add('theirs')); own(T); idle(warm); });
      { const sh = SND()?.schedule(SND().dealCues()); const fin = T.finish; T.finish = () => { sh?.cancel(40); fin.call(T); }; } T.kind = 'deal'; // a Play pressed while it lands waits for it (gallery.js play)
      G.ritual = T;
    }

    // ---------- the battle entry (700 ms), then done() navigates under the cross-document View Transition ----------
    // The six dock cards flare in turn, so the eye follows the names that carry them into the arena; both
    // leads' worlds print out of their wells and meet on the 8 degree seam; each team's three subjects lift
    // out of its wells and stand on its lead's world over a contact shade.
    // Once both teams exist: the battle's acceptance is read and the cast is cut at idle; the grounds draw
    // both leads' split worlds once as soon as every program has linked.
    // None of it runs inside another ritual's frames (the pack that completes the team, the deal): it waits
    // for the deal to end, or for idle after the ritual running when it is asked.
    let warmed = '', primed = '', later = false;
    function warm() {
      const { S } = G;
      const ids = [...S.you, ...S.rival];
      if (ids.length < 6) return true;
      if (G.ritual) {
        if (!later) { later = true; idle(() => { later = false; warm(); }); }
        return false;
      }
      const key = ids.join();
      if (primed !== key) {
        primed = key;
        probe();
        idle(function prep() { if (G.ritual) idle(prep); else prepEntry(); });
      }
      if (warmed === key) return true;
      if (!live() || (Ground.prewarm && !Ground.prewarm(ids))) return false; // still linking: try again
      if (Ground.driver) Ground.driver();
      warmed = key;
      return true;
    }
    // At idle after boot: the world canvas and the shared canvas take the viewport's size once, so no
    // ritual's first frame allocates them; teams restored from the address warm their battle too.
    {
      let tries = 0;
      let sized = false;
      const boot = () => {
        if (live() && !sized && Ground.prewarm) { sized = Ground.prewarm([]); if (Ground.driver) Ground.driver(); if (sized) idle(warmLens); } // the next frame clears its trace
        if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);
      };
      setTimeout(boot, 400);
    }
    $('#play').addEventListener('pointerenter', warm);
    $('#play').addEventListener('focus', warm);
    // The cross-document View Transition runs only when the battle page accepts it. Whether it does is
    // read once from the battle's own HTML and styles (already fetched by the prerender) as the teams form;
    // until integration adds its @view-transition the swap skips the transition, so the battle never holds
    // a skipped transition's rejected promise, and every promise this page holds is caught.
    let accepts = null;
    function probe() {
      if (accepts !== null || typeof fetch !== 'function') return;
      accepts = undefined;
      const url = new URL($('meta[name="battle"]').content, document.baseURI);
      const VT = /@view-transition\s*\{[^}]*navigation\s*:\s*auto/;
      const text = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
      text(url).then(async (html) => {
        if (VT.test(html)) return true;
        for (const m of html.matchAll(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi)) {
          const href = (m[0].match(/href=["']?([^"' >]+)/i) || [])[1];
          if (href && VT.test(await text(new URL(href, new URL((html.match(/<base\b[^>]*href=["']?([^"' >]+)/i) || [])[1] || '', url))))) return true;
        }
        return false;
      }).then((v) => { accepts = v; }, () => { accepts = null; });
    }
    const quiet = (e) => {
      const vt = e.viewTransition;
      if (!vt) return;
      for (const k of ['ready', 'finished', 'updateCallbackDone']) if (vt[k]) vt[k].catch(() => {});
      if (e.type === 'pageswap' && accepts === false) vt.skipTransition();
    };
    addEventListener('pageswap', quiet);
    addEventListener('pagereveal', quiet);
    addEventListener('pageshow', () => {
      unpour(/^duel-/);
      $$('.duels, .subject, .shade, .scrim', stage).forEach((n) => n.remove());
      cast = null;
      $$('.dock .flare').forEach((n) => n.remove());
    });
    // where an art element sits in its card, as fractions of the card's width and height
    function artBox(id) {
      const el = G.cards[id].el, a = $('.art', el), f = $('.face', el);
      const r = a.getBoundingClientRect(), q = f.getBoundingClientRect();
      return { a, x: (r.left - q.left) / q.width, y: (r.top - q.top) / q.height, w: r.width / q.width, h: r.height / q.height };
    }
    // The cast waits on the stage, invisible, from the moment both teams exist: each subject cut from its
    // card with its large art, its shade, both names and the house lights. Play then only places them.
    let cast = null;
    function shadeAt(sh, g) {
      sh.style.width = (g.aw * 1.15).toFixed(1) + 'px'; sh.style.height = (g.aw * 0.2).toFixed(1) + 'px';
      sh.style.transform = `translate3d(${(g.sx - g.aw * 0.575).toFixed(1)}px, ${(g.fy - g.aw * 0.1).toFixed(1)}px, 0)`;
    }
    function prepEntry() {
      const { S } = G;
      const teams = [S.you, S.rival];
      if (teams.some((t) => t.length < 3)) return null;
      const key = teams.flat().join();
      if (cast && cast.key === key) return cast;
      if (cast) cast.all.forEach((n) => n.remove());
      const parts = [], all = [];
      // each subject takes its art at the pixels it stands at (G.cutFor): the rest cut unless the stand shows
      // more than its 720 device px, so the waiting cast never decodes or rasterizes a 2000 px picture for a
      // 300 px stand in the frames after the deal
      const st = stands();
      const heads = [];
      teams.forEach((ids, k) => ids.forEach((id, j) => {
        let box = artBox(id);
        if (!box.h) return;
        if (j === 0) heads[k] = box;
        const head = heads[k] || box;
        const el = document.createElement('div');
        el.className = 'subject';
        el.style.zIndex = j === 0 ? '3' : '2';
        let art;
        const fr = ART.FRAME[id], cut = (((globalThis.MEDIA || {}).media || {})[id] || {}).object;
        const popped = !!((((globalThis.MEDIA || {}).media || {})[id] || {}).pop);
        if (fr.stand && cut && !popped) {
          // a window is a scene; in the arena its work stands as its cutout, foot on the panel's floor
          const w = fr.stand, h = (w * cut.h) / cut.w / RATIO, foot = ART.PANEL.top + ART.PANEL.height;
          box = { a: box.a, x: 0.5 - w / 2, y: foot - h, w, h };
          art = document.createElement('img');
          art.className = 'art obj'; art.alt = ''; art.decoding = 'async'; art.src = G.cutFor(id, st.place({ box, k, j, head }).Wc) ? cut.hi : cut.src;
          art.style.cssText = `--w:${w * 100}%;--l:${(0.5 - w / 2) * 100}%;--t:${(foot - h) * 100}%`;
        } else {
          art = box.a.cloneNode(true);
          art.style.transform = ''; art.style.scale = ''; art.style.filter = '';
          // the file for the stand's width (G.srcFor): the media's cut ladder, or a family's own picture from its own
          // srcset (a hero is never swapped for the media's cut); the wall's srcset goes, so the stand's choice holds
          const im = art.tagName === 'IMG' ? art : art.querySelector('img'), src = im && G.srcFor(im, id, st.place({ box, k, j, head }).Wc);
          if (im && src) { im.removeAttribute('srcset'); im.src = src; }
        }
        el.append(art);
        const sh = document.createElement('i');
        sh.className = 'shade';
        parts.push({ id, k, j, box, head, el, sh });
        all.push(sh, el);
      }));
      // the house lights go down toward the arena's dark, least where the teams stand
      const scrim = document.createElement('i');
      scrim.className = 'scrim';
      const names = teams.map((ids, j) => {
        const p = document.createElement('p');
        p.className = 'duel ' + (j ? 'b' : 'a');
        p.textContent = titleOf(ids[0]);
        const st = G.cards[ids[0]].el.style;
        // the plate in its lead card's own colours, its light on its dark as the card's bars print them (the
        // round-3 --ink and --tint are gone from the card, so the plate fell back to dark type on no plate)
        p.style.color = st.getPropertyValue('--g');
        p.style.background = `color-mix(in oklab, ${st.getPropertyValue('--d')} 88%, transparent)`;
        return p;
      });
      // each subject waits at its stand, at its own size and all but invisible, so its art is decoded and
      // printed at that size before Play
      for (const P of parts) {
        const g = st.place(P);
        P.el.style.width = g.Wc.toFixed(2) + 'px';
        P.el.style.opacity = '0.001'; // under half a level on any pixel
        P.el.style.transform = tf(g.x1, g.y1, 1);
        shadeAt(P.sh, g);
      }
      // the flares wait inside the six dock cards
      const flares = [...G.wells.you, ...G.wells.rival].map((w) => {
        const m = $('.hold > .card:not(.premini) .face', w);
        if (!m) return null;
        const f = $('.flare', m) || document.createElement('i');
        f.className = 'flare';
        m.append(f);
        return f;
      });
      // both names in one row (rituals.css .duels): the layout, not a pair of offsets, keeps them apart
      const duels = document.createElement('div');
      duels.className = 'duels';
      duels.append(...names);
      stage.prepend(scrim);
      stage.append(...all, duels);
      cast = { key, parts, scrim, names, flares, all: [scrim, ...all, duels, ...flares.filter(Boolean)] };
      return cast;
    }
    const idle = (fn) => (globalThis.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
    // Where the two teams stand: the 8 degree seam through the room's centre, and in each half two rows. The
    // lead stands forward in the middle on a floor above the dock; its teammates stand behind it either side,
    // their feet at its head. Every subject is its card's pop-out, a wide picture, so rows, not a spread along one
    // floor, keep each one whole: no subject covers another, and the names below stand clear of all six. On a
    // screen held upright (under 640 px wide and taller than wide, as rituals.css sets the names) the seam turns
    // to run 8 degrees off the horizontal through the room above the dock: the rival stands in the upper half
    // and you in the lower, nearer the hand.
    function stands() {
      const vw = innerWidth, vh = innerHeight;
      const ang = (8 * Math.PI) / 180; // the Broadcast's opening split
      const dock = parseFloat(getComputedStyle(root).getPropertyValue('--dock')) || 96;
      // a subject's card width: its share of the room's height, narrowed to its share of the half's width
      const fit = (box, H, cap) => Math.min(H / (box.h * RATIO), cap / box.w);
      const at = (box, Wc, sx, fy) => ({ Wc, sx, fy, aw: box.w * Wc, x1: sx - (box.x + box.w / 2) * Wc, y1: fy - (box.y + box.h) * Wc * RATIO });
      // head: the lead's box (prepEntry), whose height sets where the row behind it stands
      const rows = ({ box, j, head = box }, x0, hw, lead, back, fl) => {
        const Wl = fit(head, ...lead);
        if (j === 0) return at(box, Wl, x0 + hw * 0.5, fl);
        return at(box, fit(box, ...back), x0 + hw * [0, 0.25, 0.75][j], fl - 0.94 * head.h * Wl * RATIO);
      };
      if (vw < 640 && vh >= vw) {
        const room = vh - dock - 8;
        // the normal points up, so the rival (k 1) takes the upper side, as it takes the right one sideways
        const nx = -Math.sin(ang), ny = -Math.cos(ang), d = nx * (vw / 2) + ny * (room / 2);
        const floors = [room - 64, room * 0.44 + 12]; // yours stands above your name, theirs above the seam
        const place = (P) => rows(P, 0, vw, [room * 0.26, vw * 0.56], [room * 0.16, vw * 0.46], floors[P.k]);
        // the rival's flights cross your half on their way up, so they leave first and pass before yours rise
        return { vw, vh, nx, ny, d, place, lag: (k) => (k ? 0 : 120) };
      }
      const nx = Math.cos(ang), ny = Math.sin(ang), d = nx * (vw / 2) + ny * (vh / 2);
      const floor = Math.min(vh * 0.66, vh - dock - 140);
      const seam = (d - ny * floor) / nx;
      const halves = [[0, seam], [seam, vw]];
      const place = (P) => {
        const [x0, x1] = halves[P.k], hw = x1 - x0;
        return rows(P, x0, hw, [vh * 0.34, hw * 0.56], [vh * 0.24, hw * 0.44], floor + vh * 0.02);
      };
      return { vw, vh, nx, ny, d, place, lag: (k) => k * 25 };
    }
    function entry(done) {
      const { S, wells } = G;
      warm();
      const C = prepEntry();
      const { vh, nx, ny, d, place, lag } = stands();
      const teams = [S.you, S.rival], sides = [wells.you, wells.rival];
      // the worlds: each lead's world leaves its dock card's trim and is composed on the room (Ground's 'view'
      // mode) in the space of the card its lead stands as, so its bursts converge on the lead in the arena, not
      // on the dock; that card is held to at least 0.42 of the room's short side about the subject's centre, the
      // least at which a world's grain reads as a card's (ground.js VIEW_MIN)
      const spaceOf = (k) => {
        const L = C && C.parts.find((P) => P.k === k && P.j === 0);
        if (!L) return null;
        const g = place(L), w = Math.max(g.Wc, 168, 0.42 * Math.min(innerWidth, innerHeight)), f = w / g.Wc;
        const cx = g.x1 + (L.box.x + L.box.w / 2) * g.Wc, cy = g.y1 + (L.box.y + L.box.h / 2) * g.Wc * RATIO;
        return { x: cx - (cx - g.x1) * f, y: cy - (cy - g.y1) * f, w, h: w * RATIO };
      };
      const worlds = teams.map((ids, k) => {
        const rect = wellCard(sides[k][0]);
        return { id: ids[0], rect, space: spaceOf(k), far: (Ground.far ? Ground.far(rect) : 0) + 240, half: k ? [nx, ny, d, 1.5] : [-nx, -ny, -d, 1.5] };
      });
      // the subjects lift out of their own dock cards to their stands; every read first, then the writes
      const subs = C ? C.parts.map((P) => {
        const mini = $('.hold > .card:not(.premini)', sides[P.k][P.j]), ma = mini && $('.art', mini);
        return ma ? { P, mr: ma.getBoundingClientRect() } : null;
      }).filter(Boolean).map(({ P, mr }) => {
        const { box, k, j, el, sh } = P;
        const g = place(P), s0 = mr.width / g.aw;
        el.style.width = g.Wc.toFixed(2) + 'px';
        el.style.opacity = '';
        shadeAt(sh, g);
        // the teammates leave first for the row behind, and the lead last for the front, so no flight crosses
        // another subject on its way up and each lead lands as its name prints
        return { el, sh, s0, x0: mr.left - box.x * g.Wc * s0, y0: mr.top - box.y * g.Wc * RATIO * s0, x1: g.x1, y1: g.y1, at: 60 + [100, 0, 50][j] + lag(k) };
      }) : [];
      // the flares: left to right across the dock (cut with the cast; a dock card swapped since gets one now)
      const flares = [...wells.you, ...wells.rival].map((w) => {
        const m = $('.hold > .card:not(.premini) .face', w);
        if (!m) return null;
        let f = $('.flare', m);
        if (!f) { f = document.createElement('i'); f.className = 'flare'; m.append(f); }
        return f;
      });
      const names = C ? C.names : [], scrim = C ? C.scrim : null;
      const T = M.timeline(700, (t) => {
        flares.forEach((f, i) => { if (f) f.style.opacity = (0.95 * Math.sin(Math.PI * win(t, i * 45, i * 45 + 280))).toFixed(3); });
        // the worlds burst out of the trim at once and settle as they reach the corners
        const k = ease.out(win(t, 20, 620));
        worlds.forEach((w, j) => pour('duel-' + j, { card: w.id, rect: w.rect, r: k * w.far, front: 220, mode: 'view', half: w.half, z: j, space: w.space, ...optsOf(w.id) }));
        for (const s of subs) {
          const q = ease.crit(win(t, s.at, s.at + 420));
          const x = lerp(s.x0, s.x1, q), y = lerp(s.y0, s.y1, q) - Math.sin(Math.PI * q) * vh * 0.05;
          s.el.style.transform = tf(x, y, lerp(s.s0, 1, q));
          s.sh.style.opacity = ease.out(win(t, s.at + 200, s.at + 420)).toFixed(3);
        }
        if (scrim) scrim.style.opacity = ease.io(win(t, 260, 700)).toFixed(3);
        const n = win(t, 380, 640);
        names.forEach((p) => { p.style.opacity = String(n); p.style.transform = `translateY(${((1 - ease.out(n)) * 12).toFixed(1)}px)`; });
        if (t > 0 && Ground.driver) Ground.driver();
      }, () => { own(T); done(); });
      SND()?.schedule(SND().entryCues()); SND()?.music(null, { fadeMs: 600 }); T.kind = 'entry';
      G.ritual = T;
    }

    // ---------- the pack ----------
    const packEl = $('#pack');
    const packOff = () => packEl.getAttribute('aria-disabled') === 'true'; // full: focusable, its reason in its name
    const RARE = [0, 0, 0, 140, 280]; // the costliest card waits longer the rarer it is
    // The three cards a pack will hold, drawn without spending the draw: the pack's draw is seeded and
    // counted, so peeking restores the count. Hover or focus prepares them: the copies are cut and their
    // posters and large art decoded before the seal breaks.
    function peek() { const S = G.S, n = S.packs; const ids = G.draw ? G.draw() : null; S.packs = n; return ids; }
    // a stage card is under 120 px (T0, the work only) or 164 and up, the narrowest card on which every
    // name sets in two lines beside its squares (card.css --t1); between them it drops to T0
    const tier = (w) => (w >= 164 ? w : Math.min(w, 119));
    function layout(n) {
      const vw = innerWidth, vh = innerHeight;
      const dockH = parseFloat(getComputedStyle(root).getPropertyValue('--dock')) || 96;
      if (vw >= 480) {
        // a row above the dock: a subject pops out up to 0.066W past its trim (EX.md 13), so trims 0.132W + 8 px
        // apart keep two neighbours' subjects at least 8 px apart, as on the wall (ui.css --cg)
        let gap = 20, cw = 0;
        for (let k = 0; k < 2; k++) { cw = tier(Math.floor(Math.min(300, (vw - 48 - (n - 1) * gap) / n, (vh - dockH - 200) / RATIO))); gap = Math.max(20, Math.ceil(0.132 * cw + 8)); }
        const ch = cw * RATIO;
        // on whole pixels, so a card standing at its slot draws its subject unresampled
        const x0 = Math.round((vw - (n * cw + (n - 1) * gap)) / 2), y0 = Math.round(Math.max(12, (vh - dockH - ch) / 2 - 36));
        return { pile: false, cw, ch, slots: Array.from({ length: n }, (_, j) => ({ x: x0 + j * (cw + gap), y: y0 })) };
      }
      // a phone: one pile at T2, each later card a step higher, so every earlier name still shows
      const off = 0.12, top = 16, bottom = vh - dockH - 24 - 122;
      const cw = tier(Math.floor(Math.min(346, vw - 44, (bottom - top) / (RATIO * (1 + off * (n - 1))))));
      const ch = cw * RATIO;
      const y0 = top + (bottom - top - ch * (1 + off * (n - 1))) / 2;
      return { pile: true, cw, ch, slots: Array.from({ length: n }, (_, j) => ({ x: Math.round((vw - cw) / 2), y: Math.round(y0 + (n - 1 - j) * off * ch) })) };
    }
    // The costliest card grows 4% as its world fills the room. It is laid out at that grown size and prints at its
    // neighbours' size, so at the climax every card stands flat, on whole pixels and at scale 1, the scale its layer was
    // rastered at while it waited: nothing resamples its subject (EX.md 13, E6b).
    const GROW = 1.04;
    function standOf(L, j, n) {
      const sl = L.slots[j], w = j === n - 1 ? Math.round(L.cw * GROW) : L.cw;
      return { w, h: w * RATIO, x: Math.round(sl.x + (L.cw - w) / 2), y: Math.round(sl.y + (L.ch - w * RATIO) / 2), cx: sl.x + L.cw / 2, cy: sl.y + L.ch / 2 };
    }
    let prepared = null;
    // one copy for slot j of a pack, waiting on the stage
    function copyFor(P, j) {
      const { ids, at } = P, n = ids.length, id = ids[j];
      const el = G.copyOf(id);
      el.style.setProperty('--card', at[j].w + 'px');
      el.style.width = at[j].w + 'px';
      el.style.zIndex = String(10 + j);
      const cv = $('canvas.ground', el);
      // only the costliest prints live (its foil sweeps); the others show their t = 0 print, the poster
      if (j === n - 1) cv.style.opacity = '0'; else cv.remove();
      // the art at the pixels it shows (G.cutFor): on most screens the rest cut the gallery already decoded
      G.toHi(el, id, at[j].w);
      decode(`posters/${id}.webp`);
      // the copies wait on the stage at 0.001 (under half a level on any pixel), each at its climax stand and scale 1,
      // so their style, layout, images and rasters are done before the reveal, at the scale the climax shows them; at 0
      // the browser would skip their raster until the first frame
      // Their subjects wait out of raster (.waiting): a subject rastered on the stage made the wall's copy of the same
      // picture raster from another decode (energy ex.4: Mailroom 4.2% of its px off its first live frame whenever it
      // waited in the next pack), and the wall prints the same pixels whatever the pack holds. The tear shows them, a
      // frame after the press (ghostPack), while every card still waits face down in the packet.
      // Each copy also waits .turned, the state its turn needs (card.css: its back shown and turned away, its sleeve a px
      // off the print, its pixel art drawn smooth), and the hit waits with its gloss's group (.face.lit) at a gloss of 0,
      // so no frame of the reveal adds, removes or repaints a layer as a card turns, lies flat or sweeps: toggled per
      // card as each turn began and ended, the back's own layer came and went, and every reveal frame laid out every
      // layer on the page again (engineer ex.4: Layerize 29.6% of a 2.5 s pack at 4x).
      el.classList.add('waiting', 'turned');
      if (j === n - 1) { const f = $('.face', el); if (f && $('.glare', el)) f.classList.add('lit'); }
      el.style.opacity = '0.001'; el.style.transform = tf(at[j].x, at[j].y, 1);
      stage.append(el);
      P.els[j] = el;
      return el;
    }
    // The next pack's copies, all at once (a press that finds them unmade) or, from ready(), one per idle period, each
    // copy's style and layout read inside its own idle slice: three cut and laid out at once made one idle task of 96
    // ms with the CPU slowed 4x, and the first frame after it laid out all three again
    function plan(ids) {
      const key = ids.join() + '|' + innerWidth + 'x' + innerHeight;
      if (prepared && prepared.key === key) return prepared;
      if (prepared) prepared.els.forEach((el) => el && el.remove());
      const L = layout(ids.length), n = ids.length;
      prepared = { key, ids, L, els: [], at: ids.map((id, j) => standOf(L, j, n)) };
      return prepared;
    }
    function prepare(ids = peek()) {
      if (!ids || !ids.length) return null;
      const P = plan(ids);
      for (let j = 0; j < ids.length; j++) if (!P.els[j]) copyFor(P, j);
      return P;
    }
    function prepareSoon(ids = peek(), then) {
      if (!ids || !ids.length) { if (then) then(); return; }
      const P = plan(ids);
      const step = () => {
        if (prepared !== P || G.ritual) { if (then) then(); return; }
        let j = -1;
        for (let k = 0; k < P.ids.length; k++) if (!P.els[k]) { j = k; break; }
        if (j < 0) {
          // and then the well cards they will land on, waiting unseen in their empty wells, a period of their own
          if (!P.minis && G.premini) { P.minis = true; G.premini(P.ids); }
          if (then) then();
          return;
        }
        copyFor(P, j).offsetWidth; // its style and layout, now, in idle time
        idle(step);
      };
      step();
    }
    packEl.addEventListener('pointerenter', () => { if (!packOff() && !G.ritual && !RM()) prepare(); });
    packEl.addEventListener('focus', () => { if (!packOff() && !G.ritual && !RM()) prepare(); });
    // The packet a tear plays on: a copy of the tile's packet at the tile's size. One waits on the stage at
    // 0.001 like the copies, so its layers are rasterized before the press, which only places it. Its packet
    // never eases its scale: a press's 0.97 is taken as it stands.
    let spare = null;
    function packet(w) {
      if (spare) { const s = spare; spare = null; if (s.w === w) return s.el; s.el.remove(); }
      const g = document.createElement('div');
      g.className = 'ghost';
      g.style.cssText = `width:${w}px;--card:${w}px;--r:max(3px, calc(${w}px * .048));border:1px solid transparent`;
      const k = $('.pk', packEl).cloneNode(true);
      k.style.perspective = Math.round(w * 3) + 'px';
      k.style.transition = 'none';
      g.append(k);
      const sheen = document.createElement('b');
      sheen.className = 'sheen';
      $('.strip', g).append(sheen);
      return g;
    }
    // The next pack waits ready whenever one could open: its three copies and its packet are cut and
    // rasterized at idle (after boot, after every team change and after every pack), so no press, tap or key
    // pays for them in the reveal's first frames. A full team needs no pack, so they go.
    let readying = false;
    function ready() {
      if (readying) return;
      readying = true;
      idle(() => {
        readying = false;
        if (G.ritual) { ready(); return; }
        if (packOff() || RM() || LEAN) { // kevinliu.studio phone memory (scripts/phone-memory.mjs)
          if (prepared) { prepared.els.forEach((el) => el && el.remove()); prepared = null; }
          if (G.premini) G.premini(null);
          if (spare) { spare.el.remove(); spare = null; }
          return;
        }
        // the packet's width first, from a clean layout, then the packet and the copies, one per idle period
        const w = packEl.getBoundingClientRect().width;
        if (w && !(spare && spare.w === w)) {
          const el = packet(w);
          el.style.opacity = '0.001';
          stage.append(el);
          spare = { w, el };
        }
        idle(() => prepareSoon());
      });
    }
    function ghostPack() {
      const pk = $('.pk', packEl);
      // every read before any write, so the press's frame forces no style or layout of its own
      let r = rectOf(packEl);
      const scale = getComputedStyle(pk).scale, lifted = packEl.classList.contains('lift');
      const visible = r.y >= 0 && r.y + r.h <= innerHeight - 8 && r.w > 0;
      if (!visible) {
        const w = Math.min(r.w || 240, 280);
        r = { x: (innerWidth - w) / 2, y: (innerHeight - w * RATIO) / 2 - 30, w, h: w * RATIO };
      }
      const g = packet(r.w);
      g.className = 'ghost' + (lifted ? ' pack lift' : '');
      g.style.opacity = '';
      g.style.transform = `translate3d(${r.x}px,${r.y}px,0)`;
      $('.pk', g).style.scale = scale; // a press holds the packet at 0.97; the tear starts there
      if (!g.isConnected) stage.append(g);
      const strip = $('.strip', g);
      if (!visible) g.animate([{ opacity: 0, transform: g.style.transform + ' scale(.96)' }, { opacity: 1, transform: g.style.transform }], { duration: 150, easing: 'cubic-bezier(.2,0,0,1)' });
      packEl.classList.add('open');
      stage.classList.add('on');
      // the copies' subjects print during the tear, a frame after the press, so the reveal's first frame rasters none
      // of them (a reseal puts them back out of raster: dropGhost)
      const wake = prepared;
      if (wake) after(1, () => { if (prepared === wake && G.ritual) for (const el of wake.els) if (el) el.classList.remove('waiting'); });
      return { el: g, r, halves: $$('.half', g), segs: $$('.strip i', g), strip, sheen: $('.sheen', strip), foot: $('.pk-foot', g), p: 0, dir: 1, dy: 0 };
    }
    function dropGhost(P) {
      P.el.remove(); packEl.classList.remove('open'); stage.classList.remove('on');
      if (prepared) for (const el of prepared.els) if (el) el.classList.add('waiting');
      ready();
    }
    // The tear: the strip parts along its perforation at the hand. Behind the tear point the torn strip
    // curls up as one chain, steeper the further from the tear, and rises toward the hand against a rubber
    // band (32 px dead zone, 8 px at most). Each segment is a rigid link pinned at its end nearer the tear.
    const rubber = (d) => 8 * Math.min(1, Math.sqrt(Math.max(0, Math.abs(d) - 32)) / 8);
    function tearTo(P, p, dir, dy) {
      const n = P.segs.length, W = P.r.w, sw = W / n, X = p * W, L = W * 0.42;
      const up = rubber(dy) * (dy < 0 ? 1 : 0.35);
      const th = (a) => (0.42 + 0.012 * up) * M.smooth(a / L); // radians: about 24 degrees at full curl
      // the chain's shape, walked back from the tear point in eighth-link steps: run and rise by arclength
      const h = sw / 8, run = [0], rise = [0];
      for (let a = 0; a < X; a += h) { const t = th(a + h / 2); run.push(run.at(-1) + Math.cos(t) * h); rise.push(rise.at(-1) + Math.sin(t) * h); }
      const along = (a, v) => { const i = Math.min(v.length - 2, Math.floor(a / h)), f = a / h - i; return v[i] + (v[i + 1] - v[i]) * f; };
      P.segs.forEach((s, i) => {
        const idx = dir > 0 ? i : n - 1 - i; // order from the start edge
        const a = X - (idx + 1) * sw; // arclength from the tear point to this link's near end
        let t = '';
        if (a >= 0) {
          const dx = a - along(a, run), lift = along(a, rise) + up * M.smooth(a / (3 * sw));
          t = `translate3d(${(dir * dx).toFixed(2)}px, ${(-lift).toFixed(2)}px, 0) rotate(${((dir * th(a + sw / 2) * 180) / Math.PI).toFixed(2)}deg)`;
        } else if (a > -sw && p < 1) {
          // the link the tear is crossing lifts on its near end
          const f = 1 + a / sw;
          t = `rotate(${(dir * f * 5).toFixed(2)}deg)`;
        }
        s.style.transformOrigin = dir > 0 ? '100% 100%' : '0 100%';
        s.style.transform = t;
      });
      const on = p > 0.001 && p < 0.999;
      P.sheen.style.opacity = on ? '1' : '0';
      const sx = dir > 0 ? X : W - X;
      P.sheen.style.transform = `translate3d(${(sx - 0.08 * W).toFixed(1)}px, 0, 0)`;
      P.p = p; P.dir = dir; P.dy = dy;
    }
    // Esc before the seal breaks lets the strip spring back and reseals the packet
    function reseal(P) {
      const from = P.p, fdy = P.dy, dir = P.dir; snd('pack.reseal');
      const T = M.timeline(300, (t) => { const k = ease.crit(t / 300); tearTo(P, from * (1 - k), dir, fdy * (1 - k)); }, () => { dropGhost(P); own(T); });
      G.ritual = T;
    }
    // a ritual for the tear itself: Esc reseals, anything else that ends it runs the whole pack to its end;
    // stop() lets go of whatever was driving the strip (the commit's timeline, or the hand)
    function tearRitual(P, stop) {
      return { tear: true, finish() { stop(); commitTear(P, 0, true); }, reverse() { stop(); reseal(P); } };
    }
    // pointer tear on the tile: after 3 px the strip follows the hand; past 55% it commits
    {
      let st = null;
      packEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || packOff() || G.ritual) return;
        st = { id: e.pointerId, x: e.clientX, y: e.clientY, P: null };
      });
      packEl.addEventListener('pointermove', (e) => {
        if (!st || e.pointerId !== st.id) return;
        const dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (!st.P) {
          if (Math.hypot(dx, dy) <= 3) return;
          if (Math.abs(dy) > Math.abs(dx) && e.pointerType !== 'mouse') { st = null; return; } // yield to scroll
          try { packEl.setPointerCapture(st.id); } catch (err) {}
          prepare();
          st.P = ghostPack(); snd('pack.grab', { pan: pan(packEl) });
          st.P.dir = dx >= 0 ? 1 : -1;
          const s = st;
          G.ritual = tearRitual(s.P, () => { s.done = true; });
        }
        if (st.done) return;
        tearTo(st.P, clamp((dx * st.P.dir) / st.P.r.w), st.P.dir, dy);
        { const p = clamp((dx * st.P.dir) / st.P.r.w); if (Math.abs(p - (st.g ?? 0)) >= 0.05) { const speed = Math.abs(p - (st.g ?? 0)) / Math.max(0.001, (e.timeStamp - (st.gt ?? e.timeStamp)) / 1000); snd('pack.tear.grain', { gainDb: Math.max(-6, Math.min(0, 6 * Math.log2(speed / 2))), pan: pan(packEl) }); st.g = p; st.gt = e.timeStamp; } }
      });
      const end = (e, cancel) => {
        if (!st || e.pointerId !== st.id) return;
        const s = st; st = null;
        if (!s.P) { if (!cancel) openPack(); return; }
        if (s.done) return;
        if (!cancel && s.P.p > 0.55) commitTear(s.P, 220);
        else reseal(s.P);
      };
      packEl.addEventListener('pointerup', (e) => end(e, false));
      packEl.addEventListener('pointercancel', (e) => end(e, true));
      packEl.addEventListener('click', (e) => { if (e.detail === 0) openPack(); });
      packEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPack(); } });
    }
    // o.ids: deal these cards instead of a draw (the judges' scripts shoot every card at the pack's climax this way)
    function openPack(o = {}) {
      if (G.ritual) return;
      if (G.S.you.length >= G.SIZE) { say('Open Pack: Team Full'); return; }
      const dealt = Array.isArray(o.ids) && o.ids.length && o.ids.every((id) => G.cards[id]) ? o.ids.slice(0, G.SIZE) : null;
      if (RM()) {
        const ids = dealt || G.draw();
        if (!ids) return; snd('pack.reveal', { cost: Math.min(4, cost(ids.at(-1))) });
        ids.forEach((id) => G.add(id, { silent: true }));
        G.wells.you.forEach((w) => $('.hold', w).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }));
        say(`Pack: ${and(ids.map(titleOf))}`);
        return;
      }
      prepare(dealt || undefined);
      const P = ghostPack();
      P.ids = dealt;
      commitTear(P, 360);
    }
    // the strip completes its tear: 220 ms from a release past 55%, 360 ms from the keyboard; skip: at once
    function commitTear(P, ms, skip) {
      if (skip) { tearTo(P, 1, P.dir, 0); reveal(P).finish(); return; }
      const p0 = P.p, dy0 = P.dy; snd('pack.rip', { delayMs: ms });
      // the reveal starts where the tear ended, on the frame's clock (Motion.timeline t0), not a frame later
      const T = M.timeline(ms, (t) => tearTo(P, lerp(p0, 1, ease.out(t / ms)), P.dir, dy0 * (1 - t / ms)), () => { own(R); reveal(P, T.over); });
      const R = tearRitual(P, () => T.cancel());
      G.ritual = R;
    }
    function reveal(P, t0 = 0) {
      const { wells } = G;
      const ids = P.ids || G.draw();
      if (!ids) { dropGhost(P); return { finish() {} }; }
      const prep = prepare(ids);
      prepared = null;
      const { L, els: cardEls, at } = prep;
      cardEls.forEach((el) => el.classList.remove('waiting'));
      const n = ids.length, dir = P.dir, top = cost(ids[n - 1]);
      const base = G.S.you.length;
      // a cost 4 card's world holds the room 480 ms while its foil sweeps once (500 ms), the sweep's last
      // 20 ms settling as the card lifts off; each card flies home in FLY, so the whole pack lands 40 ms inside
      // its limit from the commit (2.1 s with a cost 4, 1.44 with a 3, 1.3 otherwise), a frame's room on a busy host
      const hold = top >= 4 ? 480 : 0, SWEEP = 500, FLY = 380;
      const Pj = (j) => 400 - (n - 1 - j) * 100 + (j === n - 1 ? RARE[top] : 0); // each print begins
      const Tj = (j) => Pj(j) - 150; // each turn: edge on as its print begins
      const hitEnd = Pj(n - 1) + 480 + hold;
      const E = hitEnd + FLY;
      const Fj = (j) => E - FLY - (n - 1 - j) * 50; // each flies to its well
      // the hit grows to its own size and its foil sweeps and rocks it once, both ending 40 ms before the first card
      // leaves, so the climax holds every card flat at its stand
      const swEnd = Fj(0) - 40, swStart = swEnd - SWEEP, growEnd = Math.min(Pj(n - 1) + 480, Fj(0) - 40);
      // a row: the backs rise together; a pile: each leaves the packet just before its turn and lands
      // face up on the one before, so every card shows its face before the next covers it
      const rise = (j) => (L.pile ? [Math.max(0, Tj(j) - 140), Tj(j) + 260] : [40 + j * 50, 360 + j * 50]);
      // every read first, then the stage takes its cards (one layout); the hit's live print starts on the
      // next frame, once the browser has laid it out
      const wellTo = ids.map((id, j) => wellCard(wells.you[base + j]));
      const els = ids.map((id, j) => {
        const el = cardEls[j];
        return { id, el, body: $('.body', el), band: $('.band', el), glare: $('.glare', el), crop: cropOf(el), s: null, hit: j === n - 1, landed: false, ...at[j], b: L.cw / at[j].w };
      });
      // the hit's world reaches past the farthest corner by its whole front, so the room is covered
      const fullFar = (Ground.far ? Ground.far({ x: at[n - 1].x, y: at[n - 1].y, w: at[n - 1].w, h: at[n - 1].h }) : 0) + 260;
      const dimFrom = n > 1 ? Pj(n - 2) : Pj(n - 1) - 200;
      // a card lands: it joins the team in this frame, so its well takes its T0 face as the copy leaves
      function land(j) {
        const c = els[j];
        if (c.landed) return;
        c.landed = true;
        c.el.remove();
        if (c.s) Ground.remove('stage-hit');
        G.add(c.id, { silent: true });
      }
      let begun = false; // the timeline's first render, in the frame that builds the stage, starts no live print
      const T = M.timeline(E, (t) => {
        // the torn strip leaves; the flaps swing open on their folds, 300 ms each, 140 apart
        const sa = ease.out(win(t, 0, 220));
        P.strip.style.transform = `translate3d(${(dir * 34 * sa).toFixed(1)}px, ${(-46 * sa).toFixed(1)}px, 0) rotate(${(-dir * 12 * sa).toFixed(2)}deg)`;
        P.strip.style.opacity = String(1 - win(t, 60, 220));
        P.foot.style.opacity = String(1 - win(t, 0, 150));
        P.halves.forEach((h, k) => {
          const a = ease.out(win(t, k * 140, k * 140 + 300));
          const s = k ? 1 : -1;
          h.style.transform = `translate3d(${(s * a * P.r.w * 0.1).toFixed(1)}px, ${(a * P.r.h * 0.04).toFixed(1)}px, 0) rotateY(${(s * a * 105).toFixed(2)}deg)`;
          h.style.opacity = String(1 - win(a, 0.6, 1));
        });
        // the room dims to 0.6 for the hit and comes back as the cards leave
        dim.style.opacity = (0.4 * M.smooth(win(t, dimFrom, Pj(n - 1))) * (1 - ease.io(win(t, Fj(0), E)))).toFixed(3);
        els.forEach((c, j) => {
          if (c.landed) return;
          if (c.hit && !c.s && begun && t > 0 && t < Fj(j) && live()) {
            c.s = Ground.surface('stage-hit', $('canvas.ground', c.el), c.id, 'fit', optsOf(c.id)) || false;
            if (c.s) c.s.active = true;
          }
          // rise out of the packet, turn and print, then fly to the well; each lands exactly (exact), so at the climax it
          // stands flat at its stand, on whole pixels at scale 1
          const [r0, r1] = rise(j);
          const ri = exact(win(t, r0, r1));
          const sc0 = P.r.w / c.w;
          const hit = c.hit;
          // the hit prints at its neighbours' size and grows to its own as its world fills the room, about its slot's centre
          const s1 = hit ? lerp(c.b, 1, ease.out(win(t, Pj(j), growEnd))) : 1;
          const sx = s1 === 1 ? c.x : c.cx - (s1 * c.w) / 2, sy = s1 === 1 ? c.y : c.cy - (s1 * c.h) / 2;
          let x = lerp(P.r.x, sx, ri), y = lerp(P.r.y, sy, ri) - Math.sin(Math.PI * ri) * (L.pile ? 60 : 30);
          let s = lerp(sc0, s1, ri);
          const fl = ease.crit(win(t, Fj(j), Fj(j) + FLY));
          const to = wellTo[j];
          x = lerp(x, to.x, fl); y = lerp(y, to.y, fl) - Math.sin(Math.PI * fl) * 50; s = lerp(s, to.w / c.w, fl);
          c.el.style.transform = tf(x, y, s);
          c.el.style.opacity = t >= r0 ? '1' : '0.001';
          const turned = exact(win(t, Tj(j), Tj(j) + 300));
          // the hit rocks once under the light as its foil sweeps (cost 4)
          const sw = hit && hold ? win(t, swStart, swEnd) : 0;
          const rock = sw > 0 && sw < 1 ? Math.sin(2 * Math.PI * sw) * (1 - 0.35 * sw) : 0;
          const ry = 180 * (1 - turned) - 8 * rock, rx = hit && hold ? 3 * Math.sin(Math.PI * sw) : 0;
          c.body.style.transform = Math.abs(ry) + Math.abs(rx) < 0.01 ? '' : `perspective(${Math.round(4 * c.w)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
          if (c.band) c.band.style.opacity = String(1 - win(t, Fj(j), Fj(j) + 160));
          c.crop(ease.io(win(t, Fj(j) + 60, Fj(j) + FLY - 20)));
          if (c.s) {
            const sweeping = sw > 0 && sw < 1;
            c.s.tilt = sweeping ? [-rock, clamp(rx / 8, -1, 1)] : [0, 0];
            c.s.light = sweeping ? [lerp(0.05, 0.95, sw), lerp(0.2, 0.7, sw), Math.sin(Math.PI * sw)] : [0.5, 0.4, 0];
            c.s.dirty = true;
            if (c.glare) { // its group is held lit from prepare(), so only the gloss itself moves
              c.glare.style.opacity = (sweeping ? 0.7 * Math.sin(Math.PI * sw) : 0).toFixed(3);
              c.glare.style.transform = `translate3d(${((sw - 0.5) * c.w).toFixed(1)}px, ${((sw * 0.5 - 0.25) * c.h).toFixed(1)}px, 0)`;
            }
          }
          // the worlds: each cheaper card rings out a little of its world as it prints; the hit fills the
          // room behind the cards, holds, and drains back into its card as the card flies home
          let pr = 0;
          const vr = { x, y, w: c.w * s, h: c.h * s };
          if (!hit) pr = Math.sin(Math.PI * win(t, Pj(j), Pj(j) + 480)) * L.cw * 0.16;
          else pr = fullFar * ease.out(win(t, Pj(j), Pj(j) + 480)) * (1 - ease.io(win(t, Fj(j) - 60, Fj(j) + 300)));
          pour('pack-' + j, { card: c.id, rect: vr, r: pr, front: hit ? 220 : 36, z: j, ...optsOf(c.id) });
          if (t >= Fj(j) + FLY) land(j);
        });
        if (t > 0 && Ground.driver) Ground.driver();
      }, () => {
        for (let j = 0; j < n; j++) land(j);
        unpour(/^pack-/);
        dim.style.opacity = '0';
        P.el.remove();
        stage.classList.remove('on');
        own(T);
        say(`Pack: ${and(ids.map(titleOf))}, ${G.spent()} of ${G.BUDGET} inks`);
        // a fresh sealed packet waits on the table
        packEl.classList.remove('open');
        $('.pk', packEl).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,0,0,1)' });
      }, t0);
      begun = true;
      const tier = Math.min(4, top); const S0 = SND(); const sh = S0?.schedule(S0.packCues({ n, top: tier, base, size: G.SIZE }), { t0: S0.context ? S0.context.currentTime - t0 / 1000 : undefined }); { const fin = T.finish; T.finish = () => { const S2 = SND(); if (sh && S2?.context && S2.context.currentTime < sh.t0 + Fj(0) / 1000) { sh.cancel(40); snd(`pack.reveal.${tier}`); snd(base + n >= G.SIZE ? 'team.complete' : 'team.add', { offsetMs: 0 }); } fin.call(T); }; }
      T.skip = true;
      T.kind = 'pack';
      T.climax = Fj(0); // the frame before the first card leaves: every card turned and printed, the hit's world in the room
      G.ritual = T;
      return T;
    }
    // ends: a click on the stage ends the running sequence; a click outside ends it too (the pack's own
    // tear is not outside). During a pack's reveal any key or wheel ends it; Esc during the tear reseals.
    stage.addEventListener('click', () => { if (G.ritual) G.ritual.finish(); });
    document.addEventListener('pointerdown', (e) => { if (G.ritual && !stage.contains(e.target) && !packEl.contains(e.target)) G.ritual.finish(); }, true);
    document.addEventListener('keydown', (e) => {
      const r = G.ritual;
      if (!r || /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
      if (r.tear && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); r.reverse(); return; }
      if (r.skip) { e.preventDefault(); e.stopPropagation(); r.finish(); }
    }, true);
    addEventListener('wheel', () => { if (G.ritual && G.ritual.skip) G.ritual.finish(); }, { passive: true });

    // ---------- the lift: the card rises out of its pocket as its world prints across the room ----------
    // G.fill(id) prints the lifted card in the lens and G.sheet(id) its sheet; G.opened, G.stepped, G.leaving
    // and G.closed keep the address and the focus.
    const ins = $('#inspect'), insCard = $('.ins-card', ins), room = $('.room', ins), worldEl = $('#world');
    const I = { id: null, print: null, p: { x: 0, v: 0 }, to: 0, from: null, at: null, pw: 0, fade: 1, key: '', n: 0, pushed: false, closing: false, jobs: [] };
    function liftedRect(k) {
      const a = I.from, b = I.at;
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) };
    }
    // A lift is built over its first frames, one part a frame, so no frame pays for two, and the press's own
    // frame, which already pays for the hover, the press and the hit tests, pays for none of it. The next
    // frame prints the card's copy into the lens, laid out while closed and still unseen; the next shows the
    // lens with the copy on the card's own spot, the FLIP's first frame; then the sheet, which shows 120 ms
    // later; then the address and the focus, as the world starts to pour; then the page behind stops scrolling.
    // The page behind starts turning inert once the lift has settled and starts waking as the close begins (G.inert, a
    // piece at a time in idle time, gallery.js); the card takes the focus back once the close has landed (G.closed). A
    // lens that opens still (a card's own page, reduced motion) is built at once.
    const wait = () => {};
    // the copy, from the idle read of the card's place and the lens's (G.cardRect, G.lensRect): no lift frame reads a layout
    function place() {
      G.lensTop();
      I.from = G.cardRect(I.id);
      I.at = G.lensRect();
      G.fill(I.id, { live: false });
    }
    function show() {
      G.lensLive(); // the copy's print, from the layout the last frame did
      ins.hidden = false;
      G.cards[I.id].el.style.visibility = 'hidden';
      I.shown = true;
      I.openedAt = performance.now();
    }
    const writeSheet = () => { G.sheet(I.id); ins.classList.add('open'); };
    // the world starts pouring with the address, a frame after the sheet's layout
    const address = () => { G.opened(I.id, I.push); I.go = true; };
    const still0 = () => { root.classList.add('inspecting'); };
    function open(id, { instant = false, push = true } = {}) {
      if (G.ritual) return;
      if (I.id && !I.closing) { if (id !== I.id) step(id); return; } if (!instant) { snd('card.lift'); snd('lift', { card: id }); }
      if (I.id && I.closing) { // reopening mid-close retargets from the current frame
        if (id === I.id) { I.closing = false; I.to = 1; I.go = true; ins.classList.add('open'); M.add(tick); return; }
        finish();
      }
      const now = instant || RM();
      I.id = id; I.push = push; I.print = null;
      I.key = 'inspect-' + ++I.n;
      I.p = { x: now ? 1 : 0, v: 0 };
      I.pw = now ? 1 : 0;
      I.to = 1; I.closing = false; I.go = now;
      // reduced motion: the lens never moves; it and its world fade in over 150 ms (still())
      I.fade = instant || !RM() ? 1 : 0;
      I.jobs = [place, show, writeSheet, address, still0];
      I.shown = false;
      rest(G.cards[id]);
      if (now) { while (I.jobs.length) I.jobs.shift()(); tick(0); }
      else I.jobs.unshift(wait);
      M.add(tick);
    }
    function tick(dt) {
      if (!I.id) return false;
      if (I.jobs.length && !I.closing) {
        const job = I.jobs.shift();
        job();
        if (job === show) dt = 0; // the copy's first frame stands exactly on the card
      }
      if (!I.shown) return true;
      const more = RM() ? still(dt) : move(dt);
      if (!more && !I.closing && I.id && !I.jobs.length) G.inert(true); // settled: the page behind turns inert, a piece at a time
      return more || I.jobs.length > 0;
    }
    function move(dt) {
      let busy = M.spring(I.p, I.to, I.closing ? 360 : 420, 0.9, dt);
      const k = I.p.x;
      const el = I.print.el;
      const r = liftedRect(k);
      const s = r.w / I.at.w;
      el.style.transform = k >= 0.9999 ? '' : `translate3d(${r.x - I.at.x}px, ${r.y - I.at.y}px, 0) scale(${s})`;
      // the type prints in at its new size as the card grows
      if (I.print.band) I.print.band.style.opacity = I.closing ? String(clamp(k * 1.5)) : String(clamp((k - 0.25) / 0.5));
      // the world prints out over 0.72 s, starting once the lens has printed its own first frame (so the
      // two largest draws never share a frame), and drains back in 0.36 s
      const lens = live() && Ground.surfaces.get('lens');
      if (I.closing) I.pw = Math.max(0, I.pw - dt / 0.36);
      else if (I.go && (!lens || lens.painted || I.pw > 0 || performance.now() - I.openedAt > 120)) I.pw = Math.min(1, I.pw + dt / 0.72);
      // without a GPU the poster is the room, and it fades as the world would pour
      if (!live()) room.style.opacity = (I.closing ? ease.in(I.pw) : ease.out(I.pw)).toFixed(3);
      if (live()) {
        const reach = (Ground.far(r) + 200) * (I.closing ? ease.in(I.pw) : ease.out(I.pw));
        pour(I.key, { card: I.id, rect: r, r: reach, front: 180, z: I.n, ...optsOf(I.id) });
        if (I.pw >= 1) for (const key of [...Ground.pours.keys()]) if (/^inspect-/.test(key) && key !== I.key) Ground.unpour(key);
      }
      if (I.pw < 1 && !I.closing) busy = true;
      if (I.closing && I.pw > 0) busy = true;
      if (I.closing && k <= 0.002 && I.pw <= 0) { finish(); return false; }
      return busy || I.closing;
    }
    // Reduced motion: the card stands at the lens and its world is printed whole; the lens, the room and the
    // world crossfade in 150 ms each way, on opacity alone, and the close fades from wherever the open was.
    function still(dt) {
      I.p.x = 1; I.pw = 1;
      I.fade = clamp(I.fade + ((I.closing ? -1 : 1) * dt) / 0.15);
      const o = I.fade >= 1 ? '' : I.fade.toFixed(3);
      ins.style.opacity = o; worldEl.style.opacity = o;
      I.print.el.style.transform = '';
      if (I.print.band) I.print.band.style.opacity = '';
      room.style.opacity = '1';
      if (live() && !Ground.pours.has(I.key)) {
        unpour(/^inspect-/);
        pour(I.key, { card: I.id, rect: I.at, r: Ground.far(I.at) + 200, front: 180, z: I.n, ...optsOf(I.id) });
      }
      if (I.closing && I.fade <= 0) { finish(); return false; }
      return I.fade > 0 && I.fade < 1;
    }
    // a step prints the next card and its sheet together, so the two never disagree; a lift still being built
    // finishes first
    function step(id) {
      while (I.jobs.length) I.jobs.shift()(); snd('card.step');
      const { cards } = G;
      cards[I.id].el.style.visibility = '';
      I.from = G.cardRect(id);
      G.fill(id);
      G.sheet(id);
      cards[id].el.style.visibility = 'hidden';
      I.key = 'inspect-' + ++I.n;
      I.pw = RM() ? 1 : 0;
      I.p = { x: 1, v: 0 };
      G.stepped(id);
      M.add(tick);
    }
    // a close drops what the lift had not built yet; one before the copy showed has nothing to undo
    function close(fromPop) {
      if (!I.id || I.closing) return;
      if (!I.shown) { finish(); return; }
      I.jobs = []; snd('card.close');
      I.closing = true; I.to = 0;
      I.from = G.cardRect(I.id);
      ins.classList.remove('open');
      G.leaving(fromPop);
      // the page behind stays inert while the card flies home (inert shows nothing): each piece that wakes repaints its
      // part of the page, so the close's own frames carry none of it; it wakes once the card has landed (finish)
      M.add(tick);
    }
    function finish() {
      const id = I.id;
      unpour(/^inspect-/);
      Ground.remove('lens');
      insCard.replaceChildren();
      ins.hidden = true;
      ins.dataset.side = 'front';
      ins.style.opacity = ''; worldEl.style.opacity = ''; room.style.opacity = '';
      I.id = null; I.print = null; I.closing = false; I.jobs = []; I.shown = false;
      // the card shows in its pocket and the pocket and #behind wake in the same frame (one repaint of the pocket), the rest
      // of the page a piece at a time in idle time after it
      if (id) { G.cards[id].el.style.visibility = ''; G.inert(false, id, true); }
      // the page scrolls again on the next frame and takes back its focus on the one after, each a frame
      // of its own; a lens opened meanwhile keeps both
      after(1, () => { if (!I.id) root.classList.remove('inspecting'); });
      if (id) after(2, () => { if (!I.id) G.closed(id); });
    }
    function after(n, fn) { let k = 0; M.add(() => { if (++k < n) return true; fn(); return false; }); }
    // The lens is printed once at idle after boot, unseen, so the first lift pays for no first-time work (its
    // style, layout, type shaping, code paths and canvas): the first card's copy and sheet are written into
    // the closed lens and its print drawn on the next frame, then the copy and the print go. The sheet stays,
    // as it does after a close.
    let lensWarm = false;
    function warmLens() {
      if (lensWarm || I.id || G.ritual || !ins.hidden) return;
      lensWarm = true;
      const id = Object.keys(G.cards)[0];
      G.fill(id, { hi: false }); // the rest cut: an unseen print fetches nothing new
      G.sheet(id);
      insCard.getBoundingClientRect();
      // and shown once inside this task at opacity 0, so the style of a shown lens is computed once too; no
      // frame paints it, and nothing in it can take focus between the two lines
      ins.style.opacity = '0'; ins.hidden = false; getComputedStyle(insCard).visibility;
      ins.hidden = true; ins.style.opacity = ''; getComputedStyle(insCard).visibility;
      I.id = null; I.print = null;
      if (live() && Ground.driver) Ground.driver();
      after(2, () => { if (I.id) return; Ground.remove('lens'); insCard.replaceChildren(); });
    }

    return { printOf, measure, size, wake, aim, rest, fly, deal, entry, openPack, ready, I, lift: { open, step, close, finish, tick } };
  };
})();
