# Roadmap

## v0.1 — pixel prototype (in progress)
Goal: the core loop is playable on a phone and feels good.
- Project setup: Phaser 3 + TypeScript + Vite, Vitest, Playwright.
- Fishing screen: cast → bite → hook → reel mini-game.
- 8 fish across 3 regions (Coral Bay, North Atlantic, Amazon River) with rarities and sizes; simple region picker.
- Cooler (capacity 10).
- Shop tab with automatic selling and a small sale animation.
- Fishdex tab (basic list with silhouettes for uncaught fish).
- Upgrades tab present but shows "Coming soon".
- Save/load on the phone (localStorage).
- Debug mode for fast testing.

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
