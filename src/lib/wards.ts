import wardData from "../../data/wards.json";

const DEFAULT_CENTER = "16.5062,80.6480";

function parseCenter(raw: string | undefined): { lat: number; lng: number } {
  const [lat, lng] = (raw || DEFAULT_CENTER).split(",").map((s) => parseFloat(s.trim()));
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  const [dl, dg] = DEFAULT_CENTER.split(",").map(Number);
  return { lat: dl, lng: dg };
}

export const MAP_CENTER = parseCenter(process.env.NEXT_PUBLIC_MAP_CENTER);

export const WARDS: { name: string; lat: number; lng: number }[] = wardData.map((w) => ({
  name: w.name,
  lat: MAP_CENTER.lat + w.dLat,
  lng: MAP_CENTER.lng + w.dLng,
}));

export function nearestWard(lat: number, lng: number): string {
  let best = WARDS[0];
  let bestD = Infinity;
  for (const w of WARDS) {
    const d = (w.lat - lat) ** 2 + (w.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best.name;
}
