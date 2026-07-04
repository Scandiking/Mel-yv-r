// Exact harbor names from https://api.met.no/weatherapi/tidalwater/1.1/available
// Coordinates are approximate — used only for nearest-neighbor lookup.
const HARBORS: { name: string; lat: number; lon: number }[] = [
  { name: 'Andenes',      lat: 69.32, lon: 16.11 },
  { name: 'Bergen',       lat: 60.39, lon:  5.32 },
  { name: 'Bodø',         lat: 67.28, lon: 14.39 },
  { name: 'Bruravik',     lat: 60.44, lon:  6.48 },
  { name: 'Bøfjorden',    lat: 62.67, lon:  8.57 },
  { name: 'Hammerfest',   lat: 70.66, lon: 23.68 },
  { name: 'Harstad',      lat: 68.80, lon: 16.54 },
  { name: 'Heimsjø',      lat: 63.43, lon:  9.10 },
  { name: 'Helgeroa',     lat: 58.99, lon:  9.86 },
  { name: 'Honningsvåg',  lat: 70.98, lon: 25.97 },
  { name: 'Kabelvåg',     lat: 68.21, lon: 14.52 },
  { name: 'Kristiansund', lat: 63.11, lon:  7.73 },
  { name: 'Leirvik',      lat: 59.79, lon:  5.50 },
  { name: 'Mausund',      lat: 63.87, lon:  8.67 },
  { name: 'Måløy',        lat: 61.93, lon:  5.11 },
  { name: 'Narvik',       lat: 68.44, lon: 17.44 },
  { name: 'Ny-ålesund',   lat: 78.92, lon: 11.93 },
  { name: 'Oscarsborg',   lat: 59.68, lon: 10.60 },
  { name: 'Oslo',         lat: 59.91, lon: 10.75 },
  { name: 'Rørvik',       lat: 64.86, lon: 11.24 },
  { name: 'Sandnes',      lat: 58.85, lon:  5.73 },
  { name: 'Sirevåg',      lat: 58.41, lon:  5.76 },
  { name: 'Solumstrand',  lat: 59.14, lon:  9.62 },
  { name: 'Stavanger',    lat: 58.97, lon:  5.73 },
  { name: 'Tregde',       lat: 58.00, lon:  7.55 },
  { name: 'Tromsø',       lat: 69.65, lon: 18.96 },
  { name: 'Trondheim',    lat: 63.43, lon: 10.39 },
  { name: 'Træna',        lat: 66.49, lon: 12.08 },
  { name: 'Vardø',        lat: 70.37, lon: 31.11 },
  { name: 'Viker',        lat: 59.03, lon: 10.95 },
  { name: 'Ålesund',      lat: 62.47, lon:  6.15 },
];

export function findNearestHarbor(lat: number, lon: number): string {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = HARBORS[0];
  let bestDist = Infinity;
  for (const h of HARBORS) {
    const dlat = lat - h.lat;
    const dlon = (lon - h.lon) * cosLat;
    const dist = dlat * dlat + dlon * dlon;
    if (dist < bestDist) { bestDist = dist; best = h; }
  }
  return best.name;
}
