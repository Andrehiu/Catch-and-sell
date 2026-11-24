import Phaser from 'phaser';
import { registerArt } from '../art/manifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerArt(this.textures);
    this.scene.start('Game');
  }
}
