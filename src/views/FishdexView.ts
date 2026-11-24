import Phaser from 'phaser';
import { speciesInRegion } from '../data/fish';
import { getRarity } from '../data/rarities';
import { REGIONS } from '../data/regions';
import { PIXEL_SCALE, RARITY_COLOR, THEME, fishArtId } from '../art/manifest';
import type { Game } from '../game/game';
import { CONTENT_Y, H, TAB_H, W, panel, text } from '../ui/kit';

interface Row {
  id: string;
  rarityId: keyof typeof RARITY_COLOR;
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  rarity: Phaser.GameObjects.Text;
  info: Phaser.GameObjects.Text;
}

export class FishdexView {
  readonly root: Phaser.GameObjects.Container;
  private readonly rows: Row[] = [];
  private readonly title: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly core: Game) {
    const items: Phaser.GameObjects.GameObject[] = [];
    const bg = scene.add.rectangle(0, CONTENT_Y, W, H - TAB_H - CONTENT_Y, THEME.hex.shadow).setOrigin(0, 0);
    items.push(bg);
    this.title = text(scene, W / 2, CONTENT_Y + 22, 'Fishdex', 24);
    items.push(this.title);

    let y = CONTENT_Y + 52;
    for (const region of REGIONS) {
      const head = text(scene, 22, y + 11, region.name === region.subtitle ? region.name : `${region.name} — ${region.subtitle}`, 15, THEME.cream).setOrigin(0, 0.5);
      items.push(head);
      y += 28;
      for (const sp of speciesInRegion(region.id)) {
        const p = panel(scene, 14, y, 362, 58);
        const icon = scene.add.image(60, y + 29, fishArtId(sp.id)).setScale(PIXEL_SCALE.fishSmall + 1);
        const name = text(scene, 112, y + 16, '', 17).setOrigin(0, 0.5);
        const rarity = text(scene, 112, y + 41, '', 14).setOrigin(0, 0.5);
        const info = text(scene, 366, y + 29, '', 13).setOrigin(1, 0.5).setAlign('right');
        items.push(p, icon, name, rarity, info);
        this.rows.push({ id: sp.id, rarityId: sp.rarity, icon, name, rarity, info });
        y += 64;
      }
      y += 4;
    }
    this.root = scene.add.container(0, 0, items);
    this.refresh();
  }

  refresh(): void {
    const dex = this.core.state.dex;
    let found = 0;
    for (const row of this.rows) {
      const entry = dex[row.id];
      const sp = speciesInRegion(this.regionOf(row.id)).find((s) => s.id === row.id)!;
      if (entry) {
        found++;
        row.icon.clearTint();
        row.name.setText(sp.name).setColor(THEME.cream);
        row.rarity.setText(getRarity(sp.rarity).label).setColor(RARITY_COLOR[row.rarityId]);
        row.info.setText(`Caught: ${entry.count}\nBest: ${entry.bestSizeCm} cm`);
      } else {
        row.icon.setTintFill(THEME.hex.silhouette);
        row.name.setText('???').setColor(THEME.dim);
        row.rarity.setText('Not caught yet').setColor(THEME.dim);
        row.info.setText('');
      }
    }
    this.title.setText(`Fishdex  ${found}/${this.rows.length}`);
  }

  private regionOf(speciesId: string) {
    for (const r of REGIONS) if (speciesInRegion(r.id).some((s) => s.id === speciesId)) return r.id;
    return REGIONS[0].id;
  }
}
