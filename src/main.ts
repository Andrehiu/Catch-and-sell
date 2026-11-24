import '@fontsource/pixelify-sans/400.css';
import Phaser from 'phaser';
import { THEME } from './art/manifest';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { registerServiceWorker } from './pwa/register';
import { H, W } from './ui/kit';

async function start(): Promise<void> {
  // Wait (briefly) for the pixel font so the first frame uses it.
  try {
    await Promise.race([document.fonts.load('16px "Pixelify Sans"'), new Promise((r) => setTimeout(r, 2000))]);
  } catch {
    /* fall back to monospace */
  }
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: THEME.shadow,
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene],
  });
}

void start();
registerServiceWorker();
