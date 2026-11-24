import Phaser from 'phaser';
import { getSpecies } from '../data/fish';
import { getRarity } from '../data/rarities';
import { REGIONS } from '../data/regions';
import { PIXEL_SCALE, RARITY_COLOR, THEME, fishArtId, sceneArtId } from '../art/manifest';
import { priceFor } from '../game/fish';
import { FishingSession, type FishingPhase } from '../game/fishing';
import type { Game } from '../game/game';
import { COOLER_CAPACITY } from '../game/state';
import { Button, CONTENT_Y, W, drawPanel, panel, text } from '../ui/kit';

const BOBBER = { x: 195, y: 440 };
const ROD_TIP = { x: 271, y: 528 };
const TRACK = { x: 40, w: 310, y: 622, h: 22 };
const METER = { x: 40, w: 310, y: 664, h: 14 };

export class FishView {
  readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Image;
  private readonly regionButtons: Button[] = [];
  private readonly status: Phaser.GameObjects.Text;
  private readonly action: Button;
  private readonly line: Phaser.GameObjects.Graphics;
  private readonly bobber: Phaser.GameObjects.Image;
  private readonly hooked: Phaser.GameObjects.Image;
  private readonly bangText: Phaser.GameObjects.Text;
  private readonly reelPanel: Phaser.GameObjects.Graphics;
  private readonly reelGfx: Phaser.GameObjects.Graphics;
  private readonly reelHint: Phaser.GameObjects.Text;
  private readonly card: Phaser.GameObjects.Container;
  private readonly cardFish: Phaser.GameObjects.Image;
  private readonly cardName: Phaser.GameObjects.Text;
  private readonly cardRarity: Phaser.GameObjects.Text;
  private readonly cardInfo: Phaser.GameObjects.Text;
  private readonly cardNew: Phaser.GameObjects.Text;
  private actionLabel = '';
  private actionEnabled = true;
  private prevPhase: FishingPhase = 'idle';
  private time = 0;
  private lastRegion = '';

  readonly session: FishingSession;

  constructor(
    scene: Phaser.Scene,
    private readonly core: Game,
    session: FishingSession,
  ) {
    this.session = session;
    this.bg = scene.add.image(0, CONTENT_Y, sceneArtId(core.state.region)).setOrigin(0, 0).setScale(PIXEL_SCALE.scene);
    this.line = scene.add.graphics();
    this.bobber = scene.add.image(BOBBER.x, BOBBER.y, 'ui.bobber').setScale(PIXEL_SCALE.bobber);
    this.hooked = scene.add.image(BOBBER.x, BOBBER.y + 60, fishArtId('yellowstripe_scad')).setScale(PIXEL_SCALE.fish).setAlpha(0.6);
    this.bangText = text(scene, BOBBER.x, BOBBER.y - 50, '!', 44, THEME.accent);
    const rod = scene.add.image(385, 690, 'ui.rod').setOrigin(1, 1).setScale(PIXEL_SCALE.rod);

    // Region picker
    const bw = 118;
    REGIONS.forEach((r, i) => {
      const b = new Button(scene, 8 + bw / 2 + i * (bw + 6), CONTENT_Y + 30, bw, 44, r.shortName, {
        down: () => {
          if (this.session.canCast) this.core.setRegion(r.id);
        },
      }, 15);
      this.regionButtons.push(b);
    });

    this.status = text(scene, W / 2, CONTENT_Y + 100, '', 18, THEME.cream, { wordWrap: { width: 330 }, align: 'center' });
    const statusPanel = panel(scene, 20, CONTENT_Y + 74, 350, 52);

    // Result card
    const cardBg = scene.add.graphics();
    drawPanel(cardBg, 0, 0, 340, 130);
    this.cardFish = scene.add.image(70, 66, fishArtId('yellowstripe_scad')).setScale(PIXEL_SCALE.fish);
    this.cardName = text(scene, 205, 24, '', 18).setOrigin(0.5);
    this.cardRarity = text(scene, 205, 52, '', 16);
    this.cardInfo = text(scene, 205, 84, '', 15);
    this.cardNew = text(scene, 205, 108, '', 14, THEME.green);
    this.card = scene.add.container(25, CONTENT_Y + 150, [cardBg, this.cardFish, this.cardName, this.cardRarity, this.cardInfo, this.cardNew]);

    // Reel UI
    this.reelPanel = panel(scene, 20, 596, 350, 100);
    this.reelGfx = scene.add.graphics();
    this.reelHint = text(scene, W / 2, 608, 'Keep the needle in the green', 14);

    this.action = new Button(scene, W / 2, 740, 290, 56, 'CAST', {
      down: () => this.onActionDown(),
    }, 22);

    // order matters: statusPanel must sit below status text
    this.root = scene.add.container(0, 0, [
      this.bg, this.line, rod, this.bobber, this.hooked, this.bangText,
      statusPanel, this.status, this.card, this.reelPanel, this.reelGfx, this.reelHint,
      ...this.regionButtons.map((b) => b.root), this.action.root,
    ]);
    this.render();
  }

  private onActionDown(): void {
    const s = this.session;
    if (s.canCast) {
      if (this.core.canCast()) s.cast();
    } else if (s.phase === 'bite') {
      s.hook();
    }
  }

  /** Called every frame. */
  update(dt: number): void {
    this.time += dt;
    const holding = this.action.isDown && this.session.phase === 'reeling';
    this.session.update(dt, holding);
    if (this.session.phase === 'result' && this.prevPhase !== 'result') this.onResult();
    this.prevPhase = this.session.phase;
    this.render();
  }

