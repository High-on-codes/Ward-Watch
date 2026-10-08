// Seed demo data via the report_issue RPC. Usage: npm run seed [-- --reset]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local)."); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const [cLat, cLng] = (process.env.NEXT_PUBLIC_MAP_CENTER || "16.5062,80.6480").split(",").map(Number);
const wardsRaw = JSON.parse(readFileSync(new URL("../data/wards.json", import.meta.url), "utf8"));
const wards = wardsRaw.map((w) => ({ name: w.name, lat: cLat + w.dLat, lng: cLng + w.dLng }));
const nearestWard = (lat, lng) => wards.reduce((b, w) => ((w.lat - lat) ** 2 + (w.lng - lng) ** 2 < (b.lat - lat) ** 2 + (b.lng - lng) ** 2 ? w : b)).name;

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(20261008);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const DESC = {
  garbage: ["Pile of mixed household waste spilling onto the roadside.", "Overflowing community bin with scattered plastic waste.", "Open dump of construction debris near the footpath."],
  pothole: ["Deep pothole in the carriageway near the junction.", "Cluster of potholes damaging the road surface.", "Broken road edge with exposed gravel."],
  drain_blockage: ["Storm drain blocked with silt and plastic.", "Drain cover clogged, water standing around it.", "Roadside drain choked with garbage."],
  waterlogging: ["Water pooled across the lane after rain.", "Stagnant water covering a low stretch of road.", "Flooded underpass with slow drainage."],
  other: ["Fallen branch obstructing the footpath."],
};
const CATS = ["garbage", "pothole", "drain_blockage", "waterlogging"];
// Per-ward resolution tendency so the leaderboard has winners and laggards.
const WARD_RATE = { "Ward 1": 0.75, "Ward 2": 0.6, "Ward 3": 0.45, "Ward 4": 0.35, "Ward 5": 0.2, "Ward 6": 0.1 };
const M_LAT = 1 / 111_320, M_LNG = 1 / (111_320 * Math.cos((cLat * Math.PI) / 180));

if (process.argv.includes("--reset")) {
  for (const t of ["reports", "issues"]) {
    const { error } = await sb.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { console.error(`reset ${t}:`, error.message); process.exit(1); }
  }
  console.log("Reset: cleared reports and issues.");
}

const now = Date.now(), H = 3_600_000;
const spots = [];
// 12 hotspots spread around the ward centroids (well over 30 m apart per category)
for (let i = 0; i < 12; i++) {
  const w = wards[i % wards.length];
  spots.push({
    lat: w.lat + (rnd() - 0.5) * 0.008, lng: w.lng + (rnd() - 0.5) * 0.008,
    category: CATS[i % 4], sev: int(1, 5), n: int(1, 6),
  });
}
// 4 isolated single reports
for (let i = 0; i < 4; i++) {
  const w = pick(wards);
  spots.push({ lat: w.lat + (rnd() - 0.5) * 0.01, lng: w.lng + (rnd() - 0.5) * 0.01, category: pick(CATS), sev: int(1, 3), n: 1 });
}
const touched = new Set();
let inserted = 0;
for (const s of spots) {
  const first = now - int(1, 10 * 24) * H; // oldest report first => created_at
  const times = Array.from({ length: s.n }, (_, k) => (k === 0 ? first : first + int(1, Math.max(2, Math.floor((now - first) / H))) * H)).sort((a, b) => a - b);
  for (let k = 0; k < s.n; k++) {
    const jLat = (rnd() - 0.5) * 2 * 10 * M_LAT * 0.7, jLng = (rnd() - 0.5) * 2 * 10 * M_LNG * 0.7;
    const lat = s.lat + jLat, lng = s.lng + jLng;
    const sev = Math.min(5, Math.max(1, s.sev + int(-1, 1)));
    const { data, error } = await sb.rpc("report_issue", {
      p_category: s.category, p_severity: sev, p_description: pick(DESC[s.category]), p_lat: lat, p_lng: lng,
      p_ward: nearestWard(s.lat, s.lng), p_photo: null, p_radius_m: Number(process.env.DEDUPE_RADIUS_M) || 30,
      p_created_at: new Date(Math.min(times[k], now)).toISOString(),
    });
    if (error) { console.error("report_issue:", error.message); process.exit(1); }
    touched.add((Array.isArray(data) ? data[0] : data).o_issue_id);
    inserted++;
  }
}

// Resolve roughly 40% of the issues, weighted per ward.
const { data: rows, error: e2 } = await sb.from("issues").select("id,ward,created_at").in("id", [...touched]);
if (e2) { console.error(e2.message); process.exit(1); }
let resolved = 0;
for (const r of rows) {
  if (rnd() < (WARD_RATE[r.ward] ?? 0.4) * 0.6) {
    const created = new Date(r.created_at).getTime();
    const ward = parseInt(String(r.ward).replace(/\D/g, ""), 10) || 3;
    const hrs = int(4, 20 + ward * 16); // slower wards take longer
    const at = Math.min(now - 30 * 60_000, created + hrs * H);
    const { error } = await sb.from("issues").update({
      status: "resolved", resolved_at: new Date(at).toISOString(), updated_at: new Date(at).toISOString(),
      verification: { resolved: true, confidence: 0.9, reason: "Seeded demo data", source: "seed" },
    }).eq("id", r.id);
    if (error) { console.error(error.message); process.exit(1); }
    resolved++;
  }
}
console.log(`Seeded ${inserted} reports into ${rows.length} issues; ${resolved} marked resolved.`);
