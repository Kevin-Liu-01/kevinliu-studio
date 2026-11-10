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
