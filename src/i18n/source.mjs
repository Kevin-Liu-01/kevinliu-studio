// The English source of src/i18n/en/content.json: Kevin's bio and facts (src/lib/site.ts) and every card's own words
// (the synced cards, src/lib/cards.ts). scripts/i18n-extract.mjs writes it for General Translation; the build computes
// it again, so a card whose words changed since the last translation prints in English until it is translated again.
// Product names, move names, trait names, receipts and code are never in it: a move line names its move as {move}.
// The English home's title, lead and description (src/lib/site.ts, Kevin 2026-11-13) as templates: his name is {name} and
// the open-source projects are {projects}, so no translation can rename either. The description is the lead plus one
// sentence naming the projects; a change of that shape stops the build here rather than ship a half-translated line.
export function homeParts({ NAME, HOME_TITLE, HOME_LEAD, HOME_DESCRIPTION }) {
  const named = (s, what) => { if (!s.includes(NAME)) throw new Error(`i18n: ${what} no longer names ${NAME}`); return s.replaceAll(NAME, '{name}'); };
  if (!HOME_DESCRIPTION.startsWith(HOME_LEAD + ' ')) throw new Error('i18n: HOME_DESCRIPTION no longer opens with HOME_LEAD');
  const m = /^([^:]+: )(.+)\.$/.exec(HOME_DESCRIPTION.slice(HOME_LEAD.length + 1));
  if (!m) throw new Error('i18n: HOME_DESCRIPTION no longer ends "<label>: <projects>."');
  return { title: named(HOME_TITLE, 'HOME_TITLE'), lead: named(HOME_LEAD, 'HOME_LEAD'), openSource: `${m[1]}{projects}.`, projects: m[2] };
}

export function source({ fighters, rules, whatOf, answerOf, moveLine, BIO, DESCRIPTION, ABOUT, FACTS, QA, ...site }) {
  const run = (r) => (typeof r === 'string' ? r : `[${r[0]}](${r[1]})`);
  const cards = {};
  for (const f of fighters) {
    cards[f.id] = {
      what: whatOf(f),
      answer: answerOf(f),
      ...(f.trait ? { rule: f.trait.rule } : {}),
      // each move's feature alone, as the battle's move panel and tooltips print it (card.<id>.move.<name>.feature)
      features: f.moves.map((mv) => mv.feature),
      moves: f.moves.map((mv) => {
        const line = moveLine(mv);
        if (!line.startsWith(mv.name + ' ')) throw new Error(`${f.id}: the move line does not open on ${mv.name}`);
        return `{move}${line.slice(mv.name.length)}`;
      }),
    };
  }
  return {
    bio: BIO,
    description: DESCRIPTION,
    home: (({ title, lead, openSource }) => ({ title, lead, openSource }))(homeParts(site)),
    about: ABOUT.map((runs) => runs.map(run).join('')),
    facts: [...FACTS],
    qa: QA.map(([q, a]) => ({ q, a })),
    ringRule: rules.ringRule,
    cards,
  };
}

// The battle's own interface words: the rounds' table (r4/play shared/strings.js, synced to public/battle/shared) plus
// each trainer's title and quotes from its roster, as the rounds' tools/strings-export.mjs writes them. The tab titles
// stay out: BattlePage.astro keeps "Battle | Kevin Liu" in the page's language.
// The battle's own card text joins it where the battle prints it outside the card face (r4/play hud.js cardMoveText and
// the trait tooltip read `card.<id>.move.<move name>.feature` and `card.<id>.trait.rule` before their English): every
// trait's rule as the battle words it (the engine's, not the card's), every move the cards do not have by name (the
// battle prints the card's own feature for a move it shares), and the moves of each form (Princeton TD's towers). A move
// line ends with a full stop, as the battle's English does. `fighters` are the cards (src/lib/cards.ts).
export async function battleSource(root, fighters = []) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const file = path.join(root, 'public/battle/shared/strings.js');
  if (!fs.existsSync(file)) return {};
  const { EN } = await import(/* @vite-ignore */ pathToFileURL(file).href);
  const table = Object.fromEntries(Object.entries(EN).filter(([k]) => !k.startsWith('title.')));
  const roster = JSON.parse(fs.readFileSync(path.join(root, 'public/battle/media/trainers/roster.json'), 'utf8'));
  for (const t of roster.trainers) {
    table[`leader.${t.id}.title`] = t.title;
    for (const [k, v] of Object.entries(t.quotes ?? {})) table[`leader.${t.id}.quote.${k}`] = v;
  }
  const stop = (t) => { t = String(t ?? '').trim(); return t && !/[.!?…]$/.test(t) ? `${t}.` : t; };
  const cards = Object.fromEntries(fighters.map((f) => [f.id, f]));
  const engineFile = path.join(root, 'vendor/battle/vendor/engine.js');
  if (fs.existsSync(engineFile)) {
    const { FIGHTERS } = await import(/* @vite-ignore */ pathToFileURL(engineFile).href);
    for (const f of FIGHTERS) {
      if (f.trait?.rule) table[`card.${f.id}.trait.rule`] = f.trait.rule;
      for (const m of f.moves) if (m.feature && !cards[f.id]?.moves.some((x) => x.name === m.name)) table[`card.${f.id}.move.${m.name}.feature`] = stop(m.feature);
    }
  }
  const formsFile = path.join(root, 'public/battle/shared/forms.js');
  if (fs.existsSync(formsFile)) {
    const { FORMS } = await import(/* @vite-ignore */ pathToFileURL(formsFile).href);
    for (const [id, card] of Object.entries(FORMS)) for (const form of Object.values(card.forms ?? {})) for (const level of Object.values(form.moves ?? {})) for (const m of level) {
      if (m.feature) table[`card.${id}.move.${m.name}.feature`] = stop(m.feature);
    }
  }
  return table;
}
