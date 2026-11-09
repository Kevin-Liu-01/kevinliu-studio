// engine.js: bundled 2026-11-01T07:23:46.397Z from r3/battle with esbuild 0.28.2. Read-only copy; see SOURCES.md. Do not edit.

// ../../../../r3/battle/engine/src/roster.gen.ts
var RULES = {
  "ring": [
    "Infra",
    "Agent",
    "Data",
    "Game",
    "Shader",
    "Type",
    "Interface"
  ],
  "ringRule": "An attack is 1.5x against the next discipline on the ring and 0.67x against the previous one; every other pairing is 1x. Dual disciplines multiply.",
  "team": {
    "size": 3,
    "budget": 7
  },
  "costRule": "stat = floor + span x percentile rank of one fact within the roster (ties share the mean rank). HP 270 + 70 x rank(commits at the pinned SHA); ATK 95 + 35 x rank(GitHub stars, 2026-10-30); DEF 95 + 35 x rank(check files matching the proof glob at the pinned SHA); SPD 95 + 35 x rank(commits per active day). Cost from the stat total (HP / 2.5 + ATK + DEF + SPD): 500 or more costs 4, 475 to 499 costs 3, 445 to 474 costs 2, below 445 costs 1; a team of three spends at most 7.",
  "generated": "2026-10-30"
};
var FIGHTERS = [
  {
    "id": "turboslide",
    "title": "Turboslide",
    "year": 2026,
    "disciplines": [
      "Agent",
      "Interface"
    ],
    "stats": {
      "hp": 336,
      "atk": 111,
      "def": 128,
      "spd": 128
    },
    "total": 501.4,
    "cost": 4,
    "trait": {
      "name": "Preloaded",
      "rule": "The first move it uses after it enters goes first, the way a route loads its code and data when the pointer reaches its link.",
      "hook": "priority +1 on the first move after switching in; resets on switch-out",
      "receipt": "Turboslide@3e22c8f54:apps/studio/src/router.tsx:84; README.md:69 (168 ms from click to a settled studio)"
    },
    "moves": [
      {
        "id": "live-pointers",
        "name": "Live Pointers",
        "feature": "Claude Code and Codex edit the open deck at once, each with a named pointer and chip",
        "discipline": "Agent",
        "power": 30,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 2
        },
        "receipt": "Turboslide@3e22c8f54:AGENTS.md:104-107; README.md:40; apps/studio/home-deck/recorded-chips/chips.json:2",
        "note": "Two hits, one per agent. The product page replays recorded CLI runs (argv, exit code and stdout kept per step); external writes reach an open editor within a second. Live pointers itself sits behind Tools > Advanced tools."
      },
      {
        "id": "perfect-export",
        "name": "Perfect Export",
        "feature": "PowerPoint, PDF and editable-text downloads checked against the screen before the file is written",
        "discipline": "Interface",
        "power": 60,
        "accuracy": 1,
        "pp": 8,
        "receipt": "Turboslide@3e22c8f54:README.md:66; packages/theme/brand/facts.json:45-48",
        "note": "Never misses: the decoded page is compared with the shot before the file exists. Worst page 0.003 percent off over 170 pages."
      },
      {
        "id": "two-tone",
        "name": "Two Tone",
        "feature": "The Bayer two-tone screen, computed identically in Rust, WebAssembly and TypeScript",
        "discipline": "Interface",
        "power": 50,
        "accuracy": 1,
        "pp": 10,
        "critChance": 0.25,
        "receipt": "Turboslide@3e22c8f54:README.md:65; docs/native.md (cited at README.md:65)",
        "note": "Raised critical chance: three backends light the same cells, so the print never drifts (0 disagreements over 30 screens of 360,000 cells)."
      },
      {
        "id": "revision-check",
        "name": "Revision Check",
        "feature": "One handler checks every write: a write that read an old revision is refused with 409 and the current document",
        "discipline": "Agent",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "barrier",
          "chance": 1,
          "amount": 0.5
        },
        "receipt": "Turboslide@3e22c8f54:README.md:117; AGENTS.md:68-78, 100-103",
        "note": "A stale write bounces, so half of the next hit is absorbed. Agents also meet a lease: a write to a slide another author holds is 409 unless forced."
      }
    ],
    "facts": {
      "build": {
        "value": 1232,
        "unit": "commits",
        "receipt": "git rev-list --count 3e22c8f54"
      },
      "reach": {
        "value": 5,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Turboslide --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 768,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Turboslide/git/trees/3e22c8f54?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 33.3,
        "unit": "commits per active day",
        "receipt": "1232 commits over 37 distinct commit dates, 2026-09-10 to 2026-10-22"
      }
    },
    "url": "https://www.turboslide.com",
    "repo": "https://github.com/Kevin-Liu-01/Turboslide"
  },
  {
    "id": "glyphfield",
    "title": "Glyphfield",
    "year": 2026,
    "disciplines": [
      "Type",
      "Shader"
    ],
    "stats": {
      "hp": 319,
      "atk": 124,
      "def": 126,
      "spd": 118
    },
    "total": 495.6,
    "cost": 3,
    "trait": {
      "name": "Deterministic",
      "rule": "Its moves never miss.",
      "hook": "accuracy = 1 for this fighter",
      "receipt": "Glyphfield@3763d1b:README.md:78"
    },
    "moves": [
      {
        "id": "material-lab",
        "name": "Material Lab",
        "feature": "A mark set in three dimensions over a shader",
        "discipline": "Shader",
        "power": 70,
        "accuracy": 0.95,
        "pp": 8,
        "receipt": "Glyphfield@3763d1b:README.md:30-37"
      },
      {
        "id": "motion-study",
        "name": "Motion Study",
        "feature": "Animation that exports to Lottie",
        "discipline": "Type",
        "power": 55,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "spdUp",
          "chance": 1,
          "amount": 1
        },
        "receipt": "Glyphfield@3763d1b:README.md:34"
      },
      {
        "id": "editable-layers",
        "name": "Editable Layers",
        "feature": "Code edits round-trip into the visual controls",
        "discipline": "Type",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "barrier",
          "chance": 1,
          "amount": 0.4
        },
        "receipt": "Glyphfield@3763d1b:README.md:72-75"
      },
      {
        "id": "agent-api",
        "name": "Agent API",
        "feature": "POST /api/generate returns deterministic SVG",
        "discipline": "Shader",
        "power": 45,
        "accuracy": 1,
        "pp": 10,
        "priority": 1,
        "receipt": "Glyphfield@3763d1b:README.md:76-78"
      }
    ],
    "facts": {
      "build": {
        "value": 409,
        "unit": "commits",
        "receipt": "git rev-list --count 0fb6cbd71"
      },
      "reach": {
        "value": 19,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Glyphfield --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 301,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Glyphfield/git/trees/0fb6cbd71?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 9.3,
        "unit": "commits per active day",
        "receipt": "409 commits over 44 distinct commit dates, 2026-07-22 to 2026-10-28"
      }
    },
    "url": "https://www.glyphfield.com/studio",
    "repo": "https://github.com/Kevin-Liu-01/Glyphfield"
  },
  {
    "id": "jarhead",
    "title": "Jarhead",
    "year": 2026,
    "disciplines": [
      "Agent",
      "Interface"
    ],
    "stats": {
      "hp": 328,
      "atk": 127,
      "def": 122,
      "spd": 126
    },
    "total": 506.2,
    "cost": 4,
    "trait": {
      "name": "Relaunch",
      "rule": "The first hit that would take its last HP leaves it at 1 HP instead, once per match.",
      "hook": "survive the first knockout at 1 HP, once per battle",
      "receipt": "Jarhead@50d54e83c:README.md:86; README.md:396; apps/mac/Sources/Jarhead/Daemon/DaemonProcess.swift:245"
    },
    "moves": [
      {
        "id": "wake-word",
        "name": "Wake Word",
        "feature": "The on-device wake word and the Touch ID gate",
        "discipline": "Agent",
        "power": 0,
        "accuracy": 1,
        "pp": 5,
        "selfEffect": {
          "type": "barrier",
          "chance": 1,
          "amount": 0.4
        },
        "receipt": "Jarhead@50d54e83c:README.md:67",
        "note": "A barrier because nothing reaches the session until the gate passes: Touch ID, Apple Watch, the Mac password or a passphrase."
      },
      {
        "id": "reflex",
        "name": "Reflex",
        "feature": "Unambiguous commands go straight to the hands without the model",
        "discipline": "Agent",
        "power": 35,
        "accuracy": 1,
        "pp": 15,
        "priority": 1,
        "receipt": "Jarhead@50d54e83c:README.md:71; README.md:365",
        "note": "Priority because the ear dispatches in 8 ms median before the voice or the brain hears about it."
      },
      {
        "id": "threads",
        "name": "Threads",
        "feature": "Up to three full Jarheads beside the main one, each with its own brain and blob",
        "discipline": "Agent",
        "power": 18,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 1,
          "max": 4
        },
        "receipt": "Jarhead@50d54e83c:README.md:72; README.md:392",
        "note": "One hit per live lane: the main conversation plus up to three threads."
      },
      {
        "id": "swift-hands",
        "name": "Swift Hands",
        "feature": "71 tools in ten families; the hands find a control by label, click it and check a screenshot",
        "discipline": "Interface",
        "power": 55,
        "accuracy": 1,
        "pp": 10,
        "receipt": "Jarhead@50d54e83c:README.md:70; README.md:397",
        "note": "Accuracy 1 because the hands are AX-first: they find the control by its label, and a screenshot checks the work."
      }
    ],
    "facts": {
      "build": {
        "value": 708,
        "unit": "commits",
        "receipt": "git rev-list --count 50d54e83c"
      },
      "reach": {
        "value": 30,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Jarhead --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 226,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Jarhead/git/trees/50d54e83c?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 26.22,
        "unit": "commits per active day",
        "receipt": "708 commits over 27 distinct commit dates, 2026-08-10 to 2026-10-23"
      }
    },
    "url": "https://jarhead.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/Jarhead"
  },
  {
    "id": "katagami",
    "title": "Katagami",
    "year": 2026,
    "disciplines": [
      "Type",
      "Interface"
    ],
    "stats": {
      "hp": 303,
      "atk": 104,
      "def": 100,
      "spd": 107
    },
    "total": 432.2,
    "cost": 1,
    "trait": {
      "name": "Variable",
      "rule": "Its Weight Axis move uses the weight the visitor sets on the live font, from 100 to 900: heavier hits harder and less accurately.",
      "hook": "move power and accuracy read a visitor-set wght",
      "receipt": "Katagami@3f3a0ea:README.md:36"
    },
    "moves": [
      {
        "id": "bezier-points",
        "name": "Bezier Points",
        "feature": "Every point on the drawing can be dragged",
        "discipline": "Type",
        "power": 115,
        "accuracy": 0.95,
        "pp": 10,
        "receipt": "Katagami@3f3a0ea:README.md:25"
      },
      {
        "id": "weight-axis",
        "name": "Weight Axis",
        "feature": "Weights from 100 to 900",
        "discipline": "Type",
        "power": 135,
        "accuracy": 0.75,
        "axis": {
          "tag": "wght",
          "min": 100,
          "max": 900,
          "step": 10,
          "default": 600,
          "power": [
            75,
            0.1
          ],
          "accuracy": [
            1.05,
            -5e-4
          ],
          "accuracyCap": 1
        },
        "pp": 10,
        "receipt": "Katagami@3f3a0ea:README.md:36, 44-48"
      },
      {
        "id": "shared-skeleton",
        "name": "Shared Skeleton",
        "feature": "Five members share one skeleton",
        "discipline": "Interface",
        "power": 0,
        "accuracy": 1,
        "pp": 8,
        "selfEffect": {
          "type": "heal",
          "chance": 1,
          "amount": 60
        },
        "receipt": "Katagami@3f3a0ea:README.md:9"
      },
      {
        "id": "confusables-apart",
        "name": "Confusables Apart",
        "feature": "Mono draws 0 O 1 l I apart",
        "discipline": "Interface",
        "power": 100,
        "accuracy": 1,
        "pp": 12,
        "critChance": 0.2,
        "receipt": "Katagami@3f3a0ea:README.md:40"
      }
    ],
    "facts": {
      "build": {
        "value": 116,
        "unit": "commits",
        "receipt": "git rev-list --count 3f3a0ea50"
      },
      "reach": {
        "value": 1,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Katagami --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 5,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Katagami/git/trees/3f3a0ea50?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 6.82,
        "unit": "commits per active day",
        "receipt": "116 commits over 17 distinct commit dates, 2026-10-07 to 2026-10-29"
      }
    },
    "url": "https://katagami.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/Katagami"
  },
  {
    "id": "claude-of-tanks",
    "title": "Claude of Tanks",
    "year": 2026,
    "disciplines": [
      "Game",
      "Shader"
    ],
    "stats": {
      "hp": 340,
      "atk": 130,
      "def": 130,
      "spd": 130
    },
    "total": 526,
    "cost": 4,
    "trait": {
      "name": "Seeded",
      "rule": "Its damage has no random spread, so the same attack on the same target lands the same number unless it is critical.",
      "hook": "variance = 1 for this fighter",
      "receipt": "claude-of-tanks@24c5c5b03:AGENTS.md:105-106"
    },
    "moves": [
      {
        "id": "sabot-round",
        "name": "Sabot Round",
        "feature": "APFSDS, one of five shell classes",
        "discipline": "Game",
        "power": 80,
        "accuracy": 0.95,
        "pp": 8,
        "piercing": 0.5,
        "receipt": "claude-of-tanks@24c5c5b03:docs/HOW-IT-WORKS.md:257",
        "note": "Piercing models penetration against effective armor: the killcam ledger reads pen 792 mm against 671 mm effective."
      },
      {
        "id": "killcam",
        "name": "Killcam",
        "feature": "The X-ray replay of a resolved kill",
        "discipline": "Shader",
        "power": 65,
        "accuracy": 1,
        "pp": 10,
        "executeThreshold": 0.35,
        "receipt": "claude-of-tanks@24c5c5b03:docs/HOW-IT-WORKS.md:338-344",
        "note": "A finisher: it hits harder below 35% HP because the killcam is how a destroyed tank is shown."
      },
      {
        "id": "one-spec",
        "name": "One Spec",
        "feature": "One vehicle spec drives the garage card, armor logic, bots and the model",
        "discipline": "Game",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "defUp",
          "chance": 1,
          "amount": 2
        },
        "receipt": "claude-of-tanks@24c5c5b03:docs/HOW-IT-WORKS.md:60-63 (garage uses the battle renderer)"
      },
      {
        "id": "column-fire",
        "name": "Column Fire",
        "feature": "14 v 14 preset battles",
        "discipline": "Game",
        "power": 25,
        "accuracy": 0.9,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 3
        },
        "receipt": "claude-of-tanks@24c5c5b03:src/sim/matchRuleset.ts:109-112"
      }
    ],
    "facts": {
      "build": {
        "value": 18504,
        "unit": "commits",
        "receipt": "git rev-list --count ccb2041c4"
      },
      "reach": {
        "value": 519,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/claude-of-tanks --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 2121,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/claude-of-tanks/git/trees/ccb2041c4?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 192.75,
        "unit": "commits per active day",
        "receipt": "18504 commits over 96 distinct commit dates, 2026-07-27 to 2026-10-30"
      }
    },
    "url": "https://cot.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/claude-of-tanks"
  },
  {
    "id": "mailroom",
    "title": "Mailroom",
    "year": 2026,
    "disciplines": [
      "Data",
      "Agent"
    ],
    "stats": {
      "hp": 286,
      "atk": 109,
      "def": 105,
      "spd": 105
    },
    "total": 433.4,
    "cost": 1,
    "trait": {
      "name": "Per-Rule Cap",
      "rule": "No single hit can take more than half its max HP. Past the cap, the rest of the hit is refused.",
      "hook": "damage per hit clamps to 50% of this fighter's max HP",
      "receipt": "mailroom@bc389e255:src/lib/engine/run.ts:125-126; src/lib/policy/schema.ts:69; README.md:58"
    },
    "moves": [
      {
        "id": "rules",
        "name": "Rules",
        "feature": "Free Gmail searches and filters label mail on arrival",
        "discipline": "Data",
        "power": 65,
        "accuracy": 1,
        "pp": 20,
        "priority": 1,
        "receipt": "mailroom@bc389e255:README.md:9-10; README.md:26",
        "note": "Priority because routes compile to Gmail filters that file new mail the moment it lands; deep PP because the rules cost nothing."
      },
      {
        "id": "five-questions",
        "name": "Five Questions",
        "feature": "Jev's five typed questions per email",
        "discipline": "Agent",
        "power": 21,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 5,
          "max": 5
        },
        "receipt": "mailroom@bc389e255:src/lib/ai/triage.ts:43-67",
        "note": "Always five hits: category, automated, needs action, time-sensitive and disposable."
      },
      {
        "id": "ask-in-plain-words",
        "name": "Ask In Plain Words",
        "feature": "A plain-words question compiles to an editable Gmail query, then Jev reranks the results",
        "discipline": "Data",
        "power": 105,
        "accuracy": 0.95,
        "pp": 10,
        "critChance": 0.2,
        "receipt": "mailroom@bc389e255:README.md:24; src/lib/search/compile.ts; src/lib/search/rerank.ts",
        "note": "Critical chance because Jev reranks the conversations by the signal asked for, so the top result lands hardest."
      },
      {
        "id": "undo",
        "name": "Undo",
        "feature": "Every receipt has Undo, whole or per message",
        "discipline": "Data",
        "power": 0,
        "accuracy": 1,
        "pp": 5,
        "selfEffect": {
          "type": "heal",
          "chance": 1,
          "amount": 50
        },
        "receipt": "mailroom@bc389e255:README.md:56; README.md:46; src/app/api/runs/[id]/undo/route.ts",
        "note": "A heal because Undo puts the labels, filters and policy back."
      }
    ],
    "facts": {
      "build": {
        "value": 61,
        "unit": "commits",
        "receipt": "git rev-list --count bc389e255"
      },
      "reach": {
        "value": 2,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/mailroom --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 16,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/mailroom/git/trees/bc389e255?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 4.69,
        "unit": "commits per active day",
        "receipt": "61 commits over 13 distinct commit dates, 2026-09-25 to 2026-10-24"
      }
    },
    "url": "https://mailroom.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/mailroom"
  },
  {
    "id": "local-search",
    "title": "Local Search",
    "year": 2026,
    "disciplines": [
      "Infra",
      "Agent"
    ],
    "stats": {
      "hp": 295,
      "atk": 120,
      "def": 107,
      "spd": 101
    },
    "total": 446,
    "cost": 2,
    "trait": {
      "name": "Cached",
      "rule": "The second time it uses a move, that move goes first.",
      "hook": "move gains priority +1 after its first use",
      "receipt": "Local-Search@7047959:README.md:106-108 (384.5 ms cold, 6.5 ms cached)"
    },
    "moves": [
      {
        "id": "browser-query",
        "name": "Browser Query",
        "feature": "A search through your own Chrome",
        "discipline": "Infra",
        "power": 65,
        "accuracy": 0.95,
        "pp": 10,
        "receipt": "Local-Search@7047959:README.md:1-6"
      },
      {
        "id": "stable-json",
        "name": "Stable JSON",
        "feature": "A contract an agent can parse",
        "discipline": "Agent",
        "power": 60,
        "accuracy": 1,
        "pp": 15,
        "receipt": "Local-Search@7047959:README.md:99-100"
      },
      {
        "id": "148-7-ms",
        "name": "148.7 ms",
        "feature": "The published median latency",
        "discipline": "Infra",
        "power": 55,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "spdUp",
          "chance": 1,
          "amount": 1
        },
        "receipt": "Local-Search@7047959:README.md:104-108; benchmarks/hosted-search-2026-07-21.md"
      },
      {
        "id": "53-4-tokens",
        "name": "53.4 Tokens",
        "feature": "Compact results keep an agent's context short",
        "discipline": "Agent",
        "power": 0,
        "accuracy": 1,
        "pp": 8,
        "selfEffect": {
          "type": "heal",
          "chance": 1,
          "amount": 45
        },
        "receipt": "Local-Search@7047959:README.md:112-114"
      }
    ],
    "facts": {
      "build": {
        "value": 76,
        "unit": "commits",
        "receipt": "git rev-list --count 46756a027"
      },
      "reach": {
        "value": 16,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Local-Search --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 17,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Local-Search/git/trees/46756a027?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 3.62,
        "unit": "commits per active day",
        "receipt": "76 commits over 21 distinct commit dates, 2026-07-19 to 2026-10-16"
      }
    },
    "url": "https://lsearch.dev/",
    "repo": "https://github.com/Kevin-Liu-01/Local-Search"
  },
  {
    "id": "agent-pets",
    "title": "Agent Pets",
    "year": 2026,
    "disciplines": [
      "Game",
      "Agent"
    ],
    "stats": {
      "hp": 270,
      "atk": 104,
      "def": 114,
      "spd": 95
    },
    "total": 421,
    "cost": 1,
    "trait": {
      "name": "Three Repeats",
      "rule": "Codex plays each action three times before the pet returns to idle, so a move that hits more than once always hits three times.",
      "hook": "hits = 3 for this fighter's multi-hit moves",
      "receipt": "Agent-Pets@a3f9fdd85:site/codex-pet-runtime.mjs:8,50-52"
    },
    "moves": [
      {
        "id": "sixteen-looks",
        "name": "Sixteen Looks",
        "feature": "The pet turns its head toward the pointer in 16 directions",
        "discipline": "Game",
        "power": 100,
        "accuracy": 1,
        "pp": 15,
        "priority": 1,
        "receipt": "Agent-Pets@a3f9fdd85:site/codex-pet-runtime.mjs:70-78; site/pet-gaze.mjs:1; README.md:102-111",
        "note": "Never misses: the gaze follows the pointer wherever it goes."
      },
      {
        "id": "run-cycle",
        "name": "Run Cycle",
        "feature": "The 8-frame run row, 120 ms a frame with a 220 ms hold",
        "discipline": "Game",
        "power": 40,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 3
        },
        "receipt": "Agent-Pets@a3f9fdd85:site/codex-pet-runtime.mjs:26-27",
        "note": "With Three Repeats it always lands 3 hits."
      },
      {
        "id": "needs-attention",
        "name": "Needs Attention",
        "feature": "The bridge's attention event: the pet waits and the badge stays until it is read",
        "discipline": "Agent",
        "power": 70,
        "accuracy": 0.95,
        "pp": 10,
        "effect": {
          "type": "stun",
          "chance": 0.3
        },
        "receipt": "Agent-Pets@a3f9fdd85:site/companion-notifications.mjs:4-10; integrations/README.md:12-14,17-22",
        "note": "Stun models the persistent attention signal: the pet holds its Waiting row until the notification is marked read."
      },
      {
        "id": "safety-border",
        "name": "Safety Border",
        "feature": "The 16-pixel clear border every frame must keep, enforced by the hi-bit audit",
        "discipline": "Game",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "barrier",
          "chance": 1,
          "amount": 0.4
        },
        "receipt": "Agent-Pets@a3f9fdd85:AGENTS.md:15-17; README.md:127-131; scripts/audit_hi_bit_pet_library.py:2"
      }
    ],
    "facts": {
      "build": {
        "value": 4,
        "unit": "commits",
        "receipt": "git rev-list --count a3f9fdd85"
      },
      "reach": {
        "value": 1,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Agent-Pets --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 53,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Agent-Pets/git/trees/a3f9fdd85?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 1,
        "unit": "commits per active day",
        "receipt": "4 commits over 4 distinct commit dates, 2026-07-20 to 2026-10-08"
      }
    },
    "url": "https://agentpets.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/Agent-Pets"
  },
  {
    "id": "loop",
    "title": "Loop",
    "year": 2026,
    "disciplines": [
      "Agent",
      "Data"
    ],
    "stats": {
      "hp": 307,
      "atk": 122,
      "def": 109,
      "spd": 111
    },
    "total": 464.8,
    "cost": 2,
    "trait": {
      "name": "Daily Refresh",
      "rule": "After every third turn it stays in play, its Reach grows, to 1.5 times and then to 2 times.",
      "hook": "atk stage +1 at the end of every third turn while active, cap +2",
      "receipt": "Loop@b81262add:README.md:35"
    },
    "moves": [
      {
        "id": "source-scan",
        "name": "Source Scan",
        "feature": "Tracked sources",
        "discipline": "Data",
        "power": 60,
        "accuracy": 1,
        "pp": 15,
        "selfEffect": {
          "type": "critUp",
          "chance": 1,
          "amount": 0.2
        },
        "receipt": "Loop@b81262add:README.md:70"
      },
      {
        "id": "refresh-run",
        "name": "Refresh Run",
        "feature": "A refresh run and the diff it landed",
        "discipline": "Agent",
        "power": 85,
        "accuracy": 0.95,
        "pp": 10,
        "receipt": "Loop@b81262add:README.md:33"
      },
      {
        "id": "full-diff",
        "name": "Full Diff",
        "feature": "Every removed and added line stays on the page",
        "discipline": "Data",
        "power": 75,
        "accuracy": 1,
        "pp": 10,
        "piercing": 0.5,
        "receipt": "Loop@b81262add:README.md:41, 60-73"
      },
      {
        "id": "queue-fan-out",
        "name": "Queue Fan-out",
        "feature": "Cron decides what is due; workers refresh one skill at a time",
        "discipline": "Agent",
        "power": 32,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 3
        },
        "receipt": "Loop@b81262add:README.md:49"
      }
    ],
    "facts": {
      "build": {
        "value": 159,
        "unit": "commits",
        "receipt": "git rev-list --count b81262add"
      },
      "reach": {
        "value": 18,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Loop --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 37,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Loop/git/trees/b81262add?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 7.57,
        "unit": "commits per active day",
        "receipt": "159 commits over 21 distinct commit dates, 2026-03-28 to 2026-10-16"
      }
    },
    "url": "https://loooop.dev/",
    "repo": "https://github.com/Kevin-Liu-01/Loop"
  },
  {
    "id": "agent-machines",
    "title": "Agent Machines",
    "year": 2026,
    "disciplines": [
      "Agent",
      "Infra"
    ],
    "stats": {
      "hp": 315,
      "atk": 127,
      "def": 124,
      "spd": 109
    },
    "total": 486,
    "cost": 3,
    "trait": {
      "name": "Persistent",
      "rule": "When it leaves play it keeps every raised stat and drops any condition, the way a machine keeps its filesystem and loses its RAM.",
      "hook": "skip stage reset on switch; clear status on switch",
      "receipt": "Agent-Machines@49447b5:README.md:238-241, 248-253"
    },
    "moves": [
      {
        "id": "provision",
        "name": "Provision",
        "feature": "Provision, run, inspect and tear down a machine",
        "discipline": "Infra",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "defUp",
          "chance": 1,
          "amount": 2
        },
        "receipt": "Agent-Machines@49447b5:README.md:27"
      },
      {
        "id": "four-runtimes",
        "name": "Four Runtimes",
        "feature": "Claude Code, Codex, Hermes and OpenClaw",
        "discipline": "Agent",
        "power": 22,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 1,
          "max": 4
        },
        "receipt": "Agent-Machines@49447b5:README.md:26"
      },
      {
        "id": "provider-route",
        "name": "Provider Route",
        "feature": "The provider is a setting on the machine",
        "discipline": "Infra",
        "power": 60,
        "accuracy": 1,
        "pp": 10,
        "adapts": true,
        "receipt": "Agent-Machines@49447b5:README.md:27, 245-246",
        "note": "adapts: the move takes whichever of its two disciplines hits harder (new engine field)"
      },
      {
        "id": "worker-library",
        "name": "Worker Library",
        "feature": "161 skills and 39 MCP servers",
        "discipline": "Agent",
        "power": 55,
        "accuracy": 1,
        "pp": 15,
        "critChance": 0.2,
        "receipt": "Agent-Machines@49447b5:README.md:34-37"
      }
    ],
    "facts": {
      "build": {
        "value": 313,
        "unit": "commits",
        "receipt": "git rev-list --count 24fe11ea3"
      },
      "reach": {
        "value": 30,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Agent-Machines --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 252,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Agent-Machines/git/trees/24fe11ea3?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 7.28,
        "unit": "commits per active day",
        "receipt": "313 commits over 43 distinct commit dates, 2026-05-05 to 2026-10-16"
      }
    },
    "url": "https://www.agent-machines.dev/",
    "repo": "https://github.com/Kevin-Liu-01/Agent-Machines"
  },
  {
    "id": "prototemplate",
    "title": "Prototemplate",
    "year": 2026,
    "disciplines": [
      "Shader",
      "Type"
    ],
    "stats": {
      "hp": 332,
      "atk": 114,
      "def": 111,
      "spd": 124
    },
    "total": 481.8,
    "cost": 3,
    "trait": {
      "name": "Paused Offscreen",
      "rule": "While it waits out of play it recovers 6% of its HP each turn, the way its loops pause off screen and cost nothing.",
      "hook": "end of turn: if benched, heal 6% of max HP",
      "receipt": "Prototemplate@d8ebecaa1:ARCHITECTURE.md:239-240 (sections/visibility.ts: loops pause off screen)"
    },
    "moves": [
      {
        "id": "horizon-field",
        "name": "Horizon Field",
        "feature": "A lensing black hole drawn analytically in one WebGL canvas; the pointer bends the light",
        "discipline": "Shader",
        "power": 85,
        "accuracy": 0.9,
        "pp": 8,
        "receipt": "Prototemplate@d8ebecaa1:src/lib/horizon-field.ts:1-16, 38-40",
        "note": "The heaviest hit. Light from the whole accretion field piles onto a photon ring at the rim."
      },
      {
        "id": "studio-field",
        "name": "Studio Field",
        "feature": "Ten Bayer presets on one shared WebGL context",
        "discipline": "Shader",
        "power": 28,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 3
        },
        "receipt": "Prototemplate@d8ebecaa1:src/lib/studio-field.ts:122-152; content/docs/components/(fields)/dither.mdx:100",
        "note": "Several hits, one per preset that lands."
      },
      {
        "id": "type-field",
        "name": "Type Field",
        "feature": "Glyphs from eight scripts condense into one word that prints as real type, with its measured advance",
        "discipline": "Type",
        "power": 55,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "critUp",
          "chance": 1,
          "amount": 0.2
        },
        "receipt": "Prototemplate@d8ebecaa1:src/lib/glyph-field.ts:1-12",
        "note": "The caliper prints the word's measured advance, so the next hit is aimed. Nothing spawns mid-air and nothing vanishes mid-flight."
      },
      {
        "id": "every-sentence",
        "name": "Every Sentence",
        "feature": "One sentence dissolves into glyph dust and reassembles in the next language, mirrored for right to left",
        "discipline": "Type",
        "power": 65,
        "accuracy": 1,
        "pp": 10,
        "effect": {
          "type": "stun",
          "chance": 0.2
        },
        "receipt": "Prototemplate@d8ebecaa1:src/components/shared/EverySentence.tsx:13-21; content/docs/components/(language-and-motion)/motion.mdx:59",
        "note": "May leave the defender Blocked while the sentence reassembles. The docs plate runs the dossier headline in seven languages."
      }
    ],
    "facts": {
      "build": {
        "value": 1025,
        "unit": "commits",
        "receipt": "git rev-list --count d8ebecaa1"
      },
      "reach": {
        "value": 6,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Prototemplate --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 44,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Prototemplate/git/trees/d8ebecaa1?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 16.02,
        "unit": "commits per active day",
        "receipt": "1025 commits over 64 distinct commit dates, 2026-07-30 to 2026-10-30"
      }
    },
    "url": "https://www.prototemplate.com",
    "repo": "https://github.com/Kevin-Liu-01/Prototemplate"
  },
  {
    "id": "bday-land",
    "title": "bday.land",
    "year": 2026,
    "disciplines": [
      "Game",
      "Interface"
    ],
    "stats": {
      "hp": 299,
      "atk": 97,
      "def": 120,
      "spd": 103
    },
    "total": 439.6,
    "cost": 1,
    "trait": {
      "name": "Every Doodle Lands",
      "rule": "A move that hits more than once always lands every hit, because a friend's throw sends every doodle on the card, up to five, and each one flies, freezes and lands.",
      "hook": "hits = max for this fighter",
      "receipt": "birthdayland@6ebac76e9:src/world/interaction/AttackSequence.tsx:74-75,134"
    },
    "moves": [
      {
        "id": "plus999-love",
        "name": "+999 Love",
        "feature": "A friend's blob throws the doodles from their card",
        "discipline": "Game",
        "power": 27,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 1,
          "max": 5
        },
        "receipt": "birthdayland@6ebac76e9:src/world/interaction/AttackSequence.tsx:74-75,134; src/world/interaction/attack/HitStickers.tsx:9; README.md:30-31",
        "note": "The hit count follows the card: one shot per doodle up to five, or three hearts when the card has none. The trait fixes it at five. +999 LOVE is the first of the five damage words the impact stickers cycle through."
      },
      {
        "id": "whack-a-gnome",
        "name": "Whack-a-Gnome",
        "feature": "The arcade booth at the head of the festival",
        "discipline": "Game",
        "power": 105,
        "accuracy": 0.9,
        "pp": 10,
        "critChance": 0.2,
        "receipt": "birthdayland@6ebac76e9:src/games/booths.ts:18-31; src/games/games/whack-a-gnome/meta.ts:9",
        "note": "Gold-hat gnomes (+15) and the snow bunny (+25) are the critical hits; llamas are friends."
      },
      {
        "id": "leave-a-card",
        "name": "Leave a Card",
        "feature": "The seven-step card wizard friends open from one link",
        "discipline": "Interface",
        "power": 85,
        "accuracy": 1,
        "pp": 15,
        "priority": 1,
        "receipt": "birthdayland@6ebac76e9:src/features/contribute/types.ts:142-150; README.md:24-26,88",
        "note": "Priority because friends need nothing but the URL. The steps are who, say it, draw, snap, film, face and stick it."
      },
      {
        "id": "light-a-candle",
        "name": "Light a Candle",
        "feature": "Each hug lights a candle on the cake",
        "discipline": "Game",
        "power": 0,
        "accuracy": 1,
        "pp": 8,
        "selfEffect": {
          "type": "heal",
          "chance": 1,
          "amount": 50
        },
        "receipt": "birthdayland@6ebac76e9:src/world/scene/props/Candles.tsx:110-115; README.md:32",
        "note": "One candle per friend stays unlit until that friend is hugged, then its flame pops in."
      }
    ],
    "facts": {
      "build": {
        "value": 94,
        "unit": "commits",
        "receipt": "git rev-list --count 6ebac76e9"
      },
      "reach": {
        "value": 0,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/birthdayland --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 140,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/birthdayland/git/trees/6ebac76e9?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 4.48,
        "unit": "commits per active day",
        "receipt": "94 commits over 21 distinct commit dates, 2026-09-19 to 2026-10-28"
      }
    },
    "url": "https://bday.land/",
    "repo": "https://github.com/Kevin-Liu-01/birthdayland"
  },
  {
    "id": "powerlifting",
    "title": "Princeton Powerlifting",
    "year": 2026,
    "disciplines": [
      "Type",
      "Interface"
    ],
    "stats": {
      "hp": 274,
      "atk": 97,
      "def": 95,
      "spd": 97
    },
    "total": 398.6,
    "cost": 1,
    "trait": {
      "name": "No Flash",
      "rule": "Both units are already in the page and CSS shows one, so a switch never flashes, and a stun never lands on it.",
      "hook": "stun chance against this fighter = 0",
      "receipt": "Princeton-Powerlifting@ca20b1059:components/Units.tsx:3-5; README.md:26"
    },
    "moves": [
      {
        "id": "primary-mark",
        "name": "Primary Mark",
        "feature": "The tiger over a loaded bar above the chamfered wordmark",
        "discipline": "Type",
        "power": 130,
        "accuracy": 1,
        "pp": 5,
        "receipt": "Princeton-Powerlifting@ca20b1059:lib/brand/marks.ts:235-245,549; lib/brand/tiger-front.ts:1-4",
        "note": "Tagged Needs TML. The tiger is the head-on carved head (lib/brand/tiger-front.ts), chosen 2026-10-18 and made primary on 2026-10-30; the three-quarter Apex Sharp head it replaced is archived. lib/brand holds 67 draft heads at the pin."
      },
      {
        "id": "chamfered-alphabet",
        "name": "Chamfered Alphabet",
        "feature": "The club lettering, every glyph a list of closed polygons",
        "discipline": "Type",
        "power": 105,
        "accuracy": 1,
        "pp": 10,
        "priority": 1,
        "receipt": "Princeton-Powerlifting@ca20b1059:lib/brand/letters.ts:1-15; README.md:42"
      },
      {
        "id": "84-icons",
        "name": "84 Icons",
        "feature": "An 84-icon pack on a 24 grid, stroke 2, mitered, with solid front-on squat, bench and deadlift",
        "discipline": "Interface",
        "power": 30,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 5
        },
        "receipt": "Princeton-Powerlifting@ca20b1059:README.md:30,45; lib/brand/icons/index.ts:1-23"
      },
      {
        "id": "six-colorways",
        "name": "Six Colorways",
        "feature": "Full color, On chalk, Iron, Chalk, Tiger and Red, each drawn by the same function",
        "discipline": "Interface",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "defUp",
          "chance": 1,
          "amount": 2
        },
        "receipt": "Princeton-Powerlifting@ca20b1059:lib/brand/marks.ts:22-29,43; app/brand/BrandKit.tsx:163-180"
      }
    ],
    "facts": {
      "build": {
        "value": 5,
        "unit": "commits",
        "receipt": "git rev-list --count ca20b1059"
      },
      "reach": {
        "value": 0,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Princeton-Powerlifting --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 0,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Princeton-Powerlifting/git/trees/ca20b1059?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 1.67,
        "unit": "commits per active day",
        "receipt": "5 commits over 3 distinct commit dates, 2026-10-17 to 2026-10-23"
      }
    },
    "url": "https://powerlifting.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/Princeton-Powerlifting"
  },
  {
    "id": "elo",
    "title": "Elo",
    "year": 2026,
    "disciplines": [
      "Data",
      "Agent"
    ],
    "stats": {
      "hp": 278,
      "atk": 97,
      "def": 97,
      "spd": 122
    },
    "total": 427.2,
    "cost": 1,
    "trait": {
      "name": "Upset",
      "rule": "Like an Elo update, a hit on a stronger card is worth more. Its damage grows with how unlikely the hit was, with stat totals as ratings.",
      "hook": "damage x 2 x (1 - E), where E = 1 / (1 + 10^((targetTotal - ownTotal) / 400)); equal totals give x1",
      "receipt": "Elo@a6a460a61:src/lib/elo.ts:79-81,106"
    },
    "moves": [
      {
        "id": "blind-pair",
        "name": "Blind Pair",
        "feature": "Two options at a time under opaque aliases",
        "discipline": "Data",
        "power": 85,
        "accuracy": 1,
        "pp": 15,
        "receipt": "Elo@a6a460a61:README.md:3; src/lib/identity.ts:138-145; src/ui/Ground.tsx:3-10"
      },
      {
        "id": "elo-replay",
        "name": "Elo Replay",
        "feature": "Ratings replayed over the counted votes, start 1000, K 32",
        "discipline": "Data",
        "power": 110,
        "accuracy": 0.95,
        "pp": 8,
        "receipt": "Elo@a6a460a61:src/lib/elo.ts:79-81,83-116; src/lib/config.ts:6-7"
      },
      {
        "id": "mcp-server",
        "name": "MCP Server",
        "feature": "Every operation is also an MCP tool, so an agent does what the admin does",
        "discipline": "Agent",
        "power": 75,
        "accuracy": 1,
        "pp": 10,
        "priority": 1,
        "receipt": "Elo@a6a460a61:src/app/mcp/route.ts:20-26,50; src/lib/ops.ts:1-6",
        "note": "Priority because the agent skips the pages: decisions_create, options_add and results_get are direct calls."
      },
      {
        "id": "change-vote",
        "name": "Change Vote",
        "feature": "A voter goes back through every matchup and changes it; the latest cast counts, up to 10 per pair",
        "discipline": "Data",
        "power": 0,
        "accuracy": 1,
        "pp": 8,
        "selfEffect": {
          "type": "heal",
          "chance": 1,
          "amount": 50
        },
        "receipt": "Elo@a6a460a61:README.md:5; src/lib/change.ts:9-10; db/schema.sql:64"
      }
    ],
    "facts": {
      "build": {
        "value": 10,
        "unit": "commits",
        "receipt": "git rev-list --count a6a460a61"
      },
      "reach": {
        "value": 0,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Elo --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 2,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Elo/git/trees/a6a460a61?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 10,
        "unit": "commits per active day",
        "receipt": "10 commits over 1 distinct commit dates, 2026-10-30 to 2026-10-30"
      }
    },
    "url": "https://elo.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/Elo"
  },
  {
    "id": "cotfly",
    "title": "CoTFly",
    "year": 2026,
    "disciplines": [
      "Agent",
      "Data"
    ],
    "stats": {
      "hp": 282,
      "atk": 116,
      "def": 100,
      "spd": 116
    },
    "total": 444.8,
    "cost": 1,
    "trait": {
      "name": "Driving Gain",
      "rule": "The P1 population firing rate scales its throttle, so after its second turn in play its Pace grows to 1.5 times.",
      "hook": "end-of-turn stage: spd +1 every second turn while active, cap +1",
      "receipt": "CoTFly@72f5c8fab:src/fly/controller.ts:88-90; docs/FLY-OF-TANKS.md:23"
    },
    "moves": [
      {
        "id": "integrate-and-fire",
        "name": "Integrate and Fire",
        "feature": "Leaky integrate-and-fire neurons stepped in 1 ms substeps",
        "discipline": "Data",
        "power": 120,
        "accuracy": 0.95,
        "pp": 10,
        "receipt": "CoTFly@72f5c8fab:src/fly/connectome.ts:27-74",
        "note": "Each cell integrates toward -50 mV, spikes, resets to -65 mV and rests 3 ms; the clip orbits the live cluster as it fires."
      },
      {
        "id": "inhibition",
        "name": "Inhibition",
        "feature": "mAL cells inhibit the P1 population through the measured edges",
        "discipline": "Data",
        "power": 75,
        "accuracy": 1,
        "pp": 10,
        "effect": {
          "type": "stun",
          "chance": 0.3
        },
        "receipt": "CoTFly@72f5c8fab:src/fly/connectome.ts:46-49,57-60; src/fly/connectome.selftest.mjs:23-26; src/fly/data/NOTICE.md:11",
        "note": "Stun models suppression: the selftest blocks the measured inhibitory edges and P1 output rises by more than 0.15. The inhibitory sign is a stated modeling assumption; the edge counts are measured."
      },
      {
        "id": "sugar-boost",
        "name": "Sugar Boost",
        "feature": "A 15 second sugar boost",
        "discipline": "Agent",
        "power": 0,
        "accuracy": 1,
        "pp": 5,
        "selfEffect": {
          "type": "atkUp",
          "chance": 1,
          "amount": 2
        },
        "receipt": "CoTFly@72f5c8fab:src/fly/runtime.ts:374-375; src/fly/controller.ts:56; src/fly/connectome.ts:57-60; docs/FLY-OF-TANKS.md:15",
        "note": "Sugar adds drive to the P1 cells and cuts the engagement distance from 125 m to 70 m, so the fly closes in to fire. In the clip P1 output climbs to 100% and the raster turns amber."
      },
      {
        "id": "fire-button",
        "name": "Fire Button",
        "feature": "The fly reaches out and presses its fire button",
        "discipline": "Agent",
        "power": 145,
        "accuracy": 0.9,
        "pp": 8,
        "priority": -1,
        "receipt": "CoTFly@72f5c8fab:src/fly/actuators.ts:33-42; src/fly/runtime.ts:252-256",
        "note": "Negative priority models the 90 ms of foreleg travel before a key makes contact; the shot leaves only with both forelegs down."
      }
    ],
    "facts": {
      "build": {
        "value": 18,
        "unit": "commits",
        "receipt": "git rev-list --count 72f5c8fab"
      },
      "reach": {
        "value": 11,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/CoTFly --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 5,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/CoTFly/git/trees/72f5c8fab?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 9,
        "unit": "commits per active day",
        "receipt": "18 commits over 2 distinct commit dates, 2026-09-12 to 2026-10-16"
      }
    },
    "url": "https://fly.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/CoTFly"
  },
  {
    "id": "relay",
    "title": "Relay",
    "year": 2026,
    "disciplines": [
      "Agent",
      "Data"
    ],
    "stats": {
      "hp": 291,
      "atk": 104,
      "def": 118,
      "spd": 114
    },
    "total": 452.4,
    "cost": 2,
    "trait": {
      "name": "Hidden Grader",
      "rule": "Its hits are judged on the final state, so the other card's barrier and raised Proof do not reduce them.",
      "hook": "this fighter's attacks ignore the target's barrier and positive def stages",
      "receipt": "Relay@f50e9e097:README.md:63-64; README.md:220; scripts/check-workflow-graders.mjs"
    },
    "moves": [
      {
        "id": "live-browser",
        "name": "Live Browser",
        "feature": "Choose a model and task, then watch its real browser",
        "discipline": "Agent",
        "power": 100,
        "accuracy": 0.95,
        "pp": 10,
        "receipt": "Relay@f50e9e097:README.md:70-72"
      },
      {
        "id": "1v1",
        "name": "1v1",
        "feature": "Same task and seed, two fresh workspaces, side by side",
        "discipline": "Agent",
        "power": 45,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 2
        },
        "receipt": "Relay@f50e9e097:README.md:94-97; src/live/duel.jsx",
        "note": "Two hits, one per lane."
      },
      {
        "id": "jev-choice",
        "name": "Jev Choice",
        "feature": "Jev picks one action from a recorded menu of visible actions and returns the full probability distribution",
        "discipline": "Data",
        "power": 80,
        "accuracy": 1,
        "pp": 15,
        "receipt": "Relay@f50e9e097:README.md:165-169; docs/system-one.md:15-17",
        "note": "Accuracy 1 because Relay rejects an invented action and executes only the offered one Jev selected."
      },
      {
        "id": "watch-replay",
        "name": "Watch Replay",
        "feature": "Play a recorded run inside the actual interface, with the dialog, typed text and action target restored at each step",
        "discipline": "Data",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "critUp",
          "chance": 1,
          "amount": 0.25
        },
        "receipt": "Relay@f50e9e097:README.md:82-92",
        "note": "Critical chance rises because the replay shows which requirements are met at each step."
      }
    ],
    "facts": {
      "build": {
        "value": 70,
        "unit": "commits",
        "receipt": "git rev-list --count f50e9e097"
      },
      "reach": {
        "value": 1,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Relay --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 70,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Relay/git/trees/f50e9e097?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 8.75,
        "unit": "commits per active day",
        "receipt": "70 commits over 8 distinct commit dates, 2026-09-30 to 2026-10-17"
      }
    },
    "url": "https://relay.kevinliu.studio/",
    "repo": "https://github.com/Kevin-Liu-01/Relay"
  },
  {
    "id": "princeton-td",
    "title": "Princeton TD",
    "year": 2025,
    "disciplines": [
      "Game",
      "Data"
    ],
    "stats": {
      "hp": 311,
      "atk": 118,
      "def": 103,
      "spd": 99
    },
    "total": 444.4,
    "cost": 1,
    "trait": {
      "name": "Waves Are Data",
      "rule": "A move that hits more than once lands its scheduled number of hits every time.",
      "hook": "hits = max for this fighter",
      "receipt": "Princeton-Tower-Defense@e76bdf8:src/app/constants/waves.ts:1-15"
    },
    "moves": [
      {
        "id": "missile-battery",
        "name": "Missile Battery",
        "feature": "A campus tower upgrade",
        "discipline": "Game",
        "power": 100,
        "accuracy": 0.9,
        "pp": 8,
        "priority": 1,
        "receipt": "Princeton-Tower-Defense@e76bdf8:src/app/constants/towers.ts:183"
      },
      {
        "id": "wave-schedule",
        "name": "Wave Schedule",
        "feature": "Poe Field, wave 1",
        "discipline": "Data",
        "power": 45,
        "accuracy": 1,
        "pp": 10,
        "hits": {
          "min": 3,
          "max": 3
        },
        "receipt": "Princeton-Tower-Defense@e76bdf8:src/app/constants/waves.ts:19-25"
      },
      {
        "id": "offscreen-layers",
        "name": "Offscreen Layers",
        "feature": "The static map renders once to an offscreen canvas",
        "discipline": "Data",
        "power": 0,
        "accuracy": 1,
        "pp": 10,
        "selfEffect": {
          "type": "barrier",
          "chance": 1,
          "amount": 0.4
        },
        "receipt": "Princeton-Tower-Defense@e76bdf8:README.md:28"
      },
      {
        "id": "boss-wave",
        "name": "Boss Wave",
        "feature": "A boss every five sandbox rounds",
        "discipline": "Game",
        "power": 145,
        "accuracy": 0.8,
        "pp": 5,
        "receipt": "Princeton-Tower-Defense@e76bdf8:README.md:255"
      }
    ],
    "facts": {
      "build": {
        "value": 291,
        "unit": "commits",
        "receipt": "git rev-list --count a109b8424"
      },
      "reach": {
        "value": 12,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Princeton-Tower-Defense --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 6,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Princeton-Tower-Defense/git/trees/a109b8424?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 3.46,
        "unit": "commits per active day",
        "receipt": "291 commits over 84 distinct commit dates, 2025-12-31 to 2026-10-16"
      }
    },
    "url": "https://ptd.quest/",
    "repo": "https://github.com/Kevin-Liu-01/Princeton-Tower-Defense"
  },
  {
    "id": "kevin-wiki",
    "title": "Kevin Wiki",
    "year": 2026,
    "disciplines": [
      "Data",
      "Agent"
    ],
    "stats": {
      "hp": 324,
      "atk": 104,
      "def": 116,
      "spd": 120
    },
    "total": 469.6,
    "cost": 2,
    "trait": {
      "name": "Compounding",
      "rule": "Each different move it lands adds 10% to its damage while it stays in play, up to 30%, the way each ingest adds to pages already cross-linked.",
      "hook": "damage x (1 + 0.1 x distinct moves landed this battle), cap 1.3; resets on switch-out",
      "receipt": "Kevin-Wiki@c7f288149:README.md:9, 39"
    },
    "moves": [
      {
        "id": "knowledge-graph",
        "name": "Knowledge Graph",
        "feature": "The live 3D graph of every public page and its backlinks",
        "discipline": "Data",
        "power": 85,
        "accuracy": 0.9,
        "pp": 8,
        "receipt": "Kevin-Wiki@c7f288149:ui/src/components/wiki-graph.tsx:289-293, 410-411",
        "note": "The heaviest hit: 1,333 nodes and 7,848 edges in the public view."
      },
      {
        "id": "hybrid-search",
        "name": "Hybrid Search",
        "feature": "qmd: BM25, vectors, query expansion and LLM re-ranking on-device",
        "discipline": "Data",
        "power": 60,
        "accuracy": 1,
        "pp": 10,
        "priority": 1,
        "receipt": "Kevin-Wiki@c7f288149:README.md:274-283; ui/src/lib/search.ts:3-8 (the reader's search)",
        "note": "Goes first: the index lives on the machine and needs no API key."
      },
      {
        "id": "capture-ingest",
        "name": "Capture Ingest",
        "feature": "Paste a source and say add it: the agent writes the primary page, entity pages, backlinks, citations, routing, index, search and log",
        "discipline": "Agent",
        "power": 25,
        "accuracy": 0.95,
        "pp": 10,
        "hits": {
          "min": 2,
          "max": 4
        },
        "receipt": "Kevin-Wiki@c7f288149:README.md:37",
        "note": "Several hits: one ingest lands as a page plus its entity pages and backlinks."
      },
      {
        "id": "self-heal",
        "name": "Self Heal",
        "feature": "The doctor scores the wiki and self-heal applies the safe fixes, then re-runs the doctor",
        "discipline": "Agent",
        "power": 0,
        "accuracy": 1,
        "pp": 8,
        "selfEffect": {
          "type": "heal",
          "chance": 1,
          "amount": 50
        },
        "receipt": "Kevin-Wiki@c7f288149:README.md:361-372"
      }
    ],
    "facts": {
      "build": {
        "value": 556,
        "unit": "commits",
        "receipt": "git rev-list --count c7f288149"
      },
      "reach": {
        "value": 1,
        "unit": "GitHub stars",
        "receipt": "gh api repos/Kevin-Liu-01/Kevin-Wiki --jq .stargazers_count (2026-10-30)"
      },
      "proof": {
        "value": 54,
        "unit": "check files",
        "receipt": "gh api repos/Kevin-Liu-01/Kevin-Wiki/git/trees/c7f288149?recursive=1 | grep -cE <glob>"
      },
      "pace": {
        "value": 9.59,
        "unit": "commits per active day",
        "receipt": "556 commits over 58 distinct commit dates, 2026-04-06 to 2026-09-25"
      }
    },
    "url": "https://kevin-wiki.vercel.app",
    "repo": "https://github.com/Kevin-Liu-01/Kevin-Wiki (private)"
  }
];