  private onResult(): void {
    const s = this.session;
    if (s.outcome === 'caught' && s.fish) {
      const res = this.core.addCatch(s.fish);
      const sp = getSpecies(s.fish.speciesId);
      if (sp) {
        const rar = getRarity(sp.rarity);
        this.cardFish.setTexture(fishArtId(sp.id));
        this.cardName.setText(sp.name);
        this.cardRarity.setText(`${rar.label.toUpperCase()}`).setColor(RARITY_COLOR[sp.rarity]);
        this.cardInfo.setText(`${s.fish.sizeCm} cm  ·  ${priceFor(s.fish)} coins`);
        this.cardNew.setText(res.newSpecies ? 'NEW SPECIES!' : res.newBest ? 'NEW BEST SIZE!' : '');
      }
    }
  }

  /** Current status line and action-button label (for e2e). */
  get hint(): { status: string; label: string; castEnabled: boolean } {
    return { status: this.status.text, label: this.actionLabel, castEnabled: this.actionEnabled };
  }

  forceBite(): boolean { return this.session.forceBite(); }
  forceCatch(): boolean { return this.session.forceCatch(); }

  private render(): void {
    const s = this.session;
    const region = this.core.state.region;
    if (region !== this.lastRegion) {
      this.lastRegion = region;
      this.bg.setTexture(sceneArtId(region));
    }
    this.regionButtons.forEach((b, i) => {
      b.setSelected(REGIONS[i].id === region);
      b.setEnabled(s.canCast);
    });

    const coolerFull = !this.core.canCast();
    // status + action button
    let msg = '';
    let label = 'CAST';
    let enabled = true;
    switch (s.phase) {
      case 'idle':
      case 'result': {
        if (s.phase === 'result' && s.outcome === 'lost') msg = 'It swam off. Cast again!';
        else if (s.phase === 'result' && s.outcome === 'missed') msg = 'It got away. Cast again!';
        else if (s.phase === 'result') msg = 'Nice catch! Cast again?';
        else msg = 'Tap CAST to start fishing';
        if (coolerFull) {
          msg = `Cooler full (${COOLER_CAPACITY}/${COOLER_CAPACITY}) — visit the Shop tab!`;
          label = 'COOLER FULL';
          enabled = false;
        }
        break;
      }
      case 'waiting': msg = 'Waiting for a bite…'; label = 'WAITING…'; enabled = false; break;
      case 'bite': msg = 'BITE! Tap now!'; label = 'HOOK IT!'; break;
      case 'reeling': msg = 'Hold to reel!'; label = 'HOLD TO REEL'; break;
    }
    this.status.setText(msg);
    this.action.setLabel(label);
    this.action.setEnabled(enabled);
    this.actionLabel = label;
    this.actionEnabled = enabled;

    // bobber, line, hooked fish
    const showBobber = s.phase === 'waiting' || s.phase === 'bite' || s.phase === 'reeling';
    this.bobber.setVisible(showBobber);
    this.line.clear();
    this.bangText.setVisible(s.phase === 'bite');
    this.hooked.setVisible(s.phase === 'reeling' && !!s.fish);
    if (showBobber) {
      let bx = BOBBER.x;
      let by = BOBBER.y + Math.sin(this.time * 2) * 2;
      if (s.phase === 'bite') by = BOBBER.y + 10 + Math.sin(this.time * 40) * 4;
      if (s.phase === 'reeling') {
        bx += Math.sin(this.time * 3.2) * 40;
        by += 8;
        this.hooked.setPosition(bx, by + 52).setFlipX(Math.cos(this.time * 3.2) > 0);
        this.hooked.setTintFill(THEME.hex.silhouette);
      }
      this.bobber.setPosition(bx, by);
      this.bangText.setY(BOBBER.y - 50 + Math.sin(this.time * 18) * 3);
      this.line.lineStyle(2, THEME.hex.cream, 0.9).lineBetween(ROD_TIP.x, ROD_TIP.y, bx, by - 14);
    }

    // result card
    this.card.setVisible(s.phase === 'result' && s.outcome === 'caught');

    // reel UI
    const reeling = s.phase === 'reeling';
    this.reelPanel.setVisible(reeling);
    this.reelHint.setVisible(reeling);
    this.reelGfx.clear().setVisible(reeling);
    if (reeling) this.drawReel();
  }

  private drawReel(): void {
    const s = this.session;
    const g = this.reelGfx;
    g.fillStyle(THEME.hex.shadow, 1).fillRect(TRACK.x, TRACK.y, TRACK.w, TRACK.h);
    const zx = TRACK.x + (s.zoneCenter - s.zoneWidth / 2) * TRACK.w;
    g.fillStyle(THEME.hex.green, 1).fillRect(zx, TRACK.y + 2, s.zoneWidth * TRACK.w, TRACK.h - 4);
    const nx = TRACK.x + s.needle * TRACK.w;
    g.fillStyle(THEME.hex.shadow, 1).fillRect(nx - 3, TRACK.y - 6, 6, TRACK.h + 12);
    g.fillStyle(THEME.hex.accent, 1).fillRect(nx - 2, TRACK.y - 5, 4, TRACK.h + 10);
    g.fillStyle(THEME.hex.shadow, 1).fillRect(METER.x, METER.y, METER.w, METER.h);
    g.fillStyle(THEME.hex.cream, 1).fillRect(METER.x + 2, METER.y + 2, (METER.w - 4) * s.meter, METER.h - 4);
  }
}
