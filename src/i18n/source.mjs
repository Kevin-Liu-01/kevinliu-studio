// The English source of src/i18n/en/content.json: Kevin's bio and facts (src/lib/site.ts) and every card's own words
// (the synced cards, src/lib/cards.ts). scripts/i18n-extract.mjs writes it for General Translation; the build computes
// it again, so a card whose words changed since the last translation prints in English until it is translated again.
// Product names, move names, trait names, receipts and code are never in it: a move line names its move as {move}.
export function source({ fighters, rules, whatOf, answerOf, moveLine, BIO, DESCRIPTION, ABOUT, FACTS, QA }) {
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
export async function battleSource(root) {
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
  return table;
}
