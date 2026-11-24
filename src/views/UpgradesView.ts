import Phaser from 'phaser';
import { PIXEL_SCALE, THEME } from '../art/manifest';
import { CONTENT_Y, H, TAB_H, W, panel, text } from '../ui/kit';

export class UpgradesView {
  readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const bg = scene.add.rectangle(0, CONTENT_Y, W, H - TAB_H - CONTENT_Y, THEME.hex.shadow).setOrigin(0, 0);
    const p = panel(scene, 40, 250, 310, 230);
    const rod = scene.add.image(195, 330, 'ui.rod').setScale(PIXEL_SCALE.rod);
    const title = text(scene, W / 2, 410, 'Coming soon', 26, THEME.accent);
    const sub = text(scene, W / 2, 450, 'Rods and boats arrive in v0.2', 15, THEME.cream);
    const head = text(scene, W / 2, CONTENT_Y + 22, 'Upgrades', 24);
    this.root = scene.add.container(0, 0, [bg, head, p, rod, title, sub]);
  }
}
