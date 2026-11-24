# Catch & Sell — game design

## Pitch
A relaxed, cozy phone game. Fish at spots around the world, fill your cooler, and your little shop sells the catch
automatically. Spend coins on better rods and boats to reach new waters and rarer fish. No fail states, no timers that punish you.

## Core loop
1. **Fish** — cast, wait for a bite, hook it, reel it in.
2. **Cooler** — caught fish go into the cooler (capacity 10 at start).
3. **Shop** — the stall sells fish from the cooler automatically, one at a time, with a small animation
   (customer walks up, fish slides across the counter, coin pops up).
4. **Upgrade** — coins buy rods (better odds, easier reeling) and boats (new regions). *(v0.2)*

The player can switch between Fish, Shop, Upgrades and Fishdex **at any time** using the bottom tabs.
Selling continues in the background while the app is open, whichever tab is showing.

## Fishing
- **Cast**: tap the Cast button. The bobber lands; wait 2–6 s (random).
- **Bite**: the bobber dips and "Bite!" shows. Tap within 1.2 s to hook. Missing it is fine — just cast again.
- **Reel**: hold the button to push the needle right, release to let it drift left. Keep the needle in the green zone
  to fill the catch meter; outside the zone the meter slowly drains. Full meter = caught. The fish never "escapes"
  for good — if the meter hits zero the fish swims off and you simply cast again (cozy, no punishment).
- Harder rarities: narrower green zone and a needle that wobbles more.
- Cooler full → Cast is disabled with a hint to visit the shop.

## Rarity
| Rarity | Base chance | Base price range (coins) | Reel difficulty |
|---|---|---|---|
| Common | 60% | 8–20 | easy |
| Uncommon | 25% | 30–60 | easy+ |
| Rare | 10% | 100–180 | medium |
| Epic | 4% | 350–600 | hard |
| Legendary | 1% | 1,200–2,000 | hardest |

Each caught fish gets a random size (±20% of its average). Sell price = base price × size factor, rounded.
Rarity is always shown as **text and colour** (never colour only).

## Regions and fish (world-wide)
Each region has its own fish list. v0.1 ships 3 regions; more come with boat upgrades.

| Region | Fish (rarity) |
|---|---|
| Coral Bay — Southeast Asia | Yellowstripe Scad (Common), Mangrove Jack (Uncommon), Giant Trevally (Rare) |
| North Atlantic | Atlantic Mackerel (Common), Atlantic Cod (Uncommon), Atlantic Salmon (Rare) |
| Amazon River | Red-bellied Piranha (Common), Arapaima (Epic) |

Later candidates: Mahi-mahi (Pacific), Arctic Char (Arctic), Bluefin Tuna, Oarfish, Coelacanth (Indian Ocean, Legendary),
Golden Arowana (Southeast Asia, Legendary).

If a region has no fish of a rolled rarity, roll down to the next lower rarity it has.

## Shop (auto-sell)
- Sells one fish every 4 s (debug mode: 0.5 s) while the cooler has fish.
- Sells the oldest fish first.
- Shop tab shows: the stall, the current customer, the fish being sold, a coin pop with the amount,
  today's total, and the cooler contents.
- Later upgrades (not v0.1): bigger display (sell 2 at once), faster customers, price boosts.

## Upgrades (v0.2)
- **Rods**: Bamboo (start) → Fiberglass → Carbon → Legend. Each raises rare+ odds and widens the green zone.
- **Boats**: Rowboat (start: Coral Bay) → Skiff (North Atlantic) → Trawler (Amazon River) → Research Vessel (deep sea, later).
- In v0.1 all three regions are open for testing; v0.2 locks them behind boats.

## Fishdex
A collection book: every species, grouped by region, showing rarity, number caught and best size.
Uncaught species show as a dark silhouette with "???".

## Saving
Progress is saved on the phone (browser localStorage): coins, cooler, Fishdex, owned upgrades, current region, settings.
Save after every change. No accounts or cloud saves for now.

## Art direction
- **Prototype: pixel art (style B).** Cheap to make, easy to keep consistent.
- **Final: painted storybook (style D).** Soft watercolour shapes, paper texture, serif headings.
- Mockups of both: https://claude.ai/artifact/9wv4PWudkU7r66xyBJxRaB
- Because the final art differs, every visual goes through the art manifest (see `CLAUDE.md`).
