// The one way this site patches the round HTML it prints (a view adding a Machine record, a translation, a fetch
// priority): each anchor must be found as often as the caller says (once, unless told), or the build stops and names
// the place and the anchor, so a change in markup.js can never quietly drop what the site adds. battle.ts's own copy
// moves here after the battle-026 sync (docs/entropy.md P4).
export function swap(text: string, find: string | RegExp, to: string, where: string, count: number | 'some' = 1): string {
  const re = typeof find === 'string' ? null : new RegExp(find.source, find.flags.includes('g') ? find.flags : `${find.flags}g`);
  const n = re ? (text.match(re) ?? []).length : text.split(find as string).length - 1;
  if (count === 'some' ? n < 1 : n !== count) throw new Error(`${where}: expected ${count === 'some' ? 'some' : count} of ${String(find).slice(0, 80)}, found ${n}`);
  return re ? text.replace(re, to) : text.split(find as string).join(to);
}
