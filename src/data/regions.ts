export type RegionId = 'coral_bay' | 'north_atlantic' | 'amazon_river';

export interface RegionDef {
  id: RegionId;
  name: string;
  /** Short label for small buttons. */
  shortName: string;
  subtitle: string;
}

export const REGIONS: readonly RegionDef[] = [
  { id: 'coral_bay', name: 'Coral Bay', shortName: 'Coral Bay', subtitle: 'Southeast Asia' },
  { id: 'north_atlantic', name: 'North Atlantic', shortName: 'N. Atlantic', subtitle: 'Atlantic Ocean' },
  { id: 'amazon_river', name: 'Amazon River', shortName: 'Amazon', subtitle: 'South America' },
];

export const DEFAULT_REGION: RegionId = 'coral_bay';

export function isRegionId(v: unknown): v is RegionId {
  return REGIONS.some((r) => r.id === v);
}