// ../../../../r3/battle/engine/src/rules.ts
var RING = ["Infra", "Agent", "Data", "Game", "Shader", "Type", "Interface"];
var STRONG = 1.5;
var WEAK = 0.67;
function matchup(attack, defenders) {
  const a = RING.indexOf(attack);
  if (a < 0) return 1;
  let m = 1;
  for (const d of defenders) {
    const i = RING.indexOf(d);
    if (i === (a + 1) % RING.length) m *= STRONG;
    else if (i === (a - 1 + RING.length) % RING.length) m *= WEAK;
  }
  return Math.round(m * 1e4) / 1e4;
}
var STAGE_MIN = -3;
var STAGE_MAX = 3;
var clampStage = (n) => Math.max(STAGE_MIN, Math.min(STAGE_MAX, n));
var stageMultiplier = (n) => {
  const s = clampStage(n);
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
};
function draw(state) {
  const a = state.rng + 1831565813 >>> 0;
  state.rng = a;
  let t = a;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function stream(seed) {
  const s = { rng: seed >>> 0 };
  return () => draw(s);
}
function hash(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) for (const ch of String(p) + "|") h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}
var ITEMS = [
  { id: "code-snippet", code: "cs", name: "Code Snippet", short: "+20 HP", quantity: 1 },
  { id: "api-key", code: "ak", name: "API Key", short: "+50 HP", quantity: 1 },
  { id: "server-patch", code: "sp", name: "Server Patch", short: "+150 HP", quantity: 1 },
  { id: "system-restore", code: "sr", name: "System Restore", short: "Full HP", quantity: 1 },
  { id: "debugger", code: "db", name: "Debugger", short: "Cure", quantity: 1 },
  { id: "overclock", code: "oc", name: "Overclock", short: "ATK +2", quantity: 1 },
  { id: "firewall", code: "fw", name: "Firewall", short: "DEF +2", quantity: 1 },
  { id: "turbo-mode", code: "tm", name: "Turbo Mode", short: "SPD +2", quantity: 1 },
  { id: "rollback", code: "rb", name: "Rollback", short: "Revive 50%", quantity: 1 }
];
var itemById = (id) => ITEMS.find((i) => i.id === id);
var newKit = () => Object.fromEntries(ITEMS.map((i) => [i.id, i.quantity]));
var HEAL = { "code-snippet": 20, "api-key": 50, "server-patch": 150 };
var BOOST = { overclock: "atk", firewall: "def", "turbo-mode": "spd" };
function canUseItem(item, f) {
  if (item === "rollback") return f.hp <= 0;
  if (f.hp <= 0) return false;
  if (item === "debugger") return f.status !== null;
  const boost = BOOST[item];
  if (boost) return f.stages[boost] < STAGE_MAX;
  return f.hp < f.maxHp;
}

