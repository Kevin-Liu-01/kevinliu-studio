// The rules of the gallery. Pure and seeded: no DOM, no clock, no Math.random.
// The cards print the battle's roster (fighters.js, generated from it), so derive() reads the
// battle's stats and cost and never recomputes them. The gallery needs derive, teamCost, validTeam,
// rivalHand, matchup and rng; the match itself is the battle's (../../r2/battle-final/broadcast).
// Works as a classic <script> (globalThis.Engine) and as a CommonJS module.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------- seeded random (mulberry32, identical in every JS runtime) ----------
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Python's round(): halves go to the even neighbour, so the study's numbers reproduce.
  function roundHalfEven(x) {
    const f = Math.floor(x), d = x - f;
    if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return d > 0.5 ? f + 1 : f;
  }

  // ---------- stats and cost are the battle roster's ----------
  // Percentile rank within the roster: 0 is the least, 1 the most, ties share the mean rank.
  function percentile(values) {
    const order = values.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const out = new Array(values.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      const mean = (i + j) / 2;
      for (let k = i; k <= j; k++) out[order[k][1]] = values.length > 1 ? mean / (values.length - 1) : 1;
      i = j + 1;
    }
    return out;
  }

  const total = (s) => s.hp / 2.5 + s.atk + s.def + s.spd;

  // Each card's stats, total and cost as the battle roster prints them, plus each fact's rank,
  // the input to the battle's rule stat = floor + span x rank (tools/test-data.mjs proves it).
  function derive(rules, fighters) {
    const byId = {};
    const ranks = {};
    for (const r of Object.values(rules.stats)) ranks[r.fact] = percentile(fighters.map((f) => f.facts[r.fact].value));
    fighters.forEach((f, i) => {
      const rank = {};
      for (const fact of Object.keys(ranks)) rank[fact] = ranks[fact][i];
      byId[f.id] = { stats: f.stats, rank, total: f.total, cost: f.cost };
    });
    return byId;
  }

  function teamCost(rules, fighters, ids) {
    const byId = Object.fromEntries(fighters.map((f) => [f.id, f]));
    return ids.reduce((s, id) => s + byId[id].cost, 0);
  }

  function validTeam(rules, fighters, ids) {
    return ids.length === rules.team.size && new Set(ids).size === ids.length && teamCost(rules, fighters, ids) <= rules.team.budget;
  }

  // ---------- the discipline ring: 1.5 against the next, 0.67 against the previous ----------
  function matchup(ring, attack, defenders) {
    const a = ring.indexOf(attack);
    let m = 1;
    for (const d of defenders) {
      const i = ring.indexOf(d);
      if (i === (a + 1) % ring.length) m *= 1.5;
      else if (i === (a - 1 + ring.length) % ring.length) m *= 0.67;
    }
    return Math.round(m * 1000) / 1000;
  }

  // ---------- the rival ----------
  // A rival team within the budget, chosen from the seed among the cards not in your team.
  function rivalHand(rules, fighters, exclude, seed) {
    const d = derive(rules, fighters);
    const pool = fighters.filter((f) => !exclude.includes(f.id)).map((f) => f.id);
    const random = rng((seed ^ 0x9e3779b9) >>> 0);
    for (let tries = 0; tries < 500; tries++) {
      const bag = pool.slice();
      const pick = [];
      while (pick.length < rules.team.size && bag.length) pick.push(bag.splice(Math.floor(random() * bag.length), 1)[0]);
      const cost = pick.reduce((s, id) => s + d[id].cost, 0);
      if (pick.length === rules.team.size && cost <= rules.team.budget && cost >= rules.team.budget - 2) return pick;
    }
    return pool.slice(0, rules.team.size);
  }

  return { rng, percentile, derive, total, teamCost, validTeam, matchup, rivalHand };
});
