// Cards whose repository a visitor cannot open (GitHub answers 404 without a sign-in, checked 2026-11-08). The rounds
// still list them, so the card pages, twins and JSON-LD (src/lib/cards.ts) and the card faces' pinned-commit links
// (scripts/sync.mjs, markup.js NOLINK) link only the rest; scripts/check-seo.mjs fails when one of the rest stops
// answering 200. Change this when a repository goes public.
export const CLOSED = ['agent-pets', 'bday-land', 'powerlifting', 'elo', 'kevin-wiki', 'sandbox-arena', 'dedalus-terminal'];
