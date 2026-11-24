# Catch & Sell

A cozy phone game: catch fish from around the world and sell them in your own shop.

- Design: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)

## How to run
```bash
npm install
npm run dev        # dev server (open on a phone-sized window; add ?debug=1 for fast timers)
npm run build      # type-check + production build
npm test           # Vitest unit tests (game logic)
npm run e2e        # Playwright e2e at 390×844 (add -- --trace off unless debugging)
```
Debug mode: append `?debug=1` (optionally `&seed=123`) — sells every 0.5 s, bites within 0.3 s, and exposes `window.__debug` (force bite/catch) for tests. Never on by default.
Saves live in `localStorage` under `catchandsell.save.v1`.