// ../../../../r3/battle/engine/src/traits.ts
var fullHits = (_c, move) => move.hits ? move.hits.max : 1;
var TRAITS = {
  // Turboslide: a route loads its code and data when the pointer reaches its link.
  Preloaded: { priority: ({ f }) => f.fresh ? 1 : 0 },
  // Glyphfield: its moves never miss.
  Deterministic: { accuracy: () => 1 },
  // Jarhead: the first knockout leaves it at 1 HP, once per battle.
  Relaunch: { relaunch: ({ f }) => f.relaunched ? false : f.relaunched = true },
  // Katagami: Weight Axis reads the weight the visitor sets on the live font.
  Variable: { axis: true },
  // Claude of Tanks: no random spread.
  Seeded: { spread: () => 1 },
  // Mailroom: no single hit takes more than half its max HP.
  "Per-Rule Cap": { hitCap: ({ f }) => Math.floor(f.maxHp / 2) },
  // Local Search: the second time it uses a move, that move goes first.
  Cached: { priority: ({ f }, index) => index >= 0 && f.used[index] > 0 ? 1 : 0 },
  // Agent Pets: each action plays three times, so multi-hit moves land three hits.
  "Three Repeats": { hits: (_c, move) => move.hits ? 3 : 1 },
  // Loop: every third turn it stays in, attack +1, up to +2.
  "Daily Refresh": { endActive: ({ f }) => f.turnsIn > 0 && f.turnsIn % 3 === 0 ? { stat: "atk", cap: 2 } : null },
  // Agent Machines: keeps its filesystem (stages), loses its RAM (status).
  Persistent: {
    switchOut: ({ f }) => {
      const kept = f.stages.atk || f.stages.def || f.stages.spd ? "Stats Kept" : null;
      const cleared = f.status ? `${f.status.charAt(0).toUpperCase()}${f.status.slice(1)} Cleared` : null;
      f.status = null;
      f.statusTurns = 0;
      return [kept, cleared].filter(Boolean).join(" ") || null;
    }
  },
  // Prototemplate: loops pause off screen and cost nothing; 6% max HP back each turn on the bench.
  "Paused Offscreen": { endBench: ({ f }) => f.hp < f.maxHp ? Math.min(f.maxHp - f.hp, Math.round(f.maxHp * 0.06)) : 0 },
  // bday.land: a friend's attack throws every doodle on the card.
  "Every Doodle Lands": { hits: fullHits },
  // Princeton Powerlifting: both units are in the page already, so a switch never flashes; cannot be stunned.
  "No Flash": { immune: (status) => status === "stun" },
  // Elo: an Elo update over stat totals; a win over a stronger fighter is worth more.
  Upset: {
    attack: ({ def }, target) => {
      const E = 1 / (1 + Math.pow(10, (target.def.total - def.total) / 400));
      return { name: "upset", value: Math.round(2 * (1 - E) * 1e3) / 1e3 };
    }
  },
  // CoTFly: the P1 firing rate scales its throttle; speed +1 every second turn in, up to +1.
  "Driving Gain": { endActive: ({ f }) => f.turnsIn > 0 && f.turnsIn % 2 === 0 ? { stat: "spd", cap: 1 } : null },
  // Relay: graded on the final state; barrier and raised defense do not reduce its hits.
  "Hidden Grader": { grader: true },
  // Princeton TD: waves are data, so multi-hit moves land the scheduled count.
  "Waves Are Data": { hits: fullHits },
  // Kevin Wiki: each different move landed adds 10%, up to 30%; resets on switch-out.
  Compounding: { attack: ({ f }) => ({ name: "compound", value: Math.round(Math.min(1.3, 1 + 0.1 * f.landed.length) * 100) / 100 }) }
};
var traitOf = (def) => TRAITS[def.trait.name] ?? {};

