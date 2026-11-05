# kevinliu.studio

Kevin Liu's site: 26 of his projects as collectible cards, a battle to play them in, and their sound.

```bash
pnpm install
pnpm sync      # pull the finished round material (cards, battle, sound) from the design rounds
pnpm dev       # http://localhost:4321
pnpm build     # dist/, then the release guard
```

The synced folders (`public/ex`, `public/battle`, `public/sound`, `public/og`, `vendor/`) are committed so the host
can build without the rounds folder, and they are never edited by hand. See `docs/sync.md`.

| Doc | What |
| --- | --- |
| `docs/architecture.md` | the framework choice, layers, routes and paths |
| `docs/sync.md` | how round material arrives, transforms, the scan and the lock |
| `docs/content.md` | the card data, site facts, content rules and what carried over |
| `docs/sound.md` | the sound policy and wiring |
| `docs/battle.md` | the battle's modes, address and current state |
| `docs/deploy.md` | the build guard, deploy and the domain swap runbook |

Every page has a Markdown twin (`/index.md`, `/cards/<id>.md`) and answers `Accept: text/markdown`. `/llms.txt` lists
them all. Code is MIT where it is Kevin's; the card art, logos and sound are Kevin's and not licensed for reuse.
Katagami Sans is OFL (`public/fonts/OFL.txt`).
