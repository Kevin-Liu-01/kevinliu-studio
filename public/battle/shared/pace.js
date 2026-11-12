// The battle's pace (round 5): one clock for every moving part, a speed setting, and each move's timeline.
// A classic script that runs before the kit, so every later read of time goes through it. At rate r the page's clock
// (performance.now and every animation frame's time) runs r times as fast; every pending timer waits in scene time
// (re-armed whenever the rate changes); every Web Animation and CSS animation plays at r; the stage's and the board's
// videos play at r times the rate the scene asks for. Nothing in the 108 scene files changes: the whole battle keeps
// its proportions and only its tempo moves. Sound, the tooltips' previews and anything marked [data-real-time] keep
// real time. Loading waits use battlePace.realTimeout, never scene time.
(function () {
  'use strict';
  var KEY = 'battle-speed';
  var SPEEDS = [1, 1.5, 2];
  var realNow = performance.now.bind(performance);
  var realRaf = window.requestAnimationFrame.bind(window);
  var realTimeout = window.setTimeout.bind(window);
  var realClear = window.clearTimeout.bind(window);
  var realAnimate = Element.prototype.animate;
  var chosen = 1;
  try { var saved = Number(localStorage.getItem(KEY)); if (SPEEDS.indexOf(saved) >= 0) chosen = saved; } catch (e) { /* memory only */ }
  var rate = chosen, anchorReal = realNow(), anchorVirt = anchorReal, manual = false, rushing = false;
  function now() { return anchorVirt + (realNow() - anchorReal) * rate; }
  performance.now = now;
  // a frame's own time, mapped onto the scene clock (never backwards), so every callback in one frame sees one stamp
  var lastFrame = 0;
  window.requestAnimationFrame = function (cb) {
    return realRaf(function (ts) { var v = manual ? anchorVirt : anchorVirt + (ts - anchorReal) * rate; lastFrame = v = Math.max(lastFrame, Math.min(v, now())); cb(v); });
  };

  // ---------------------------------------------------------------- timers, in scene time
  // Every timer is kept with the scene time it falls due. A rate change re-arms each one for what is left of it; a
  // frozen clock (the recorder) arms none and step() runs them in order. An interval is a chain of such timers.
  var timers = new Map(), nextId = 1e6;
  function arm(t) {
    if (t.real) realClear(t.real);
    t.real = manual ? 0 : realTimeout(function () { fire(t); }, Math.max(0, (t.due - now()) / rate));
  }
  function fire(t) {
    if (!timers.has(t.id)) return;
    // an interval never catches up on periods a long frame swallowed (as the browser's own does not)
    if (t.every) { t.due = Math.max(t.due + t.every, now() + t.every * 0.5); arm(t); } else timers.delete(t.id);
    // an error reaches the page as the browser's own timers would report it, once (never back through this registry)
    try { t.fn.apply(window, t.a); } catch (e) { if (typeof reportError === 'function') reportError(e); else realTimeout(function () { throw e; }, 0); }
  }
  function add(fn, ms, a, every) {
    // a timer set for a day or more (a library's never-mind cap) never fires: keep it out of the registry
    if (!every && Number(ms) >= 1e8) return ++nextId;
    if (typeof fn !== 'function') { var src = String(fn); fn = function () { (0, eval)(src); }; }
    var t = { id: ++nextId, fn: fn, a: a, due: now() + Math.max(0, Number(ms) || 0), every: every ? Math.max(4, Number(ms) || 0) : 0, real: 0 };
    timers.set(t.id, t);
    arm(t);
    return t.id;
  }
  function clear(id) { var t = timers.get(id); if (t) { realClear(t.real); timers.delete(id); } else realClear(id); }
  window.setTimeout = function (fn, ms) { return add(fn, ms, Array.prototype.slice.call(arguments, 2), false); };
  window.setInterval = function (fn, ms) { return add(fn, ms, Array.prototype.slice.call(arguments, 2), true); };
  window.clearTimeout = clear;
  window.clearInterval = clear;

  // ---------------------------------------------------------------- what keeps real time, what follows the clock
  /** Only the battle's own moving media follow the clock: the stage's scene footage and the board. */
  var follows = function (n) { return !!(n && n.closest && n.closest('#stage, #board, .hud, .cutin, .mcall') && !n.closest('.tip, [data-real-time]')); };
  var keepsTime = function (n) { return !!(n && n.closest && n.closest('.tip, [data-real-time]')); };
  // a video's rate as the scene asks for it (the kit's own sync reads and writes this), times the clock's
  var mediaRate = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    configurable: true, enumerable: true,
    get: function () { return this.__want !== undefined ? this.__want : mediaRate.get.call(this); },
    set: function (v) { this.__want = v; mediaRate.set.call(this, clampRate(follows(this) && !manual ? v * rate : v)); },
  });
  // Chrome refuses a rate outside [1/16, 16]; the scene's own rate is kept as asked
  function clampRate(r) { return Math.min(16, Math.max(0.0625, r)); }
  // a new source resets the element's rate to 1: put the scene's rate times the clock's back at once
  addEventListener('loadstart', function (e) { var v = e.target; if (v && v.setAttribute && follows(v)) mediaRate.set.call(v, clampRate((v.__want !== undefined ? v.__want : 1) * (manual ? 1 : rate))); }, true);
  function retimeMedia() {
    var media = document.querySelectorAll('#stage video, #board video');
    for (var j = 0; j < media.length; j++) { var m = media[j]; mediaRate.set.call(m, clampRate((m.__want !== undefined ? m.__want : 1) * (manual ? 1 : rate))); }
  }
  addEventListener('play', function (e) { var v = e.target; if (manual && v && v.pause && follows(v)) { v.pause(); stilled.add(v); } }, true);
  // animations: started at the clock's rate, scaled relatively when it changes (a reversed or custom rate keeps its sign)
  var scaled = new WeakMap();
  function track(a, target) {
    if (keepsTime(target)) return;
    if (manual) { if (!frozen.has(a)) { a.pause(); frozen.add(a); } return; }
    if (!scaled.has(a)) { scaled.set(a, rate); if (rate !== 1) a.playbackRate = a.playbackRate * rate; }
  }
  Element.prototype.animate = function () { var a = realAnimate.apply(this, arguments); track(a, this); return a; };
  // only the element's own animations (an event fires per element; walking a container's subtree on each is costly)
  function tune(target) { if (target && target.getAnimations) { var list = target.getAnimations(); for (var i = 0; i < list.length; i++) if (!scaled.has(list[i])) track(list[i], target); } }
  addEventListener('transitionrun', function (e) { tune(e.target); }, true);
  addEventListener('animationstart', function (e) { tune(e.target); }, true);
  function retime(r) {
    anchorVirt = now(); anchorReal = realNow(); rate = r;
    var all = document.getAnimations ? document.getAnimations() : [];
    for (var i = 0; i < all.length; i++) {
      var a = all[i], t = a.effect && a.effect.target;
      if (keepsTime(t)) continue;
      var was = scaled.get(a) || 1;
      if (was !== r) { a.playbackRate = a.playbackRate / was * r; scaled.set(a, r); }
    }
    retimeMedia();
    timers.forEach(arm);
  }

  // ---------------------------------------------------------------- the speed setting and the scene's tail
  var listeners = [];
  function setSpeed(s) {
    if (manual || SPEEDS.indexOf(s) < 0 || s === chosen) return;
    chosen = s; rushing = false;
    try { localStorage.setItem(KEY, String(s)); } catch (e) { /* memory only */ }
    retime(s);
    document.documentElement.dataset.speed = String(s);
    listeners.forEach(function (f) { f(s); });
  }
  document.documentElement.dataset.speed = String(chosen);
  /** A scene's wind-up and its tail play faster than its contact: rush(f) runs the clock at f times the setting until
   *  unrush() (the impact, the scene's end). Not persisted, never under a frozen clock. */
  function rush(f) { if (manual || (rushing && rate === chosen * f)) return; rushing = true; retime(chosen * f); }
  function unrush() { if (!rushing) return; rushing = false; if (!manual) retime(chosen); }

  /** Each move's one timeline, in milliseconds of scene time (the speed divides them all). A scene's own impact
   *  (900 ms or later on a first use) is the wind-up's end; everything after it is the contact's, in this order:
   *  the hit (hit-stop and flash, one frame), the number on the struck card at once, the multiplier call-out with it,
   *  the struck card's reaction, the HP ghost's drain, and the log line last. Measured against the handheld series'
   *  order (number and effectiveness after the drain there) and the online simulator's (with the drop): the number and
   *  the multiplier land with the contact so the eye has one place to look, and the log line follows the drain. */
  var TIMELINE = {
    windup: { full: [900, 1520], short: [380, 380] }, // the scene's own impact time, from its compile (tools/timings.mjs)
    hit: 0,          // the contact frame: the Director lands the outcome events here
    number: 0,       // the number shows whole on the card at the contact (no count-up while readable)
    multiplier: 0,   // the green or red ring call-out arrives with the number
    reaction: [0, 260], // the struck card's recoil (the Mat 260, the Arena 340)
    drain: [180, 630],  // the HP ghost waits 180, then drains in 450
    log: 120,        // the log line after the number has been read
    logGap: 140,     // two log lines never arrive closer than this
    windupRush: 1.35, // a first use's build plays at 1.35x the setting...
    windupEase: 250,  // ...until this long before its impact, so the last beat before the contact keeps its weight
    tail: 320,       // the number holds this long at the setting's pace, then the rest of the scene plays at tailRush
    tailRush: 2,
    settle: [0, 260],   // the board's landing before the next shot may start
  };

  // ---------------------------------------------------------------- the recorder's frozen clock (never used in play)
  /** freeze() stops scene time: timers wait, animations hold, the stage's videos pause. step(ms) moves it on by ms,
   *  runs the timers that fall due in order, and moves every animation and video with it. thaw() returns to play.
   *  The recorder holds exactly what it paused (`frozen`, `stilled`): an animation the page held itself (a dialog)
   *  stays held, and an animation a step carries to its end is finished there, so whatever awaits it goes on. (A
   *  paused animation stepped past its end leaves document.getAnimations() and was never played again: the shot that
   *  awaited it, a camera's return or a knockout's fall, hung for good. fixes-1 I4.) */
  var frozen = new Set(), stilled = new Set();
  function freeze() {
    if (manual) return;
    anchorVirt = now(); anchorReal = realNow(); manual = true; rate = 0; rushing = false;
    timers.forEach(function (t) { realClear(t.real); t.real = 0; });
    document.getAnimations().forEach(function (a) { if (!keepsTime(a.effect && a.effect.target) && a.playState === 'running') { a.pause(); frozen.add(a); } });
    var media = document.querySelectorAll('#stage video, #board video');
    for (var j = 0; j < media.length; j++) if (!media[j].paused) { media[j].pause(); stilled.add(media[j]); }
  }
  function endOf(an) { try { var c = an.effect && an.effect.getComputedTiming(); return c ? c.endTime : Infinity; } catch (e) { return Infinity; } }
  function step(ms) {
    if (!manual) return;
    var target = anchorVirt + ms;
    for (;;) {
      var next = null;
      timers.forEach(function (t) { if (t.due <= target && (!next || t.due < next.due)) next = t; });
      if (!next) break;
      anchorVirt = Math.max(anchorVirt, next.due);
      fire(next);
    }
    anchorVirt = target;
    // (also any the page started while frozen whose events the clock did not see)
    document.getAnimations().forEach(function (an) { if (!keepsTime(an.effect && an.effect.target) && an.playState === 'running') { an.pause(); frozen.add(an); } });
    frozen.forEach(function (an) {
      if (an.playState === 'finished' || an.playState === 'idle') { frozen.delete(an); return; }
      var r = an.playbackRate || 1, t = (an.currentTime || 0) + ms * r, end = endOf(an);
      if (r > 0 && Number.isFinite(end) && t >= end) { frozen.delete(an); try { an.finish(); } catch (e) { an.currentTime = end; } return; }
      an.currentTime = Math.max(0, t);
    });
    var media = document.querySelectorAll('#stage video, #board video');
    for (var j = 0; j < media.length; j++) { var v = media[j]; if (!v.paused) { v.pause(); stilled.add(v); } if (v.readyState > 0) v.currentTime = Math.min(v.duration || 1e9, v.currentTime + (ms / 1000) * (v.__want || 1)); }
  }
  function thaw() {
    if (!manual) return;
    manual = false; anchorReal = realNow(); rate = chosen;
    timers.forEach(arm);
    frozen.forEach(function (a) {
      if (a.playState !== 'paused') return;
      var was = scaled.get(a) || 1;
      if (was !== rate) { a.playbackRate = a.playbackRate / was * rate; scaled.set(a, rate); }
      a.play();
    });
    frozen.clear();
    // a video the recorder paused plays on unless its scene has ended it (or a step ran it to its end)
    stilled.forEach(function (v) { if (v.isConnected && !v.hidden && !v.ended && v.closest('[data-playing]')) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
    stilled.clear();
    retimeMedia();
  }

  window.battlePace = {
    SPEEDS: SPEEDS, TIMELINE: TIMELINE,
    get speed() { return chosen; },
    get rate() { return rate; },
    setSpeed: setSpeed, rush: rush, unrush: unrush,
    onSpeed: function (f) { listeners.push(f); },
    freeze: freeze, thaw: thaw, step: step, get manual() { return manual; },
    now: now, realNow: realNow, realTimeout: realTimeout, realRaf: realRaf,
  };
})();
