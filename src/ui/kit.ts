import Phaser from 'phaser';
import { THEME } from '../art/manifest';

export const W = 390;
export const H = 844;
export const HEADER_H = 56;
export const TAB_H = 64;
export const CONTENT_Y = HEADER_H;
export const CONTENT_BOTTOM = H - TAB_H;

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 16,
  color: string = THEME.cream,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: THEME.font,
      fontSize: `${size}px`,
      color,
      resolution: 2,
      shadow: { offsetX: 1, offsetY: 2, color: THEME.shadow, fill: true, blur: 0 },
      ...extra,
    })
    .setOrigin(0.5);
}

/** Navy panel with cream border and a hard drop shadow (style B). */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number = THEME.hex.navy): void {
  g.fillStyle(THEME.hex.shadow, 1).fillRect(x + 3, y + 4, w, h);
  g.fillStyle(THEME.hex.cream, 1).fillRect(x, y, w, h);
  g.fillStyle(fill, 1).fillRect(x + 2, y + 2, w - 4, h - 4);
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: number = THEME.hex.navy): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawPanel(g, x, y, w, h, fill);
  return g;
}

export interface ButtonHandlers {
  down?: () => void;
  up?: () => void;
}

/** A tappable panel button. Centered on (cx, cy); keep h ≥ 44 for touch. */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private enabled = true;
  private selected = false;
  isDown = false;

  constructor(
    scene: Phaser.Scene,
    private readonly cx: number,
    private readonly cy: number,
    private readonly w: number,
    private readonly h: number,
    label: string,
    handlers: ButtonHandlers,
    fontSize = 20,
  ) {
    this.bg = scene.add.graphics();
    this.label = text(scene, 0, 0, label, fontSize);
    this.hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.root = scene.add.container(cx, cy, [this.bg, this.label, this.hit]);
    this.redraw();

    const release = () => {
      if (!this.isDown) return;
      this.isDown = false;
      this.redraw();
      handlers.up?.();
    };
    this.hit.on('pointerdown', () => {
      if (!this.enabled) return;
      this.isDown = true;
      this.redraw();
      handlers.down?.();
    });
    this.hit.on('pointerup', release);
    this.hit.on('pointerout', release);
    this.hit.on('pointerupoutside', release);
  }

  private redraw(): void {
    this.bg.clear();
    const fill = !this.enabled ? 0x3a4458 : this.selected || this.isDown ? THEME.hex.accent : THEME.hex.navy;
    const dy = this.isDown ? 2 : 0;
    drawPanel(this.bg, -this.w / 2, -this.h / 2 + dy, this.w, this.h, fill);
    this.label.setY(dy);
    this.label.setColor(this.enabled ? THEME.cream : THEME.dim);
  }

  setLabel(s: string): void {
    this.label.setText(s);
  }

  setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    if (!v) this.isDown = false;
    this.redraw();
  }

  setSelected(v: boolean): void {
    if (this.selected === v) return;
    this.selected = v;
    this.redraw();
  }

  get centerX(): number { return this.cx; }
  get centerY(): number { return this.cy; }
}
