export const OCEAN_COLOR = "#1a2a3a";
export const LAKE_COLOR = "#22405a";
export const NEUTRAL_LAND_COLOR = "#3a3530";

/** Colore di riserva per uno stato senza colore assegnato ancora da admin/map, stabile per id. */
export function fallbackColorForState(id: number): string {
    const hue = (id * 47) % 360;
    return `hsl(${hue}, 38%, 32%)`;
}
