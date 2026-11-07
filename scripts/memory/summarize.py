import json, sys, statistics as st
from collections import defaultdict

def load(f):
    rows = defaultdict(list); ends = {}
    for l in open(f):
        d = json.loads(l)
        if d.get('end'): ends[d['profile']] = d; continue
        rows[d['profile']].append(d)
    return rows, ends

def page(u):
    u = (u or '').split('#')[0].split('?')[0]
    return '/cards/*' if u.startswith('/cards/') else u

for f in sys.argv[1:]:
    rows, ends = load(f)
    for prof, rs in rows.items():
        rs = [r for r in rs if r.get('contentMB')]
        if not rs: continue
        T = max(r['t'] for r in rs)
        first = [r for r in rs if r['t'] <= 60]; last = [r for r in rs if r['t'] >= T - 60]
        def peak(k): return max((r.get(k) or 0) for r in rs)
        byp = defaultdict(list)
        for r in rs: byp[page(r['url'])].append(r)
        print(f"{f.split('/')[-1]} {prof}: samples {len(rs)} span {T}s loops {ends.get(prof,{}).get('loops')} crashed {ends.get(prof,{}).get('crashed')} visited {ends.get(prof,{}).get('visited')}")
        print(f"  peak content {peak('contentMB')} MB, peak gpu {peak('gpuMB')} MB, peak canvas {peak('canvasMB')} MB, peak GL {peak('glLive')}, peak tex {peak('texMB')} MB, peak img {peak('imgMB')} MB, peak videos loaded {peak('videoLoaded')}, playing {peak('playing')}, nproc max {max(tuple(r.get('nproc') or [0,0]) for r in rs)}")
        mc = lambda a, k: round(st.median([r[k] for r in a]), 0) if a else None
        print(f"  median content first 60 s {mc(first,'contentMB')} last 60 s {mc(last,'contentMB')}; gpu {mc(first,'gpuMB')} -> {mc(last,'gpuMB')}")
        for p, a in sorted(byp.items()):
            print(f"   {p:14} n={len(a):3} content med {mc(a,'contentMB')} max {max(r['contentMB'] for r in a)}  gpu med {mc(a,'gpuMB')} max {max(r['gpuMB'] for r in a)}  canvas max {max((r.get('canvasMB') or 0) for r in a)}  gl max {max((r.get('glLive') or 0) for r in a)}  img max {max((r.get('imgMB') or 0) for r in a)}  vid {max((r.get('videoLoaded') or 0) for r in a)}")
