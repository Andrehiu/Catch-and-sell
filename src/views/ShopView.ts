import Phaser from 'phaser';
import { getSpecies } from '../data/fish';
import { CUSTOMER_ART_IDS, PIXEL_SCALE, RARITY_COLOR, THEME, fishArtId } from '../art/manifest';
import type { Game, Sale } from '../game/game';
import { COOLER_CAPACITY } from '../game/state';
import { CONTENT_Y, W, drawPanel, panel, text } from '../ui/kit';

const GROUND_Y = 420;
const COUNTER_Y = 342;
const STALL_FISH_X = 100;
const CUSTOMER_X = 318;
const SLOT = { x0: 30, y0: 560, size: 62, gap: 6, cols: 5 };

export class ShopView {
  readonly root: Phaser.GameObjects.Container;
  private readonly customer: Phaser.GameObjects.Image;
  private readonly speech: Phaser.GameObjects.Text;
  private readonly todayText: Phaser.GameObjects.Text;
  private readonly lastSale: Phaser.GameObjects.Text;
  private readonly coolerTitle: Phaser.GameObjects.Text;
  private readonly slotFish: Phaser.GameObjects.Image[] = [];
  private readonly nextMark: Phaser.GameObjects.Text;
  private readonly fx: Phaser.GameObjects.Container;
  private customerIdx = 0;
  /** Number of sale animations currently playing (used by e2e). */
  inFlight = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly core: Game,
    private readonly sellIntervalSec: number,
  ) {
    const bg = scene.add.image(0, CONTENT_Y, 'scene.shop').setOrigin(0, 0).setScale(PIXEL_SCALE.scene);
    const stall = scene.add.image(150, GROUND_Y, 'ui.stall').setOrigin(0.5, 1).setScale(PIXEL_SCALE.stall);
    this.customer = scene.add.image(CUSTOMER_X, GROUND_Y, CUSTOMER_ART_IDS[0]).setOrigin(0.5, 1).setScale(PIXEL_SCALE.customer);
    this.speech = text(scene, CUSTOMER_X, GROUND_Y - 112, '…', 16, THEME.navy, { backgroundColor: THEME.cream, padding: { x: 6, y: 3 }, shadow: undefined });

    // Today's total
    const totalPanel = panel(scene, 20, 446, 350, 50);
    const coinIcon = scene.add.image(48, 471, 'ui.coin').setScale(PIXEL_SCALE.coin);
    this.todayText = text(scene, 215, 471, '', 20);
    this.lastSale = text(scene, W / 2, 516, '', 14, THEME.cream, { shadow: undefined, color: THEME.navy, backgroundColor: undefined });
    this.lastSale.setColor(THEME.cream);

    // Cooler contents
    const coolerPanel = panel(scene, 20, 530, 350, 214);
    this.coolerTitle = text(scene, W / 2, 548, '', 16);
    const slots = scene.add.graphics();
    for (let i = 0; i < COOLER_CAPACITY; i++) {
      const col = i % SLOT.cols;
      const row = Math.floor(i / SLOT.cols);
      const x = SLOT.x0 + col * (SLOT.size + SLOT.gap);
      const y = SLOT.y0 + row * (SLOT.size + SLOT.gap);
      drawPanel(slots, x, y, SLOT.size, SLOT.size, 0x1a2433);
      this.slotFish.push(scene.add.image(x + SLOT.size / 2, y + SLOT.size / 2, fishArtId('arapaima')).setScale(PIXEL_SCALE.fishSmall).setVisible(false));
    }
    this.nextMark = text(scene, SLOT.x0 + SLOT.size - 8, SLOT.y0 + 8, 'NEXT', 10, THEME.green).setOrigin(1, 0.5);
    const foot = text(scene, W / 2, 722, `Sells 1 fish every ${this.sellIntervalSec}s, oldest first`, 12, THEME.dim);

    this.fx = scene.add.container(0, 0);
    // coinIcon, totalPanel order: panel first
    this.root = scene.add.container(0, 0, [
      bg, stall, this.customer, this.speech, totalPanel, coinIcon, this.todayText, this.lastSale,
      coolerPanel, this.coolerTitle, slots, ...this.slotFish, this.nextMark, foot, this.fx,
    ]);
    this.refresh();
  }

  refresh(): void {
    const cooler = this.core.state.cooler;
    this.todayText.setText(`Today: ${this.core.todayCoins()} coins`);
    this.coolerTitle.setText(`Cooler ${cooler.length}/${COOLER_CAPACITY}`);
    this.slotFish.forEach((img, i) => {
      const f = cooler[i];
      img.setVisible(!!f);
      if (f) img.setTexture(fishArtId(f.speciesId));
    });
    this.nextMark.setVisible(cooler.length > 0);
    this.speech.setText(cooler.length > 0 ? 'Fresh fish?' : 'Nothing to buy yet…');
  }

  /** Play the sale: fish slides across the counter, customer takes it, coin pops. */
  playSale(sale: Sale): void {
    this.refresh();
    const sp = getSpecies(sale.fish.speciesId);
    if (!sp) return;
    this.lastSale.setText(`Sold ${sp.name} for ${sale.price}`);
    this.customerIdx = (this.customerIdx + 1) % CUSTOMER_ART_IDS.length;

    const fish = this.scene.add.image(STALL_FISH_X, COUNTER_Y, fishArtId(sp.id)).setScale(PIXEL_SCALE.fish);
    this.fx.add(fish);
    this.inFlight++;
    this.scene.tweens.add({
      targets: fish,
      x: CUSTOMER_X - 26,
      duration: 500,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        fish.destroy();
        this.hopCustomer();
        this.coinPop(sale.price, sp.rarity);
      },
    });
  }

  private hopCustomer(): void {
    this.scene.tweens.add({ targets: this.customer, y: GROUND_Y - 10, duration: 100, yoyo: true });
  }

  private coinPop(amount: number, rarity: keyof typeof RARITY_COLOR): void {
    const coin = this.scene.add.image(CUSTOMER_X - 30, GROUND_Y - 130, 'ui.coin').setScale(PIXEL_SCALE.coin);
    const label = text(this.scene, CUSTOMER_X + 8, GROUND_Y - 130, `+${amount}`, 22, RARITY_COLOR[rarity]);
    this.fx.add([coin, label]);
    this.scene.tweens.add({
      targets: [coin, label],
      y: GROUND_Y - 190,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => {
        coin.destroy();
        label.destroy();
        this.inFlight--;
        // next customer steps up
        this.customer.setTexture(CUSTOMER_ART_IDS[this.customerIdx]);
      },
    });
  }
}
