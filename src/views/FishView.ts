import Phaser from 'phaser';
import { getSpecies } from '../data/fish';
import { getRarity } from '../data/rarities';
import { REGIONS } from '../data/regions';
import { PIXEL_SCALE, RARITY_COLOR, THEME, fishArtId, sceneArtId } from '../art/manifest';
import { priceFor } from '../game/fish';
import { FishingSession, type FishingPhase } from '../game/fishing';
import type { Game } from '../game/game';
import { COOLER_CAPACITY } from '../game/state';
import { Button, CONTENT_BOTTOM, CONTENT_Y, W, drawPanel, panel, text } from '../ui/kit';

const BOBBER = { x: 195, y: 440 };
const ROD_TIP = { x: 271, y: 528 };
const TRACK = { x: 40, w: 310, y: 622, h: 22 };
const METER = { x: 40, w: 310, y: 664, h: 14 };
/** While reeling, holding anywhere between this y and the tab bar counts as holding. */
const HOLD_ZONE_Y = 420;
/** Catch card: ignores input this long after it appears. */
const CARD_LOCK_SEC = 0.6;
/** "It swam off" messages dismiss themselves after this long. */
const MSG_SEC = 1.5;
const CARD = { x: 25, y: CONTENT_Y + 70, w: 340, h: 350 };

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
  private readonly cardCooler: Phaser.GameObjects.Text;
  private readonly keepButton: Button;
  private readonly msg: Phaser.GameObjects.Container;
  private readonly msgText: Phaser.GameObjects.Text;
  private readonly holdPointers = new Set<Phaser.Input.Pointer>();
  private resultOpen = false;
  private resultAge = 0;
  private holding = false;
  private cardName_ = '';
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

    // Catch card ("You caught…"), stays until the player taps Keep fishing
    const cardBg = scene.add.graphics();
    drawPanel(cardBg, 0, 0, CARD.w, CARD.h);
    const cardTitle = text(scene, CARD.w / 2, 24, 'You caught…', 16, THEME.dim);
    this.cardFish = scene.add.image(CARD.w / 2, 104, fishArtId('yellowstripe_scad')).setScale(PIXEL_SCALE.fish);
    this.cardName = text(scene, CARD.w / 2, 180, '', 22);
    this.cardRarity = text(scene, CARD.w / 2, 208, '', 16);
    this.cardInfo = text(scene, CARD.w / 2, 234, '', 16);
    this.cardNew = text(scene, CARD.w / 2, 260, '', 16, THEME.green);
    this.cardCooler = text(scene, CARD.w / 2, 284, '', 13, THEME.dim);
    this.keepButton = new Button(scene, CARD.w / 2, 318, 240, 48, 'Keep fishing', {
      down: () => this.dismissResult(),
    }, 20);
    this.card = scene.add.container(CARD.x, CARD.y, [
      cardBg, cardTitle, this.cardFish, this.cardName, this.cardRarity, this.cardInfo, this.cardNew, this.cardCooler, this.keepButton.root,
    ]);

    // Short message for "It swam off" / "It got away"
    const msgBg = scene.add.graphics();
    drawPanel(msgBg, 0, 0, 300, 64);
    this.msgText = text(scene, 150, 32, '', 20);
    this.msg = scene.add.container(45, CONTENT_Y + 200, [msgBg, this.msgText]);

    // Hold anywhere in the lower part of the screen to reel; sliding the thumb never releases
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const ph = this.session.phase;
      if (!this.root.visible || (ph !== 'bite' && ph !== 'reeling')) return;
      if (p.y >= HOLD_ZONE_Y && p.y < CONTENT_BOTTOM) this.holdPointers.add(p);
    });

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
      statusPanel, this.status, this.card, this.msg, this.reelPanel, this.reelGfx, this.reelHint,
      ...this.regionButtons.map((b) => b.root), this.action.root,
    ]);
    this.render();
  }

  private onActionDown(): void {
    const s = this.session;
    if (this.resultOpen) return;
    if (s.canCast) {
      if (this.core.canCast()) s.cast();
    } else if (s.phase === 'bite') {
      s.hook();
    }
  }

  /** Called every frame. */
  update(dt: number): void {
    this.time += dt;
    for (const p of this.holdPointers) if (!p.isDown) this.holdPointers.delete(p);
    this.holding = this.holdPointers.size > 0 && this.session.phase === 'reeling';
    this.session.update(dt, this.holding);
    if (this.session.phase === 'result' && this.prevPhase !== 'result') this.onResult();
    if (this.session.phase !== 'result' && this.resultOpen) this.resultOpen = false;
    this.prevPhase = this.session.phase;
    if (this.resultOpen) {
      this.resultAge += dt;
      if (this.session.outcome !== 'caught' && this.resultAge >= MSG_SEC) this.dismissResult();
    }
    this.render();
  }

  private onResult(): void {
    const s = this.session;
    this.resultOpen = true;
    this.resultAge = 0;
    this.cardName_ = '';
    if (s.outcome === 'caught' && s.fish) {
      const res = this.core.addCatch(s.fish);
      const sp = getSpecies(s.fish.speciesId);
      if (sp) {
        const rar = getRarity(sp.rarity);
        this.cardName_ = sp.name;
        this.cardFish.setTexture(fishArtId(sp.id));
        this.cardName.setText(sp.name);
        this.cardRarity.setText(rar.label.toUpperCase()).setColor(RARITY_COLOR[sp.rarity]);
        this.cardInfo.setText(`${s.fish.sizeCm} cm  ·  ${priceFor(s.fish)} coins`);
        this.cardNew.setText(res.newSpecies ? 'NEW SPECIES!' : res.newBest ? 'NEW BEST SIZE!' : '');
        this.cardCooler.setText(`Sent to cooler (${this.core.coolerCount}/${COOLER_CAPACITY})`);
      }
    } else {
      this.msgText.setText(s.outcome === 'lost' ? 'It swam off…' : 'It got away…');
    }
  }

  /** Close the catch card / message. Only a fresh press on the button gets here (never a held reel press). */
  dismissResult(): void {
    if (!this.resultOpen) return;
    this.resultOpen = false;
    this.render();
  }

  /** Current status line and action-button label (for e2e). */
  get hint(): { status: string; label: string; castEnabled: boolean; cardVisible: boolean; cardName: string } {
    return {
      status: this.status.text,
      label: this.actionLabel,
      castEnabled: this.actionEnabled,
      cardVisible: this.card.visible,
      cardName: this.cardName_,
    };
  }

  /** Reel numbers (for e2e). */
  get reel(): { needle: number; meter: number; velocity: number; grace: boolean } {
    const s = this.session;
    return { needle: s.needle, meter: s.meter, velocity: s.velocity, grace: s.inGrace };
  }

  forceBite(): boolean { return this.session.forceBite(); }
  forceCatch(): boolean {
    if (!this.session.forceCatch()) return false;
    // handle the result right away (not on the next frame) so callers see a consistent state
    this.prevPhase = 'result';
    this.onResult();
    this.render();
    return true;
  }

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
        if (this.resultOpen) {
          msg = s.outcome === 'caught' ? 'Nice catch!' : s.outcome === 'lost' ? 'It swam off.' : 'It got away.';
          enabled = false;
        } else {
          msg = 'Tap CAST to start fishing';
          if (coolerFull) {
            msg = `Cooler full (${COOLER_CAPACITY}/${COOLER_CAPACITY}) — visit the Shop tab!`;
            label = 'COOLER FULL';
            enabled = false;
          }
        }
        break;
      }
      case 'waiting': msg = 'Waiting for a bite…'; label = 'WAITING…'; enabled = false; break;
      case 'bite': msg = 'BITE! Tap now!'; label = 'HOOK IT!'; break;
      case 'reeling':
        msg = s.inGrace ? 'Get ready…' : 'Hold to reel!';
        label = s.inGrace ? 'GET READY…' : 'HOLD TO REEL';
        break;
    }
    this.status.setText(msg);
    this.action.setLabel(label);
    this.action.setEnabled(enabled);
    this.action.setSelected(this.holding);
    this.action.root.setVisible(!this.resultOpen);
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
    const showCard = this.resultOpen && s.outcome === 'caught';
    this.card.setVisible(showCard);
    this.keepButton.setEnabled(this.resultAge >= CARD_LOCK_SEC);
    this.msg.setVisible(this.resultOpen && s.outcome !== 'caught');

    // reel UI
    const reeling = s.phase === 'reeling';
    this.reelPanel.setVisible(reeling);
    this.reelHint.setVisible(reeling);
    this.reelGfx.clear().setVisible(reeling);
    if (reeling) {
      this.reelHint.setText(s.inGrace ? 'Get ready…' : 'Hold anywhere to reel');
      this.drawReel();
    }
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
