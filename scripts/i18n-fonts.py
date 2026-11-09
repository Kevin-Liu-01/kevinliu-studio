#!/usr/bin/env python3
"""The faces a translated page needs beyond the site's Latin subset (public/fonts/katagami-sans-site.woff2), cut from
Kevin's own Katagami family (~/repos/Katagami, OFL) to exactly the characters the translations print:

  public/fonts/katagami-sans-ext.woff2   accented Latin and punctuation for es, fr, de and pt (Katagami Sans)
  public/fonts/katagami-cjk-ja.woff2     Japanese (Katagami CJK JP)
  public/fonts/katagami-cjk-ko.woff2     Korean (Katagami CJK KR)
  public/fonts/katagami-cjk-zh.woff2     Simplified Chinese (Katagami CJK SC)

Each keeps the weight axis, so bold stays drawn, not faked. src/i18n/fonts.json records the characters each face holds
and its unicode-range; Base.astro declares the faces from it and scripts/verify-build.mjs fails a page that prints a
character no face holds. Run after `pnpm i18n:translate` (it reads src/i18n/<locale>/*.json):

  python3 scripts/i18n-fonts.py [path to the Katagami repo]
"""
import json
import os
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KATAGAMI = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/repos/Katagami')
I18N = os.path.join(ROOT, 'src/i18n')
FONTS = os.path.join(ROOT, 'public/fonts')

# characters the battle page prints from its own scripts in every language (keys, scores) are Latin already
BASE = set(chr(c) for c in TTFont(os.path.join(FONTS, 'katagami-sans-site.woff2')).getBestCmap())


# each language's own name, as the language key and a translated twin's first line print it (src/i18n/locales.mjs)
import re
NAMES = dict(re.findall(r"code: '(\w+)'.*?name: '([^']+)'", open(os.path.join(I18N, 'locales.mjs'), encoding='utf-8').read()))
GT = dict(re.findall(r"code: '(\w+)'.*?gt: '([^']+)'", open(os.path.join(I18N, 'locales.mjs'), encoding='utf-8').read()))


def text(*locales):
    out = set()
    for code, gt in GT.items():
        if gt in locales:
            out |= set(NAMES[code])
    for loc in locales:
        d = os.path.join(I18N, loc)
        for name in sorted(os.listdir(d)):
            if name.endswith('.json'):
                out |= set(open(os.path.join(d, name), encoding='utf-8').read())
    return out


def ranges(chars):
    cps = sorted(ord(c) for c in chars)
    out, start, prev = [], None, None
    for cp in cps:
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            out.append((start, prev))
            start = prev = cp
    if start is not None:
        out.append((start, prev))
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in out)


def cut(src, chars, out):
    font = TTFont(src)
    have = set(chr(c) for c in font.getBestCmap())
    missing = sorted(c for c in chars if c not in have)
    keep = ''.join(sorted(c for c in chars if c in have))
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.drop_tables += ['meta']
    s = subset.Subsetter(opts)
    s.populate(text=keep)
    s.subset(font)
    font.flavor = 'woff2'
    font.save(os.path.join(FONTS, out))
    return keep, missing


def main():
    # the site's own subset, which every page loads: the guard counts its characters as held
    faces = {'site': {'file': '/fonts/katagami-sans-site.woff2', 'locales': [], 'range': '', 'chars': ''.join(sorted(BASE))}}
    # whitespace and controls never need a glyph of their own
    skip = {'\n', '\r', '\t'}
    latin = {c for c in text('es', 'fr', 'de', 'pt-BR') if c not in BASE and c not in skip and ord(c) < 0x2E80}
    jobs = [
        ('ext', ['es', 'fr', 'de', 'pt'], 'sans/KatagamiSans[wght].ttf', 'katagami-sans-ext.woff2', latin),
    ]
    for code, gt, cjk in (('ja', 'ja', 'JP'), ('ko', 'ko', 'KR'), ('zh', 'zh-CN', 'SC')):
        chars = {c for c in text(gt) if c not in BASE and c not in skip and c not in latin}
        jobs.append((code, [code], f'cjk/KatagamiCJK{cjk}[wght].ttf', f'katagami-cjk-{code}.woff2', chars))
    for key, codes, src, out, chars in jobs:
        keep, missing = cut(os.path.join(KATAGAMI, 'fonts', src), chars, out)
        size = os.path.getsize(os.path.join(FONTS, out))
        faces[key] = {'file': f'/fonts/{out}', 'locales': codes, 'range': ranges(keep), 'chars': keep}
        print(f'{out}: {len(keep)} characters, {size / 1024:.1f} KB' + (f'; not in the face: {"".join(missing)}' if missing else ''))
    with open(os.path.join(I18N, 'fonts.json'), 'w', encoding='utf-8') as f:
        json.dump(faces, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
