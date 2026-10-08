// API smoke test: node scripts/smoke.mjs (BASE_URL env, default http://localhost:3000)
import { readFileSync } from "node:fs";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PASS = process.env.ADMIN_PASSCODE || "";
const img1 = readFileSync(new URL("./fixtures/sample1.jpg", import.meta.url));
const img2 = readFileSync(new URL("./fixtures/sample2.jpg", import.meta.url));
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failed++; };

// Worked examples from spec 8.2
const day = 86_400_000;
const prio = (s, c, d) => Math.round(s * c * (1 + Math.min(d, 14) / 7) * 10) / 10;
check(prio(5, 3, 7) === 30, "priority 5x3x7d = 30.0");
check(prio(4, 2, 3) === 11.4, "priority 4x2x3d = 11.4");
check(prio(3, 1, 0) === 3, "priority 3x1xnew = 3.0");

async function report(img, lat, lng) {
  const fd = new FormData();
  fd.append("photo", new Blob([img], { type: "image/jpeg" }), "p.jpg");
  fd.append("lat", String(lat)); fd.append("lng", String(lng));
  const r = await fetch(`${BASE}/api/report`, { method: "POST", body: fd });
  return { status: r.status, body: await r.json() };
}

// Unique spot per run so reruns do not merge into old data.
const lat = 16.5 + Math.random() * 0.2, lng = 80.6 + Math.random() * 0.2;
const h = PASS ? { "x-admin-passcode": PASS } : {};

const a = await report(img1, lat, lng);
check(a.status === 200, `first report 200 (got ${a.status} ${a.body.message || ""})`);
const b = await report(img1, lat, lng);
check(b.body.merged === true && b.body.reportCount === 2, "second report at same spot merges, count 2");
check(b.body.issueId === a.body.issueId, "merged into same issue id");
const c = await report(img1, lat + 0.0009, lng); // ~100 m north
check(c.body.issueId && c.body.issueId !== a.body.issueId && c.body.merged === false, "report 100 m away creates new issue");

const list = await (await fetch(`${BASE}/api/issues`)).json();
const open = list.issues.filter((i) => i.status !== "resolved");
check(open.every((x, i) => i === 0 || open[i - 1].priority >= x.priority), "open issues sorted by priority desc");

const bad = await fetch(`${BASE}/api/issues/${a.body.issueId}`, {
  method: "PATCH", headers: { "content-type": "application/json", "x-admin-passcode": "definitely-wrong" },
  body: JSON.stringify({ status: "assigned" }),
});
if (PASS) check(bad.status === 401, "wrong passcode returns 401");

const asg = await fetch(`${BASE}/api/issues/${a.body.issueId}`, {
  method: "PATCH", headers: { "content-type": "application/json", ...h }, body: JSON.stringify({ status: "assigned" }),
});
const asgBody = await asg.json();
check(asg.status === 200 && asgBody.issue.status === "assigned", "assign -> assigned");
const again = await fetch(`${BASE}/api/issues/${a.body.issueId}`, {
  method: "PATCH", headers: { "content-type": "application/json", ...h }, body: JSON.stringify({ status: "assigned" }),
});
check(again.status === 409, "assign twice -> 409");

const fd = new FormData();
fd.append("photo", new Blob([img2], { type: "image/jpeg" }), "after.jpg");
const res = await fetch(`${BASE}/api/issues/${a.body.issueId}/resolve`, { method: "POST", headers: h, body: fd });
const resBody = await res.json();
check(res.status === 200, `resolve responds 200 (got ${res.status})`);
if (resBody.aiSource === "mock") {
  check(resBody.resolved === true && resBody.issue.status === "resolved", "mock mode: resolve -> resolved");
} else {
  check(typeof resBody.resolved === "boolean", `real AI verdict: resolved=${resBody.resolved} (${resBody.reason})`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
