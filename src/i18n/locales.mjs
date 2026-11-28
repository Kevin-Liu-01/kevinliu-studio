// The site's languages. English is the source and lives at the root; every other language lives under its code
// (/es/cards/turboslide). `lang` is the page's html lang and hreflang, `og` its og:locale, `name` what the switcher
// shows in that language, `gt` the locale General Translation translates into (gt.config.json). Typography: `cjk` a
// language whose sentences are counted in characters (the description budget), `stop` the full stop a sentence ends
// on, `gloss` what joins a name to what it is ("Turboslide. A browser…", "Turboslide：…").
export const DEFAULT = 'en';
export const LOCALES = [
  { code: 'en', lang: 'en', og: 'en_US', name: 'English', gt: 'en', cjk: false, stop: '.', gloss: '. ' },
  { code: 'es', lang: 'es', og: 'es_ES', name: 'Español', gt: 'es', cjk: false, stop: '.', gloss: '. ' },
  { code: 'fr', lang: 'fr', og: 'fr_FR', name: 'Français', gt: 'fr', cjk: false, stop: '.', gloss: '. ' },
  { code: 'de', lang: 'de', og: 'de_DE', name: 'Deutsch', gt: 'de', cjk: false, stop: '.', gloss: '. ' },
  { code: 'pt', lang: 'pt-BR', og: 'pt_BR', name: 'Português', gt: 'pt-BR', cjk: false, stop: '.', gloss: '. ' },
  { code: 'ja', lang: 'ja', og: 'ja_JP', name: '日本語', gt: 'ja', cjk: true, stop: '。', gloss: '：' },
  { code: 'ko', lang: 'ko', og: 'ko_KR', name: '한국어', gt: 'ko', cjk: true, stop: '.', gloss: ': ' },
  { code: 'zh', lang: 'zh-Hans', og: 'zh_CN', name: '简体中文', gt: 'zh-CN', cjk: true, stop: '。', gloss: '：' },
];
export const CODES = LOCALES.map((l) => l.code);
export const OTHER = CODES.filter((c) => c !== DEFAULT);
export const localeOf = (code) => LOCALES.find((l) => l.code === code) ?? LOCALES[0];
// a path in a language: '/' and '/cards' in English, '/es' and '/es/cards' in Spanish
export const lp = (code, p) => (code === DEFAULT ? p : p === '/' ? `/${code}` : `/${code}${p}`);
// a path with its language taken off, and that language
export function split(p) {
  const m = /^\/([a-z]{2})(?=\/|$)(.*)$/.exec(p);
  return m && OTHER.includes(m[1]) ? { code: m[1], path: m[2] || '/' } : { code: DEFAULT, path: p };
}
