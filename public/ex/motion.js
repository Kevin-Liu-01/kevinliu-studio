// One motion module, one rAF loop (SPEC 7). Every moving thing on the page is a ticker here: the
// grounds, the hovered card's springs, the lift, the rituals. Springs are critically damped unless
// marked zeta 0.9; timelines are pure functions of their time, so any of them can jump to its end.
//   Motion.add(fn)            fn(dt, now) runs every frame while it returns true
//   Motion.spring(s, to, ms)  advance s = { x, v } toward `to`, settling in about `ms`
//   Motion.timeline(dur, render, done, t0)  render(t) on each frame from t0, t on the page's clock; .finish() jumps
//                             to the end; .over is how far past dur its last frame landed
//   Motion.speed              1, or 0.1 to judge a sequence at 10% (?speed=0.1)
(function (root) {
  'use strict';
  const q = new URLSearchParams(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const tickers = new Set();
  let raf = 0, last = 0, frameNow = -1; // frameNow: the running frame's time, inside a frame only
  const M = {
    speed: Number(q.get('speed')) || 1,
    get RM() { return reduce.matches || q.has('reduced'); },
    frames: [],   // frame intervals, recorded only while M.recording is true
    recording: false,
    add(fn) { tickers.add(fn); kick(); return () => tickers.delete(fn); },
    remove(fn) { tickers.delete(fn); },
    kick,
  };
  function frame(now) {
    raf = 0;
    const real = last ? (now - last) / 1000 : 1 / 60;
    if (M.recording && last) M.frames.push(now - last);
    last = now;
    const dt = Math.min(real, 0.05) * M.speed;
    frameNow = now;
    for (const fn of [...tickers]) {
      let more = false;
      try { more = fn(dt, now); } catch (e) { console.error(e); }
      if (!more) tickers.delete(fn);
    }
    frameNow = -1;
    if (tickers.size) { if (!raf) raf = requestAnimationFrame(frame); }
    else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  // Settling time to about 1% of the distance: omega = 6.64 / T critical, 6.0 / T at zeta 0.9.
  function spring(s, to, ms, zeta = 1, dt) {
    const w = (zeta >= 1 ? 6.64 : 6.0) / (ms / 1000);
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -w * w * (s.x - to) - 2 * zeta * w * s.v;
      s.v += a * h;
      s.x += s.v * h;
    }
    return !settled(s, to);
  }
  function settled(s, to, e = 0.0015) {
    if (Math.abs(s.x - to) < e && Math.abs(s.v) < e * 10) { s.x = to; s.v = 0; return true; }
    return false;
  }
  // A timeline keeps the page's clock, not the frame count: it starts at the time of the frame it is made in (or of
  // the event, outside a frame) and each step is the time since its last, so a stalled frame never stretches a
  // sequence. One that follows another starts where the first ended, its .over past its end (a pack's reveal after
  // its tear), so a chain of sequences lands on the time it adds up to, not a frame later per link. Springs keep
  // the clamped dt, which keeps them stable.
  function timeline(dur, render, done, t0 = 0) {
    const T = { t: Math.min(dur, t0), dur, over: 0, live: true, finish, cancel };
    let at = frameNow >= 0 ? frameNow : performance.now();
    function tick(dt, now) {
      if (!T.live) return false;
      const step = now > at ? (now - at) * M.speed : 0;
      at = now;
      const t = T.t + step;
      T.t = Math.min(dur, t);
      render(T.t);
      if (t >= dur) { T.over = t - dur; T.live = false; if (done) done(); return false; }
      return true;
    }
    function finish() { if (!T.live) return; T.live = false; M.remove(tick); T.t = dur; render(dur); if (done) done(); }
    function cancel() { T.live = false; M.remove(tick); }
    render(T.t);
    M.add(tick);
    return T;
  }
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  // Named curves, one place. out: decelerate; io: symmetric; snap: the spring fallback curve.
  const ease = {
    out: (x) => 1 - Math.pow(1 - clamp(x), 3),
    io: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    in: (x) => Math.pow(clamp(x), 3),
    // critically damped step response, 99% at 1
    crit: (x) => { x = clamp(x) * 6.64; return 1 - (1 + x) * Math.exp(-x); },
  };
  Object.assign(M, { spring, settled, timeline, ease, clamp, lerp, smooth });
  // A window [a, b] of a timeline mapped to 0..1.
  M.win = (t, a, b) => clamp((t - a) / (b - a));
  root.Motion = M;
})(globalThis);