// ../../../../r3/battle/engine/src/engine.ts
var VERSION = "showdown-v1";
var K = 1.25;
var BASE_CRIT = 0.08;
var CRIT = 1.5;
var HOME = 1.2;
var FINISHER = 1.3;
var BURN_ATK = 0.82;
var ROUND_LIMIT = 60;
var SIDES = ["player", "rival"];
var PRIORITY = { switch: 6, item: 6, guard: 4 };
var STRUGGLE = {
  id: "hard-reset",
  name: "Hard Reset",
  feature: "Every move is out of PP",
  discipline: "Infra",
  power: 50,
  accuracy: 1,
  pp: 1,
  selfEffect: { type: "recoil", chance: 1, amount: 0.25 }
};
var byId = new Map(FIGHTERS.map((f) => [f.id, f]));
var fighterDef = (id) => {
  const def = byId.get(id);
  if (!def) throw new Error(`Unknown fighter ${id}`);
  return def;
};
var other = (side) => side === "player" ? "rival" : "player";
var activeOf = (state, side) => state.sides[side].team[state.sides[side].active];
var ctx = (f) => ({ def: fighterDef(f.id), f });
var living = (s) => s.team.filter((f) => f.hp > 0);
function teamCost(ids) {
  return ids.reduce((sum, id) => sum + (byId.get(id)?.cost ?? Infinity), 0);
}
function validateTeam(ids) {
  if (!Array.isArray(ids)) return ["A team is a list of three card ids."];
  const errors = [];
  if (ids.length !== RULES.team.size) errors.push(`A team has exactly ${RULES.team.size} cards.`);
  for (const id of ids) if (typeof id !== "string" || !byId.has(id)) errors.push(`Unknown card: ${String(id)}.`);
  if (new Set(ids).size !== ids.length) errors.push("A team cannot hold the same card twice.");
  if (!errors.length && teamCost(ids) > RULES.team.budget) errors.push(`Team cost ${teamCost(ids)} is over the budget of ${RULES.team.budget}.`);
  return errors;
}
var blankStats = () => ({ damageDealt: 0, damageTaken: 0, crits: 0, misses: 0, superEffective: 0, statuses: 0, switches: 0, items: 0, guards: 0, kos: 0 });
function makeFighter(id, side, slot) {
  const def = fighterDef(id);
  return {
    uid: `${side}:${slot}`,
    id,
    side,
    slot,
    hp: def.stats.hp,
    maxHp: def.stats.hp,
    status: null,
    statusTurns: 0,
    stages: { atk: 0, def: 0, spd: 0 },
    barrier: 0,
    critBoost: 0,
    pp: def.moves.map((m) => m.pp),
    used: def.moves.map(() => 0),
    landed: [],
    turnsIn: 0,
    fresh: true,
    relaunched: false,
    down: false
  };
}
function snapshot(state) {
  const side = (s) => ({
    active: s.active,
    kit: { ...s.kit },
    team: s.team.map((f) => ({ uid: f.uid, id: f.id, hp: f.hp, maxHp: f.maxHp, status: f.status, stages: { ...f.stages }, barrier: f.barrier, critBoost: f.critBoost, pp: [...f.pp] }))
  });
  return { turn: state.turn, phase: state.phase, sides: { player: side(state.sides.player), rival: side(state.sides.rival) } };
}
var clone = (s) => JSON.parse(JSON.stringify(s));
function emit(em, ev) {
  const full = { ...ev, id: em.state.nextEventId++, turn: em.state.turn, act: em.act };
  if (em.snapshots) full.state = snapshot(em.state);
  em.events.push(full);
}
function createBattle(team, rival, options = {}) {
  for (const [label, ids] of [["team", team], ["rival", rival]]) {
    const errors = validateTeam(ids);
    if (errors.length) throw new Error(`${label}: ${errors.join(" ")}`);
  }
  const seed = (options.seed ?? 1) >>> 0;
  const state = {
    version: VERSION,
    seed,
    rng: seed,
    turn: 1,
    phase: "command",
    winner: null,
    sides: {
      player: { team: team.map((id, i) => makeFighter(id, "player", i)), active: 0, kit: newKit() },
      rival: { team: rival.map((id, i) => makeFighter(id, "rival", i)), active: 0, kit: newKit() }
    },
    pending: [],
    stats: { player: blankStats(), rival: blankStats() },
    nextEventId: 1,
    log: [],
    teams: { player: [...team], rival: [...rival] }
  };
  const em = { state, events: [], snapshots: options.snapshots !== false, act: 0 };
  for (const side of SIDES) {
    const f = activeOf(state, side);
    emit(em, { kind: "switch", side, from: null, to: f.uid, card: f.id, reason: "lead" });
  }
  return { state, events: em.events };
}
var moveOf = (f, index) => index === -1 ? f.pp.every((p) => p <= 0) ? STRUGGLE : void 0 : fighterDef(f.id).moves[index];
function legalActions(state, side) {
  if (state.phase !== "command") return [];
  const s = state.sides[side];
  const f = activeOf(state, side);
  if (f.hp <= 0) return [];
  const out = [];
  f.pp.forEach((pp, index) => {
    if (pp > 0) out.push({ kind: "move", index });
  });
  if (!out.length) out.push({ kind: "move", index: -1 });
  out.push({ kind: "guard" });
  s.team.forEach((r, i) => {
    if (r.hp > 0 && i !== s.active) out.push({ kind: "switch", to: i });
  });
  for (const item of ITEMS) if (s.kit[item.id] > 0) s.team.forEach((t, i) => {
    if (canUseItem(item.id, t)) out.push({ kind: "item", item: item.id, target: i });
  });
  return out;
}
function validateAction(state, side, action) {
  if (state.phase === "over") return ["The battle is over."];
  if (state.phase !== "command") return ["Choose a replacement first."];
  if (!action || typeof action !== "object") return ["A command is required."];
  const a = action;
  const f = activeOf(state, side);
  const s = state.sides[side];
  switch (a.kind) {
    case "move": {
      if (!Number.isInteger(a.index)) return ["Unknown move."];
      if (a.index === -1) return f.pp.every((p) => p <= 0) ? [] : ["Hard Reset is only available when every move is out of PP."];
      if (a.index < 0 || a.index > 3) return ["Unknown move."];
      if (f.pp[a.index] <= 0) return ["That move is out of PP."];
      if (a.wght !== void 0) {
        const axis = fighterDef(f.id).moves[a.index].axis;
        if (!axis || !Number.isFinite(a.wght) || a.wght < axis.min || a.wght > axis.max) return ["Weight must be between 100 and 900."];
      }
      return [];
    }
    case "guard":
      return [];
    case "switch": {
      const t = s.team[a.to];
      if (!Number.isInteger(a.to) || !t) return ["Unknown reserve."];
      if (a.to === s.active) return ["That card is already in play."];
      if (t.hp <= 0) return ["That card is offline."];
      return [];
    }
    case "item": {
      const def = ITEMS.find((i) => i.id === a.item);
      if (!def) return ["Unknown item."];
      if (s.kit[a.item] <= 0) return [`No ${def.name} left in the Kit.`];
      const t = s.team[a.target];
      if (!Number.isInteger(a.target) || !t) return ["Unknown item target."];
      if (!canUseItem(a.item, t)) return [`${def.name} has no effect on ${fighterDef(t.id).title}.`];
      return [];
    }
    default:
      return ["Unknown command."];
  }
}
function moveNumbers(f, move, wght) {
  const t = traitOf(fighterDef(f.id));
  let power = move.power;
  let accuracy = move.accuracy;
  let w;
  if (move.axis && t.axis) {
    w = Math.max(move.axis.min, Math.min(move.axis.max, Math.round(wght ?? move.axis.default)));
    power = Math.round(move.axis.power[0] + move.axis.power[1] * w);
    accuracy = Math.min(move.axis.accuracyCap, move.axis.accuracy[0] + move.axis.accuracy[1] * w);
  }
  if (t.accuracy) accuracy = t.accuracy(ctx(f), move, accuracy);
  accuracy = Math.round(accuracy * 1e3) / 1e3;
  return w === void 0 ? { power, accuracy } : { power, accuracy, wght: w };
}
function priorityOf(f, action) {
  if (action.kind === "switch") return PRIORITY.switch;
  if (action.kind === "item") return PRIORITY.item;
  if (action.kind === "guard") return PRIORITY.guard;
  const move = moveOf(f, action.index);
  const t = traitOf(fighterDef(f.id));
  return (move?.priority ?? 0) + (action.index >= 0 && t.priority ? t.priority(ctx(f), action.index) : 0);
}
var effectiveSpeed = (f) => fighterDef(f.id).stats.spd * stageMultiplier(f.stages.spd);
function computeDamage(att, def, move, power, roll) {
  const A = fighterDef(att.id);
  const D = fighterDef(def.id);
  const at = traitOf(A);
  const dt = traitOf(D);
  const struggle = move.id === STRUGGLE.id;
  let discipline = move.discipline;
  let ring = struggle ? 1 : matchup(discipline, D.disciplines);
  if (move.adapts) for (const d of A.disciplines) {
    const m = matchup(d, D.disciplines);
    if (m > ring) {
      ring = m;
      discipline = d;
    }
  }
  const grader = Boolean(at.grader);
  const burn = att.status === "burn" ? BURN_ATK : 1;
  const atk = A.stats.atk * stageMultiplier(att.stages.atk) * burn;
  let defStage = def.stages.def;
  if (defStage > 0) defStage = grader ? 0 : defStage * (1 - (move.piercing ?? 0));
  const dfn = D.stats.def * stageMultiplier(defStage);
  const home = !struggle && A.disciplines.includes(discipline) ? HOME : 1;
  const finisher = move.executeThreshold && def.hp / def.maxHp <= move.executeThreshold ? FINISHER : 1;
  const mod = at.attack ? at.attack(ctx(att), { def: D, f: def }) : null;
  const upset = mod?.name === "upset" ? mod.value : 1;
  const compound = mod?.name === "compound" ? mod.value : 1;
  const crit = roll.crit ? CRIT : 1;
  let perHit = Math.max(1, Math.round(power * (atk / dfn) * K * home * ring * finisher * upset * compound * roll.spread * crit));
  let capped = false;
  if (dt.hitCap) {
    const cap = dt.hitCap(ctx(def));
    if (perHit > cap) {
      perHit = cap;
      capped = true;
    }
  }
  const raw = perHit * roll.hits;
  const barrier = grader ? 0 : Math.round(raw * def.barrier);
  const guard = roll.guarded ? Math.round((raw - barrier) * 0.5) : 0;
  const dealt = Math.max(0, raw - barrier - guard);
  const r = {
    power,
    atk: Math.round(atk),
    atkStat: A.stats.atk,
    atkStage: att.stages.atk,
    burn,
    def: Math.round(dfn),
    defStat: D.stats.def,
    defStage: Math.round(defStage * 100) / 100,
    k: K,
    home,
    ring,
    discipline: struggle ? "Neutral" : discipline,
    finisher,
    upset,
    compound,
    spread: Math.round(roll.spread * 1e3) / 1e3,
    crit,
    perHit,
    hits: roll.hits,
    capped,
    raw,
    barrier,
    guard,
    relaunch: 0,
    dealt,
    line: ""
  };
  r.line = receiptLine(r);
  return r;
}
var fmt = (n) => String(Math.round(n * 1e3) / 1e3);
function receiptLine(r) {
  const parts = [fmt(r.power), `${r.atk}/${r.def}`, fmt(r.k)];
  if (r.home !== 1) parts.push(`${fmt(r.home)} home`);
  if (r.ring !== 1) parts.push(`${fmt(r.ring)} ring`);
  if (r.finisher !== 1) parts.push(`${fmt(r.finisher)} finisher`);
  if (r.upset !== 1) parts.push(`${fmt(r.upset)} upset`);
  if (r.compound !== 1) parts.push(`${fmt(r.compound)} compounding`);
  if (r.spread !== 1) parts.push(`${fmt(r.spread)} spread`);
  if (r.crit !== 1) parts.push(`${fmt(r.crit)} critical`);
  let line = `${parts.join(" \xD7 ")} = ${r.perHit}`;
  if (r.capped) line += " capped at half HP";
  if (r.hits > 1) line += ` \xD7 ${r.hits} hits = ${r.raw}`;
  if (r.barrier) line += `, barrier \u2212${r.barrier}`;
  if (r.guard) line += `, guard \u2212${r.guard}`;
  if (r.relaunch) line += `, relaunch \u2212${r.relaunch}`;
  if (r.raw !== r.dealt + r.relaunch || r.barrier || r.guard) line += ` \u2192 ${r.dealt}`;
  return line;
}
var moveRef = (move, index, discipline) => ({ index, id: move.id, name: move.name, discipline: move.id === STRUGGLE.id ? "Neutral" : discipline ?? move.discipline });
function knockouts(em) {
  for (const side of SIDES) for (const f of em.state.sides[side].team) {
    if (f.hp <= 0 && !f.down) {
      f.down = true;
      em.state.stats[other(side)].kos++;
      emit(em, { kind: "ko", side, fighter: f.uid, card: f.id });
    }
  }
}
function applyStage(f, stat, amount) {
  f.stages[stat] = clampStage(f.stages[stat] + amount);
  return f.stages[stat];
}
function useMove(em, side, action, guards) {
  const { state } = em;
  const att = activeOf(state, side);
  const foeSide = other(side);
  const def = activeOf(state, foeSide);
  if (att.hp <= 0 || def.hp <= 0) return;
  const A = fighterDef(att.id);
  const at = traitOf(A);
  const move = moveOf(att, action.index);
  if (!move) return;
  if (att.status === "sleep" || att.status === "stun") {
    const status = att.status;
    const remaining = Math.max(0, att.statusTurns - 1);
    const skip = status === "sleep" ? remaining > 0 : draw(state) < 0.25;
    att.statusTurns = remaining;
    if (remaining === 0) att.status = null;
    emit(em, { kind: "status", side, fighter: att.uid, status, change: skip ? "skip" : remaining === 0 ? "cleared" : "continue" });
    if (skip) return;
  }
  const struggle = action.index === -1;
  if (!struggle && att.pp[action.index] <= 0) return;
  const priority = priorityOf(att, action);
  const nums = moveNumbers(att, move, action.wght);
  const ppBefore = struggle ? 0 : att.pp[action.index];
  const first = !struggle && att.used[action.index] === 0;
  if (!struggle) {
    att.pp[action.index]--;
    att.used[action.index]++;
  }
  const wasFresh = att.fresh;
  att.fresh = false;
  const ref = moveRef(move, action.index);
  emit(em, { kind: "move", side, actor: att.uid, card: att.id, target: def.uid, move: ref, power: nums.power, accuracy: nums.accuracy, priority, ...nums.wght !== void 0 ? { wght: nums.wght } : {}, pp: [ppBefore, struggle ? 0 : att.pp[action.index]], struggle, first });
  if (A.trait.name === "Preloaded" && wasFresh) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Preloaded", detail: "Priority +1", value: 1 });
  if (A.trait.name === "Cached" && !struggle && att.used[action.index] > 1) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Cached", detail: "Priority +1", value: 1 });
  if (A.trait.name === "Variable" && nums.wght !== void 0) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Variable", detail: `wght ${nums.wght}`, value: nums.wght });
  if (A.trait.name === "Deterministic" && move.accuracy < 1) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Deterministic", detail: "100%", value: 1 });
  const roll = draw(state);
  if (roll > nums.accuracy) {
    state.stats[side].misses++;
    emit(em, { kind: "miss", side, actor: att.uid, target: def.uid, move: ref, accuracy: nums.accuracy, roll: Math.round(roll * 1e3) / 1e3 });
    return;
  }
  let dealt = 0;
  if (nums.power > 0) {
    const critChance = Math.min(0.8, (move.critChance ?? BASE_CRIT) + att.critBoost);
    const critRoll = draw(state);
    const crit = critRoll < critChance;
    const spreadRoll = 0.92 + draw(state) * 0.16;
    const spread = at.spread ? at.spread(spreadRoll) : spreadRoll;
    let hits = 1;
    if (move.hits) {
      const rolled = move.hits.min + Math.floor(draw(state) * (move.hits.max - move.hits.min + 1));
      hits = at.hits ? at.hits(ctx(att), move, rolled) : rolled;
      if (at.hits) emit(em, { kind: "trait", side, fighter: att.uid, trait: A.trait.name, detail: `${hits} Hits`, value: hits });
    }
    att.critBoost = 0;
    const r = computeDamage(att, def, move, nums.power, { crit, spread, hits, guarded: guards.has(def.uid) });
    if (at.spread && spread !== spreadRoll) emit(em, { kind: "trait", side, fighter: att.uid, trait: A.trait.name, detail: "\xD71", value: 1 });
    if (r.upset !== 1) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Upset", detail: `\xD7${r.upset}`, value: r.upset });
    if (r.compound !== 1) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Compounding", detail: `\xD7${r.compound}`, value: r.compound });
    if (at.grader && (def.barrier > 0 || def.stages.def > 0)) emit(em, { kind: "trait", side, fighter: att.uid, trait: "Hidden Grader", detail: "" });
    if (crit) {
      state.stats[side].crits++;
      emit(em, { kind: "crit", side, actor: att.uid, target: def.uid, move: ref, chance: Math.round(critChance * 1e3) / 1e3, roll: Math.round(critRoll * 1e3) / 1e3 });
    }
    const before = def.hp;
    dealt = Math.min(def.hp, r.dealt);
    let relaunched = false;
    const dt = traitOf(fighterDef(def.id));
    if (dealt >= def.hp && dt.relaunch && dt.relaunch(ctx(def))) {
      relaunched = true;
      r.relaunch = dealt - (def.hp - 1);
      dealt = def.hp - 1;
    }
    if (r.dealt !== dealt) {
      r.dealt = dealt;
      r.line = receiptLine(r);
    }
    if (!at.grader) def.barrier = 0;
    def.hp -= dealt;
    if (!att.landed.includes(action.index) && action.index >= 0) att.landed.push(action.index);
    state.stats[side].damageDealt += dealt;
    state.stats[foeSide].damageTaken += dealt;
    if (r.ring > 1) state.stats[side].superEffective++;
    emit(em, { kind: "hit", side, actor: att.uid, target: def.uid, move: moveRef(move, action.index, r.discipline), damage: dealt, hits, crit, effectiveness: r.ring, discipline: r.discipline, hp: [before, def.hp], ko: def.hp <= 0, receipt: r });
    if (r.capped) emit(em, { kind: "trait", side: foeSide, fighter: def.uid, trait: "Per-Rule Cap", detail: `\u2264 ${r.perHit}`, value: r.perHit });
    if (relaunched) emit(em, { kind: "trait", side: foeSide, fighter: def.uid, trait: "Relaunch", detail: "1 HP", value: 1 });
  }
  const fx = move.selfEffect && draw(state) < move.selfEffect.chance ? move.selfEffect : void 0;
  if (move.effect && def.hp > 0 && !def.status && draw(state) < move.effect.chance) {
    const dt = traitOf(fighterDef(def.id));
    if (dt.immune?.(move.effect.type)) emit(em, { kind: "trait", side: foeSide, fighter: def.uid, trait: fighterDef(def.id).trait.name, detail: "" });
    else {
      def.status = move.effect.type;
      def.statusTurns = move.effect.type === "sleep" ? 2 : 3;
      state.stats[side].statuses++;
      emit(em, { kind: "status", side: foeSide, fighter: def.uid, status: move.effect.type, change: "applied" });
    }
  }
  if (fx) {
    const t = fx.type;
    if (t === "atkUp" || t === "defUp" || t === "spdUp") {
      const stat = t.slice(0, 3);
      emit(em, { kind: "effect", side, fighter: att.uid, effect: t, amount: fx.amount, stage: applyStage(att, stat, fx.amount) });
    } else if (t === "critUp") {
      att.critBoost = Math.max(att.critBoost, fx.amount);
      emit(em, { kind: "effect", side, fighter: att.uid, effect: t, amount: fx.amount });
    } else if (t === "barrier") {
      att.barrier = Math.max(att.barrier, fx.amount);
      emit(em, { kind: "effect", side, fighter: att.uid, effect: t, amount: fx.amount });
    } else if (t === "heal" || t === "drain") {
      const before = att.hp;
      const amount = t === "heal" ? fx.amount : Math.round(dealt * fx.amount);
      att.hp = Math.min(att.maxHp, att.hp + amount);
      emit(em, { kind: "effect", side, fighter: att.uid, effect: t, amount: att.hp - before, hp: [before, att.hp] });
    } else if (t === "recoil") {
      const before = att.hp;
      att.hp = Math.max(0, att.hp - Math.max(1, Math.round(dealt * fx.amount)));
      emit(em, { kind: "effect", side, fighter: att.uid, effect: t, amount: before - att.hp, hp: [before, att.hp] });
    }
  }
}
function useItem(em, side, action) {
  const s = em.state.sides[side];
  const actor = activeOf(em.state, side);
  const t = s.team[action.target];
  if (s.kit[action.item] <= 0 || !canUseItem(action.item, t)) return;
  const item = itemById(action.item);
  const before = t.hp;
  let detail;
  if (action.item === "rollback") {
    t.hp = Math.max(1, Math.round(t.maxHp * 0.5));
    t.status = null;
    t.statusTurns = 0;
    t.down = false;
    detail = `+${t.hp - before} HP`;
  } else if (action.item === "debugger") {
    detail = "Cured";
    t.status = null;
    t.statusTurns = 0;
  } else if (BOOST[action.item]) {
    const stat = BOOST[action.item];
    const was = t.stages[stat];
    applyStage(t, stat, 2);
    detail = `${stat.toUpperCase()} +${t.stages[stat] - was}`;
  } else {
    const amount = HEAL[action.item] ?? t.maxHp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    detail = `+${t.hp - before} HP`;
  }
  s.kit[action.item]--;
  em.state.stats[side].items++;
  emit(em, { kind: "item", side, actor: actor.uid, target: t.uid, item: action.item, name: item.name, detail, hp: [before, t.hp] });
}
function switchIn(em, side, to, reason) {
  const s = em.state.sides[side];
  const out = s.team[s.active];
  const into = s.team[to];
  const keep = traitOf(fighterDef(out.id)).switchOut;
  if (keep && out.hp > 0) {
    const note = keep(ctx(out));
    if (note) emit(em, { kind: "trait", side, fighter: out.uid, trait: "Persistent", detail: note });
  } else out.stages = { atk: 0, def: 0, spd: 0 };
  out.landed = [];
  out.turnsIn = 0;
  s.active = to;
  into.fresh = true;
  into.turnsIn = 0;
  if (reason === "choice") em.state.stats[side].switches++;
  emit(em, { kind: "switch", side, from: out.uid, to: into.uid, card: into.id, reason });
}
function finish(em, winner, reason) {
  em.state.winner = winner;
  em.state.phase = "over";
  em.state.pending = [];
  emit(em, { kind: "result", winner, reason, turns: em.state.turn });
}
function endOfTurn(em) {
  const { state } = em;
  em.act = 3;
  for (const side of SIDES) {
    const f = activeOf(state, side);
    if (f.hp <= 0 || f.status !== "burn" && f.status !== "poison") continue;
    const status = f.status;
    const before = f.hp;
    const damage = Math.min(f.hp, Math.max(1, Math.round(f.maxHp * (status === "burn" ? 0.06 : 0.085))));
    f.hp -= damage;
    f.statusTurns = Math.max(0, f.statusTurns - 1);
    if (f.statusTurns === 0) f.status = null;
    emit(em, { kind: "status", side, fighter: f.uid, status, change: "tick", damage, hp: [before, f.hp] });
    if (f.status === null && f.hp > 0) emit(em, { kind: "status", side, fighter: f.uid, status, change: "cleared" });
  }
  knockouts(em);
  for (const side of SIDES) {
    const s = state.sides[side];
    s.team.forEach((f, i) => {
      if (f.hp <= 0) return;
      const t = traitOf(fighterDef(f.id));
      if (i === s.active) {
        f.turnsIn++;
        const gain = t.endActive?.(ctx(f));
        if (gain && f.stages[gain.stat] < gain.cap) {
          f.stages[gain.stat] = Math.min(gain.cap, f.stages[gain.stat] + 1);
          emit(em, { kind: "trait", side, fighter: f.uid, trait: fighterDef(f.id).trait.name, detail: `${gain.stat.toUpperCase()} +1`, value: f.stages[gain.stat] });
        }
      } else {
        const heal = t.endBench?.(ctx(f)) ?? 0;
        if (heal > 0) {
          f.hp += heal;
          emit(em, { kind: "trait", side, fighter: f.uid, trait: fighterDef(f.id).trait.name, detail: `+${heal} HP`, value: heal });
        }
      }
    });
  }
  const left = { player: living(state.sides.player).length, rival: living(state.sides.rival).length };
  if (!left.player || !left.rival) return finish(em, !left.player && !left.rival ? "draw" : left.player ? "player" : "rival", "defeat");
  if (state.turn >= ROUND_LIMIT) return finish(em, "draw", "limit");
  state.pending = SIDES.filter((side) => activeOf(state, side).hp <= 0);
  state.phase = state.pending.length ? "replace" : "command";
  state.turn++;
}
function resolution(em) {
  return { state: em.state, events: em.events, errors: [] };
}
var reject = (state, errors) => ({ state, events: [], errors });
function submitTurn(source, player, rival, options = {}) {
  const errors = [...validateAction(source, "player", player).map((e) => `Player: ${e}`), ...validateAction(source, "rival", rival).map((e) => `Rival: ${e}`)];
  if (errors.length) return reject(source, errors);
  const state = clone(source);
  const em = { state, events: [], snapshots: options.snapshots !== false, act: 0 };
  state.log.push({ kind: "turn", turn: state.turn, player, rival });
  const queue = SIDES.map((side) => {
    const action = side === "player" ? player : rival;
    const f = activeOf(state, side);
    return { side, action, uid: f.uid, priority: priorityOf(f, action), speed: effectiveSpeed(f), tie: draw(state) };
  }).sort((a, b) => b.priority - a.priority || b.speed - a.speed || a.tie - b.tie);
  emit(em, { kind: "turn", order: queue.map(({ side, uid, action, priority, speed }) => ({ side, uid, action: action.kind, priority, speed: Math.round(speed * 100) / 100 })) });
  const guards = /* @__PURE__ */ new Set();
  for (const [i, { side, action, uid }] of queue.entries()) {
    em.act = i + 1;
    const f = activeOf(state, side);
    if (f.uid !== uid || f.hp <= 0) continue;
    if (action.kind === "switch") switchIn(em, side, action.to, "choice");
    else if (action.kind === "item") useItem(em, side, action);
    else if (action.kind === "guard") {
      guards.add(f.uid);
      state.stats[side].guards++;
      emit(em, { kind: "guard", side, fighter: f.uid });
    } else useMove(em, side, action, guards);
    knockouts(em);
  }
  endOfTurn(em);
  return resolution(em);
}
function submitReplacement(source, side, to, options = {}) {
  if (source.phase !== "replace" || !source.pending.includes(side)) return reject(source, ["No replacement is needed."]);
  const t = source.sides[side].team[to];
  if (!Number.isInteger(to) || !t || t.hp <= 0 || to === source.sides[side].active) return reject(source, ["Choose a living reserve."]);
  const state = clone(source);
  const em = { state, events: [], snapshots: options.snapshots !== false, act: 0 };
  state.log.push({ kind: "replace", turn: state.turn, side, to });
  switchIn(em, side, to, "replace");
  state.pending = state.pending.filter((s) => s !== side);
  if (!state.pending.length) state.phase = "command";
  return resolution(em);
}
function leave(source, side, options = {}) {
  if (source.phase === "over") return reject(source, ["The battle is over."]);
  const state = clone(source);
  const em = { state, events: [], snapshots: options.snapshots !== false, act: 0 };
  state.log.push({ kind: "leave", turn: state.turn, side });
  finish(em, other(side), "leave");
  return resolution(em);
}
function reservesFor(state, side) {
  const s = state.sides[side];
  return s.team.map((f, i) => f.hp > 0 && i !== s.active ? i : -1).filter((i) => i >= 0);
}

