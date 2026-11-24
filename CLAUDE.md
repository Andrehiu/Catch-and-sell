# Catch & Sell — instructions for Claude sessions

A cozy phone game: catch fish from around the world, then sell them automatically in your own fish shop.
Coins buy rod and boat upgrades. Design: `docs/GAME_DESIGN.md`. Plan: `ROADMAP.md`.

## Stack
- **Phaser 3** (latest stable 3.x, exact version pinned in `package.json`) + **TypeScript** + **Vite**.
- Runs in a phone browser. Store wrapping (Capacitor) comes later — do not add it yet.
- Tests: **Vitest** for game logic, **Playwright** for end-to-end checks in a phone-sized viewport.

## Commands (keep these working)
- `npm install`
- `npm run dev` — local dev server
- `npm run build` — production build, must pass with no TypeScript errors
- `npm test` — Vitest unit tests
- `npm run e2e` — Playwright e2e (pass `-- --trace off` unless debugging)

## Rules
1. **Phone first.** Design for portrait 390×844 CSS px. Touch targets ≥ 44 px. Scale to fit other phone sizes.
2. **Art is swappable.** The prototype uses pixel art (style B); the final game will use a painted storybook style (style D).
   - All visuals load through one art manifest (`src/art/manifest.ts`) keyed by id (`fish.giant_trevally`, `scene.coral_bay`, `ui.coin` …).
   - Game logic never references image files, colours of art, or sprite sizes directly.
   - Placeholder pixel art may be generated in code or committed as small PNGs under `public/art/pixel/`.
3. **Logic is separate from scenes.** Economy, rarity rolls, cooler, auto-sell, upgrades and saving live in `src/game/` as plain TypeScript with no Phaser imports, so they are unit-testable.
4. **Data-driven content.** Fish, regions and upgrades are defined in data files (`src/data/*.ts`), not hard-coded in scenes.
5. **Randomness is seedable** (pass an RNG in) so tests are deterministic.
6. **Saves** go to `localStorage` under a versioned key (`catchandsell.save.v1`) with a `version` field and safe fallback if the data is missing or corrupt.
7. **Debug mode**: `?debug=1` in the URL speeds up timers and allows forcing a bite, so e2e tests run fast. Never on by default.
8. **Git**: work only on the branch you were given. Never push to `main`. Small, clear commits.
9. Commit e2e screenshots of each main screen to `docs/screenshots/<version>/` at 390×844.

## Style B (prototype) palette
Pixel font: Pixelify Sans. Panels: navy `#24324A`, cream border/text `#FFF3D6`, hard drop shadow `#111827`.
Accent orange `#E0663C`. Sea `#2F8AA0`. Rarity colours (also always shown as text):
Common `#B8C2CC`, Uncommon `#6BCB77`, Rare `#5AA9E6`, Epic `#B48CF2`, Legendary `#F5B93A`.
