export type LngLat = [number, number];

/** Calcola il bounding box (min/max lng/lat) di un set di feature geojson (poligoni senza buchi). */
export function computeBBox(features: { geometry: { coordinates: number[][][] } }[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of features) {
        for (const [lng, lat] of f.geometry.coordinates[0]) {
            if (lng < minX) minX = lng;
            if (lng > maxX) maxX = lng;
            if (lat < minY) minY = lat;
            if (lat > maxY) maxY = lat;
        }
    }
    return { minX, minY, maxX, maxY };
}

/** Ray casting: true se il punto (px,py) è dentro l'anello poligonale (senza buchi). */
export function pointInRing(px: number, py: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect =
            yi > py !== yj > py &&
            px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}