// ../../../../r3/battle/engine/src/cpu.ts
var expectedHits = (f, move) => {
  if (!move.hits) return 1;
  const t = traitOf(fighterDef(f.id));
  return t.hits ? t.hits({ def: fighterDef(f.id), f }, move, move.hits.max) : (move.hits.min + move.hits.max) / 2;
};
function expectedDamage(a, d, move, wght) {
  const nums = moveNumbers(a, move, wght);
  if (nums.power <= 0) return { damage: 0, accuracy: nums.accuracy, power: 0 };
  const r = computeDamage(a, d, move, nums.power, { crit: false, spread: 1, hits: 1, guarded: false });
  return { damage: r.dealt * expectedHits(a, move), accuracy: nums.accuracy, power: nums.power };
}
var relaunchReady = (f) => fighterDef(f.id).trait.name === "Relaunch" && !f.relaunched;
var immuneTo = (f, status) => Boolean(traitOf(fighterDef(f.id)).immune?.(status));
function scoreMove(state, side, a, d, index, wght) {
  const move = moveOf(a, index);
  const { damage, accuracy } = expectedDamage(a, d, move, wght);
  const ratio = a.hp / a.maxHp;
  const priority = priorityOf(a, { kind: "move", index });
  const kills = damage >= d.hp && !relaunchReady(d);
  let score = Math.min(damage, d.hp) * accuracy;
  if (kills) score += (60 + priority * 20) * accuracy;
  score += priority * 14;
  if (move.effect && !d.status && !immuneTo(d, move.effect.type) && damage < d.hp) score += move.effect.chance * 30 * accuracy;
  const fx = move.selfEffect;
  if (fx) {
    if (fx.type === "heal") score += Math.min(fx.amount, a.maxHp - a.hp) * 0.9;
    else if (fx.type === "drain") score += Math.min(damage * fx.amount, a.maxHp - a.hp) * 0.6;
    else if (fx.type === "barrier") score += a.barrier ? 0 : ratio > 0.4 ? 28 : 8;
    else if (fx.type === "critUp") score += a.critBoost ? 0 : 20;
    else if (fx.type === "atkUp") score += a.stages.atk < 2 && ratio > 0.5 ? 30 * fx.amount : 0;
    else if (fx.type === "defUp") score += a.stages.def < 2 && ratio > 0.5 ? 22 * fx.amount : 0;
    else if (fx.type === "spdUp") score += a.stages.spd < 2 && effectiveSpeed(a) <= effectiveSpeed(d) ? 18 * fx.amount : 0;
  }
  void state;
  void side;
  return score;
}
function chooseWeight(state, side, index) {
  const a = activeOf(state, side);
  const move = moveOf(a, index);
  if (!move?.axis || !traitOf(fighterDef(a.id)).axis) return void 0;
  const d = activeOf(state, other(side));
  let best = move.axis.default, bestScore = -Infinity;
  for (let w = move.axis.min; w <= move.axis.max; w += 100) {
    const s = scoreMove(state, side, a, d, index, w);
    if (s > bestScore + 1e-9) {
      bestScore = s;
      best = w;
    }
  }
  return best;
}
function chooseAction(state, side) {
  const legal = legalActions(state, side);
  if (!legal.length) throw new Error(`No legal command for ${side}.`);
  const a = activeOf(state, side);
  const d = activeOf(state, other(side));
  const s = state.sides[side];
  const jitter = stream(hash(state.seed, state.turn, side));
  let best = legal[0], bestScore = -Infinity;
  for (const action of legal) {
    let score;
    let chosen = action;
    if (action.kind === "move") {
      const wght = chooseWeight(state, side, action.index);
      if (wght !== void 0) chosen = { ...action, wght };
      score = scoreMove(state, side, a, d, action.index, wght) * (0.94 + jitter() * 0.12);
    } else if (action.kind === "guard") score = -10;
    else if (action.kind === "switch") {
      const incoming = s.team[action.to];
      score = a.pp.every((p) => p <= 0) && incoming.pp.some((p) => p > 0) ? 120 : -15;
    } else {
      const t = s.team[action.target];
      const self = action.target === s.active;
      if (action.item === "debugger") score = t.status && self ? 145 : -20;
      else if (action.item === "rollback") score = 100;
      else if (self && t.hp / t.maxHp < 0.35 && (HEAL[action.item] || action.item === "system-restore")) score = Math.min(t.maxHp - t.hp, HEAL[action.item] ?? t.maxHp) / t.maxHp * 300;
      else score = -20;
    }
    if (score > bestScore) {
      bestScore = score;
      best = chosen;
    }
  }
  return best;
}
function chooseReplacement(state, side) {
  const s = state.sides[side];
  const foe = activeOf(state, other(side));
  let best = -1, bestScore = -Infinity;
  s.team.forEach((f, i) => {
    if (f.hp <= 0 || i === s.active) return;
    const dealt = Math.max(0, ...fighterDef(f.id).moves.map((m) => expectedDamage(f, foe, m).damage));
    const taken = Math.max(0, ...fighterDef(foe.id).moves.map((m) => expectedDamage(foe, f, m).damage));
    const ring = Math.max(...fighterDef(f.id).disciplines.map((dd) => matchup(dd, fighterDef(foe.id).disciplines)));
    const score = dealt - taken + f.hp / f.maxHp * 50 + ring * 5;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

// ../../../../r3/battle/engine/src/replay.ts
function legalTeams() {
  const ids = FIGHTERS.map((f) => f.id);
  const out = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) {
    const t = [ids[i], ids[j], ids[k]];
    if (teamCost(t) <= RULES.team.budget) out.push(t);
  }
  return out;
}
function rivalFor(team, seed) {
  const random = stream(hash("rival", seed, ...team));
  const cost = teamCost(team);
  const pool = legalTeams().filter((t) => t.every((id) => !team.includes(id)));
  const near = pool.filter((t) => Math.abs(teamCost(t) - cost) <= 1);
  const from = near.length ? near : pool;
  const pick = [...from[Math.floor(random() * from.length)]];
  for (let i = pick.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pick[i], pick[j]] = [pick[j], pick[i]];
  }
  return pick;
}
var ITEM_CODE = Object.fromEntries(ITEMS.map((i) => [i.id, i.code]));
var CODE_ITEM = Object.fromEntries(ITEMS.map((i) => [i.code, i.id]));
function encodeAction(a) {
  switch (a.kind) {
    case "move":
      return `m${a.index + 1}${a.wght !== void 0 ? `@${a.wght}` : ""}`;
    case "switch":
      return `s${a.to + 1}`;
    case "guard":
      return "g";
    case "item":
      return `i${ITEM_CODE[a.item]}${a.target + 1}`;
  }
}
function decodeAction(t) {
  let m;
  if (m = t.match(/^m(\d)(?:@(\d+))?$/)) return m[2] ? { kind: "move", index: Number(m[1]) - 1, wght: Number(m[2]) } : { kind: "move", index: Number(m[1]) - 1 };
  if (m = t.match(/^s(\d)$/)) return { kind: "switch", to: Number(m[1]) - 1 };
  if (t === "g") return { kind: "guard" };
  if ((m = t.match(/^i([a-z]{2})(\d)$/)) && CODE_ITEM[m[1]]) return { kind: "item", item: CODE_ITEM[m[1]], target: Number(m[2]) - 1 };
  throw new Error(`Unreadable command "${t}".`);
}
function encodeLog(log) {
  return log.map((s) => s.kind === "turn" ? `${encodeAction(s.player)}/${encodeAction(s.rival)}` : s.kind === "replace" ? `r${s.side[0]}${s.to + 1}` : `x${s.side[0]}`).join("~");
}
function decodeLog(text) {
  return String(text || "").split("~").filter(Boolean).map((t) => {
    const side = (c) => {
      if (c === "p") return "player";
      if (c === "r") return "rival";
      throw new Error(`Unreadable side in "${t}".`);
    };
    if (/^r[pr]\d$/.test(t)) return { kind: "replace", side: side(t[1]), to: Number(t[2]) - 1 };
    if (/^x[pr]$/.test(t)) return { kind: "leave", side: side(t[1]) };
    const [p, r] = t.split("/");
    if (!p || !r) throw new Error(`Unreadable turn "${t}".`);
    return { kind: "turn", player: decodeAction(p), rival: decodeAction(r) };
  });
}
var recordOf = (state) => ({ v: VERSION, team: [...state.teams.player], rival: [...state.teams.rival], seed: state.seed, log: encodeLog(state.log) });
function replay(record, options = {}) {
  try {
    if (record.v !== VERSION) return { state: null, events: [], error: `Unsupported rules version ${String(record.v)}.` };
    for (const ids of [record.team, record.rival]) {
      const e = validateTeam(ids);
      if (e.length) return { state: null, events: [], error: e.join(" ") };
    }
    let { state, events } = createBattle(record.team, record.rival, { ...options, seed: record.seed });
    const all = [...events];
    for (const step of decodeLog(record.log)) {
      const r = step.kind === "turn" ? submitTurn(state, step.player, step.rival, options) : step.kind === "replace" ? submitReplacement(state, step.side, step.to, options) : leave(state, step.side, options);
      if (r.errors.length) return { state: null, events: [], error: `Illegal step: ${r.errors.join(" ")}` };
      state = r.state;
      all.push(...r.events);
    }
    return { state, events: all, error: null };
  } catch (e) {
    return { state: null, events: [], error: e instanceof Error ? e.message : String(e) };
  }
}
function simulate(team, rival, seed, options = {}) {
  const opts = { snapshots: options.snapshots ?? false };
  let { state, events } = createBattle(team, rival, { ...opts, seed });
  options.onEvents?.(events);
  for (let guard = 0; state.phase !== "over" && guard < 1e3; guard++) {
    let r;
    if (state.phase === "replace") {
      const side = state.pending[0];
      r = submitReplacement(state, side, chooseReplacement(state, side), opts);
    } else r = submitTurn(state, chooseAction(state, "player"), chooseAction(state, "rival"), opts);
    if (r.errors.length) throw new Error(r.errors.join(" "));
    state = r.state;
    options.onEvents?.(r.events);
  }
  return { state, record: recordOf(state) };
}

// ../../../../r3/battle/api/showdown.ts
var list = (v) => v === void 0 ? void 0 : Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean);
var newSeed = () => {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] >>> 0;
  return (Date.now() ^ 1540483477) >>> 0;
};
var globalListeners = /* @__PURE__ */ new Map();
var Match = class {
  state;
  /** Every event so far, in order. */
  events = [];
  listeners = /* @__PURE__ */ new Map();
  constructor(options) {
    const team = list(options.team) ?? [];
    const teamErrors = validateTeam(team);
    if (teamErrors.length) throw new Error(`Team: ${teamErrors.join(" ")}`);
    const seed = options.seed === void 0 || options.seed === "" ? newSeed() : Number(options.seed) >>> 0;
    const rival = list(options.rival) ?? rivalFor(team, seed);
    const rivalErrors = validateTeam(rival);
    if (rivalErrors.length) throw new Error(`Rival: ${rivalErrors.join(" ")}`);
    if (options.log) {
      const r = replay({ v: VERSION, team, rival, seed, log: options.log });
      if (r.error || !r.state) throw new Error(`Replay: ${r.error}`);
      this.state = r.state;
      this.events.push(...r.events);
    } else {
      const { state, events } = createBattle(team, rival, { seed });
      this.state = state;
      this.events.push(...events);
    }
  }
  get phase() {
    return this.state.phase;
  }
  get winner() {
    return this.state.winner;
  }
  get turn() {
    return this.state.turn;
  }
  get seed() {
    return this.state.seed;
  }
  get team() {
    return this.state.teams.player;
  }
  get rival() {
    return this.state.teams.rival;
  }
  /** The opening events (both leads entering); present them before the first command. */
  get opening() {
    return this.events.filter((e) => e.turn === 1 && e.act === 0 && e.kind === "switch");
  }
  active(side = "player") {
    return activeOf(this.state, side);
  }
  /** Roster id of the card behind a uid such as "rival:2". */
  cardOf = (uid) => {
    const [side, slot] = uid.split(":");
    return this.state.teams[side]?.[Number(slot)] ?? uid;
  };
  fighter(id) {
    return fighterDef(id);
  }
  /** The player's legal commands right now (empty while a replacement is pending or after the end). */
  legal() {
    return legalActions(this.state, "player");
  }
  validate(action) {
    return validateAction(this.state, "player", action);
  }
  /** Does the player need to choose a replacement? */
  get mustReplace() {
    return this.state.phase === "replace" && this.state.pending.includes("player");
  }
  reserves(side = "player") {
    return reservesFor(this.state, side);
  }
  /** The side's Kit: every item, how many are left, and the team slots it can be used on now. */
  kit(side = "player") {
    const s = this.state.sides[side];
    return ITEMS.map((it) => ({ id: it.id, name: it.name, short: it.short, left: s.kit[it.id], targets: s.kit[it.id] > 0 ? s.team.flatMap((f, i) => canUseItem(it.id, f) ? [i] : []) : [] }));
  }
  /** One command from the player. The rival answers with the shared fair policy. Returns the events. */
  act(action) {
    const r = submitTurn(this.state, action, chooseAction(this.state, "rival"));
    if (r.errors.length) throw new Error(r.errors.join(" "));
    return this.commit(r.events, r.state);
  }
  /** Fill the player's knocked-out slot. */
  replace(to) {
    const r = submitReplacement(this.state, "player", to);
    if (r.errors.length) throw new Error(r.errors.join(" "));
    return this.commit(r.events, r.state);
  }
  leave() {
    const r = leave(this.state, "player");
    if (r.errors.length) throw new Error(r.errors.join(" "));
    return this.commit(r.events, r.state);
  }
  /** What Auto would do now: the same policy the rival uses. */
  autoAction() {
    if (this.state.phase === "over") return null;
    if (this.mustReplace) return { kind: "replace", to: chooseReplacement(this.state, "player") };
    if (this.state.phase !== "command") return null;
    return chooseAction(this.state, "player");
  }
  /** Take Auto's command. */
  step() {
    const a = this.autoAction();
    if (!a) return [];
    return a.kind === "replace" ? this.replace(a.to) : this.act(a);
  }
  commit(events, state) {
    this.state = state;
    if (state.phase === "replace" && state.pending.includes("rival")) {
      const r = submitReplacement(state, "rival", chooseReplacement(state, "rival"));
      if (!r.errors.length) {
        this.state = r.state;
        events = [...events, ...r.events];
      }
    }
    this.events.push(...events);
    this.dispatch(events);
    return events;
  }
  on(kind, fn) {
    if (!this.listeners.has(kind)) this.listeners.set(kind, /* @__PURE__ */ new Set());
    this.listeners.get(kind).add(fn);
    return () => this.listeners.get(kind)?.delete(fn);
  }
  dispatch(events) {
    for (const map of [this.listeners, globalListeners]) {
      for (const fn of map.get("batch") ?? []) fn(events, this);
      for (const e of events) {
        for (const fn of map.get(e.kind) ?? []) fn(e, this);
        for (const fn of map.get("*") ?? []) fn(e, this);
      }
    }
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") window.dispatchEvent(new CustomEvent("showdown", { detail: { events, match: this } }));
  }
  record() {
    return recordOf(this.state);
  }
  /** The hash that replays this battle exactly to its current point. */
  hash() {
    const r = this.record();
    return toHash({ team: r.team, rival: r.rival, seed: r.seed, log: r.log || void 0 });
  }
};
function parseHash(hash2) {
  const raw = String(hash2 || "").replace(/^#/, "");
  const query = raw.includes("=") ? raw.slice(raw.search(/[?&]?[a-z]+=/i)).replace(/^[?&]/, "") : "";
  const p = new URLSearchParams(query);
  const out = {};
  const team = p.get("team");
  if (team) out.team = list(team);
  const rival = p.get("rival");
  if (rival) out.rival = list(rival);
  const seed = p.get("seed");
  if (seed && /^\d+$/.test(seed)) out.seed = Number(seed) >>> 0;
  const log = p.get("log");
  if (log) out.log = log;
  const cut = p.get("cut");
  if (cut === "auto" || cut === "full" || cut === "short" || cut === "off") out.cut = cut;
  return out;
}
function toHash(p) {
  const parts = [];
  if (p.team) parts.push(`team=${p.team.join(",")}`);
  if (p.rival) parts.push(`rival=${p.rival.join(",")}`);
  if (p.seed !== void 0) parts.push(`seed=${p.seed >>> 0}`);
  if (p.log) parts.push(`log=${p.log}`);
  if (p.cut) parts.push(`cut=${p.cut}`);
  return `#${parts.join("&")}`;
}
export {
  BASE_CRIT,
  CRIT,
  FIGHTERS,
  FINISHER,
  HOME,
  ITEMS,
  K,
  Match,
  PRIORITY,
  RING,
  ROUND_LIMIT,
  RULES,
  SIDES,
  STRONG,
  STRUGGLE,
  TRAITS,
  VERSION,
  WEAK,
  activeOf,
  canUseItem,
  chooseAction,
  chooseReplacement,
  chooseWeight,
  computeDamage,
  createBattle,
  decodeAction,
  decodeLog,
  draw,
  effectiveSpeed,
  encodeAction,
  encodeLog,
  expectedDamage,
  fighterDef,
  hash,
  itemById,
  leave,
  legalActions,
  legalTeams,
  matchup,
  moveNumbers,
  moveOf,
  newKit,
  other,
  parseHash,
  priorityOf,
  receiptLine,
  recordOf,
  replay,
  reservesFor,
  rivalFor,
  simulate,
  snapshot,
  stageMultiplier,
  stream,
  submitReplacement,
  submitTurn,
  teamCost,
  toHash,
  traitOf,
  validateAction,
  validateTeam
};
