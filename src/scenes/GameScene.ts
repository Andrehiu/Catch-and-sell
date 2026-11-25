import Phaser from 'phaser';
import { THEME } from '../art/manifest';
import { getSpecies } from '../data/fish';
import { isDebug, makeConfig } from '../game/config';
import { rollCatch } from '../game/fish';
import { FishingSession } from '../game/fishing';
import { Game } from '../game/game';
import { mulberry32, type Rng } from '../game/rng';
import { loadState, saveState } from '../game/save';
import type { Sale } from '../game/game';
import { COOLER_CAPACITY } from '../game/state';
import { FishView } from '../views/FishView';
import { FishdexView } from '../views/FishdexView';
import { ShopView } from '../views/ShopView';
import { UpgradesView } from '../views/UpgradesView';
import { H, HEADER_H, TAB_H, W, Button, drawPanel, text } from '../ui/kit';

const TABS = ['Fish', 'Shop', 'Upgrades', 'Fishdex'] as const;

declare global {
  interface Window {
    __debug?: {
      forceBite(): boolean;
      forceCatch(): boolean;
      state(): unknown;
      phase(): string;
      saleInFlight(): number;
      tab(): string;
      hint(): { status: string; label: string; castEnabled: boolean; cardVisible: boolean; cardName: string };
      reel(): { needle: number; meter: number; velocity: number; grace: boolean };
      dismissCard(): void;
      toast(): { visible: boolean; text: string };
      pauseShop(paused: boolean): void;
    };
  }
}

export class GameScene extends Phaser.Scene {
  private core!: Game;
  private fishView!: FishView;
  private shopView!: ShopView;
  private dexView!: FishdexView;
  private views: Phaser.GameObjects.Container[] = [];
  private tabButtons: Button[] = [];
  private tab = 0;
  private shopPaused = false;
  private coinText!: Phaser.GameObjects.Text;
  private coolerText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Container;
  private toastText!: Phaser.GameObjects.Text;
  private toastLeft = 0;
  /** Coins shown in the header; eases toward the real total. */
  private coinShown = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    const debug = isDebug(location.search);
    const config = makeConfig(debug);
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    const seed = debug ? Number(params.get('seed')) : NaN;
    const rng: Rng = Number.isFinite(seed) ? mulberry32(seed) : Math.random;

    this.core = new Game(config, loadState(storage));
    const session = new FishingSession(rng, config, () => rollCatch(rng, this.core.state.region));

    this.fishView = new FishView(this, this.core, session);
    this.shopView = new ShopView(this, this.core, config.sellIntervalSec);
    this.dexView = new FishdexView(this, this.core);
    const upgrades = new UpgradesView(this);
    this.views = [this.fishView.root, this.shopView.root, upgrades.root, this.dexView.root];

    this.buildHeader();
    this.buildTabs();
    this.showTab(0);

    this.core.onChange(() => {
      saveState(storage, this.core.state);
      this.refreshAll();
    });
    this.coinShown = this.core.state.coins;
    this.coinText.setText(String(this.coinShown));
    this.refreshAll();

    if (debug) {
      window.__debug = {
        forceBite: () => this.fishView.forceBite(),
        forceCatch: () => this.fishView.forceCatch(),
        state: () => JSON.parse(JSON.stringify(this.core.state)),
        phase: () => this.fishView.session.phase,
        saleInFlight: () => this.shopView.inFlight,
        tab: () => TABS[this.tab],
        hint: () => this.fishView.hint,
        reel: () => this.fishView.reel,
        dismissCard: () => this.fishView.dismissResult(),
        toast: () => ({ visible: this.toast.visible, text: this.toastText.text }),
        pauseShop: (p) => { this.shopPaused = p; },
      };
    }
  }

  private buildHeader(): void {
    const g = this.add.graphics();
    drawPanel(g, -4, -6, W + 8, HEADER_H + 6);
    this.add.image(24, HEADER_H / 2, 'ui.coin').setScale(3);
    this.coinText = text(this, 44, HEADER_H / 2, '0', 22).setOrigin(0, 0.5);
    this.coinText.setOrigin(0, 0.5);
    this.coolerText = text(this, W - 14, HEADER_H / 2, '', 17).setOrigin(1, 0.5);

    // Sale toast just under the coin counter (shown when a sale happens off the Shop tab)
    const tg = this.add.graphics();
    drawPanel(tg, 0, 0, 250, 30);
    this.toastText = text(this, 125, 15, '', 14);
    this.toast = this.add.container(10, HEADER_H + 6, [tg, this.toastText]).setVisible(false).setDepth(50);
  }

  private showSaleToast(sale: Sale): void {
    const name = getSpecies(sale.fish.speciesId)?.name ?? 'Fish';
    this.toastText.setText(`+${sale.price} · ${name} sold`);
    this.toast.setVisible(true);
    this.toastLeft = 2.2;
    this.tweens.add({ targets: this.coinText, scale: 1.35, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
  }

  private buildTabs(): void {
    const w = W / TABS.length;
    TABS.forEach((label, i) => {
      const b = new Button(this, w * i + w / 2, H - TAB_H / 2 + 2, w - 4, TAB_H - 8, label, { down: () => this.showTab(i) }, 14);
      this.tabButtons.push(b);
    });
  }

  private showTab(i: number): void {
    this.tab = i;
    this.views.forEach((v, idx) => v.setVisible(idx === i));
    this.tabButtons.forEach((b, idx) => b.setSelected(idx === i));
    this.refreshAll();
  }

  private refreshAll(): void {
    const n = this.core.coolerCount;
    this.coolerText.setText(`Cooler ${n}/${COOLER_CAPACITY}`).setColor(n >= COOLER_CAPACITY ? THEME.accent : THEME.cream);
    this.shopView.refresh();
    this.dexView.refresh();
  }

  update(_time: number, delta: number): void {
    // Clamp so a long background pause doesn't dump a pile of sales at once.
    const dt = Math.min(delta / 1000, 0.25);
    this.fishView.update(dt);
    this.easeCoins(dt);
    if (this.toast.visible) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) this.toast.setVisible(false);
    }
    if (this.shopPaused) return;
    for (const sale of this.core.tickShop(dt)) {
      this.shopView.playSale(sale);
      if (this.tab !== 1) this.showSaleToast(sale);
    }
  }

  /** Count the header coin number up (or down) toward the real total. */
  private easeCoins(dt: number): void {
    const target = this.core.state.coins;
    if (this.coinShown === target) return;
    const step = Math.max(1, Math.ceil(Math.abs(target - this.coinShown) * Math.min(1, dt * 8)));
    this.coinShown = target > this.coinShown ? Math.min(target, this.coinShown + step) : Math.max(target, this.coinShown - step);
    this.coinText.setText(String(this.coinShown));
  }
}
