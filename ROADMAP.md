# Roadmap

## v0.1 — pixel prototype (done — awaiting playtest)
Goal: the core loop is playable on a phone and feels good.
- [x] Project setup: Phaser 3 + TypeScript + Vite, Vitest, Playwright.
- [x] Fishing screen: cast → bite → hook → reel mini-game.
- [x] 8 fish across 3 regions (Coral Bay, North Atlantic, Amazon River) with rarities and sizes; simple region picker.
- [x] Cooler (capacity 10).
- [x] Shop tab with automatic selling and a small sale animation.
- [x] Fishdex tab (basic list with silhouettes for uncaught fish).
- [x] Upgrades tab present but shows "Coming soon".
- [x] Save/load on the phone (localStorage).
- [x] Debug mode for fast testing.

## v0.1.1 — installable on home screen (done)
- [x] Web app manifest (standalone, portrait) + pixel-fish icons (script in `scripts/`).
- [x] iOS meta tags and safe-area padding so the tabs clear the home bar.
- [x] Service worker: offline after one visit, cache named by git commit, "tap to update" bar.
- [x] GitHub Actions: Pages deploy on `main`, CI on push/PR.
- [x] E2E under the `/catch-and-sell/` sub-path (manifest, icons, SW control, offline reload).

## v0.2 — upgrades
- Rod tiers and boat tiers; boats unlock regions.
- More fish (aim for 20), including the first Legendary.
- Shop upgrades (bigger display, faster customers).

## v0.3 — cozy polish
- Day/night cycle, ambient sound and music.
- Customers with personality; small requests ("Anyone got a salmon?") for bonus coins.
- Catch-reveal screen with rarity fanfare.

## v0.4 — art switch
- Replace pixel art with the painted storybook style (D) through the art manifest.
- Test on real phones; performance pass.

## Later
- Wrap for app stores with Capacitor (Google Play US$25 one-time; Apple US$99/year).
- Diving / snorkel mode to spot fish underwater.
