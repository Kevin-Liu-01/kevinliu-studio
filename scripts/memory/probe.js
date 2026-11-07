// Init script: counts what a phone pays for in memory: canvas backing stores, WebGL contexts and textures, decoded
// images, videos, audio contexts and image bitmaps. Read with window.__mm().
(() => {
  if (window.__mm) return;
  const canvases = [];           // WeakRef<canvas|OffscreenCanvas> with kind
  const gls = [];                // WeakRef<gl ctx>
  const tex = new Map();         // texture -> bytes (alive until deleteTexture)
  const bound = new WeakMap();   // gl -> bound TEXTURE_2D
  let audio = [], bitmaps = 0, bitmapBytes = 0, glMade = 0, peakGL = 0;
  const wrapGetContext = (proto) => {
    const orig = proto.getContext;
    proto.getContext = function (type, ...rest) {
      const ctx = orig.call(this, type, ...rest);
      if (ctx && !this.__mmSeen) {
        this.__mmSeen = type;
        canvases.push({ ref: new WeakRef(this), type });
        if (/webgl/.test(type)) { gls.push(new WeakRef(ctx)); glMade++; }
      }
      return ctx;
    };
  };
  wrapGetContext(HTMLCanvasElement.prototype);
  if (self.OffscreenCanvas) wrapGetContext(OffscreenCanvas.prototype);
  for (const G of [self.WebGLRenderingContext, self.WebGL2RenderingContext].filter(Boolean)) {
    const P = G.prototype;
    const bt = P.bindTexture, ti = P.texImage2D, ts = P.texStorage2D, dt = P.deleteTexture;
    P.bindTexture = function (target, t) { if (target === this.TEXTURE_2D) bound.set(this, t); return bt.apply(this, arguments); };
    const dims = (a) => {
      if (a.length >= 8 && typeof a[3] === 'number' && typeof a[4] === 'number') return [a[3], a[4]];
      const s = a[a.length - 1];
      if (!s) return [0, 0];
      return [s.videoWidth || s.naturalWidth || s.width || 0, s.videoHeight || s.naturalHeight || s.height || 0];
    };
    P.texImage2D = function () { const t = bound.get(this); if (t && arguments[1] === 0) { const [w, h] = dims(arguments); tex.set(t, w * h * 4); } return ti.apply(this, arguments); };
    if (ts) P.texStorage2D = function (target, levels, fmt, w, h) { const t = bound.get(this); if (t) tex.set(t, w * h * 4 * (levels > 1 ? 1.34 : 1)); return ts.apply(this, arguments); };
    P.deleteTexture = function (t) { tex.delete(t); return dt.apply(this, arguments); };
  }
  for (const k of ['AudioContext', 'webkitAudioContext']) {
    const C = self[k];
    if (!C) continue;
    self[k] = new Proxy(C, { construct(T, args) { const c = new T(...args); audio.push(new WeakRef(c)); return c; } });
  }
  if (self.createImageBitmap) {
    const cib = self.createImageBitmap;
    self.createImageBitmap = function () { return cib.apply(this, arguments).then((b) => { bitmaps++; bitmapBytes += b.width * b.height * 4; return b; }); };
  }
  window.__mm = () => {
    let canvasBytes = 0, canvasLive = 0, canvasInDom = 0, glLive = 0, biggest = [0, 0, ''];
    for (const c of canvases) {
      const el = c.ref.deref();
      if (!el) continue;
      const px = el.width * el.height;
      if (!px) continue;
      canvasLive++;
      if (el.isConnected) canvasInDom++;
      canvasBytes += px * 4 * (/webgl/.test(c.type) ? 2 : 1);
      if (px > biggest[0] * biggest[1]) biggest = [el.width, el.height, c.type];
    }
    for (const g of gls) { const ctx = g.deref(); if (ctx && !ctx.isContextLost()) glLive++; }
    peakGL = Math.max(peakGL, glLive);
    let imgBytes = 0, imgs = 0;
    for (const i of document.images) if (i.complete && i.naturalWidth) { imgs++; imgBytes += i.naturalWidth * i.naturalHeight * 4; }
    const vids = [...document.querySelectorAll('video')];
    let texBytes = 0; for (const b of tex.values()) texBytes += b;
    const mem = performance.memory;
    return {
      canvasMB: +(canvasBytes / 2 ** 20).toFixed(1), canvasLive, canvasInDom, biggest: biggest.join('x'),
      glLive, glMade, peakGL, texMB: +(texBytes / 2 ** 20).toFixed(1), textures: tex.size,
      imgMB: +(imgBytes / 2 ** 20).toFixed(1), imgs,
      videos: vids.length, playing: vids.filter((v) => !v.paused && !v.ended).length, videoLoaded: vids.filter((v) => v.readyState >= 2).length,
      audio: audio.filter((r) => { const a = r.deref(); return a && a.state !== 'closed'; }).length,
      bitmaps, bitmapMB: +(bitmapBytes / 2 ** 20).toFixed(1),
      heapMB: mem ? +(mem.usedJSHeapSize / 2 ** 20).toFixed(1) : null,
      nodes: document.getElementsByTagName('*').length,
    };
  };
})();
