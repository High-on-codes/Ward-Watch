"use client";

import { useEffect, useMemo, useState } from "react";
import type { IssueWithPriority } from "@/lib/issues";
import { WARDS } from "@/lib/wards";

interface Row { ward: string; total: number; open: number; resolved: number; rate: number; avgHrs: number | null; oldest: number | null }

export default function WardsPage() {
  const [issues, setIssues] = useState<IssueWithPriority[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/issues", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `HTTP ${r.status}`); return r.json(); })
      .then((j) => setIssues(j.issues))
      .catch((e) => setError(e.message));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const names = new Set<string>(WARDS.map((w) => w.name));
    (issues || []).forEach((i) => i.ward && names.add(i.ward));
    const out = [...names].map((ward) => {
      const mine = (issues || []).filter((i) => i.ward === ward);
      const done = mine.filter((i) => i.status === "resolved" && i.resolved_at);
      const open = mine.filter((i) => i.status !== "resolved");
      const hrs = done.map((i) => (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / 3_600_000);
      const oldest = open.length ? Math.max(...open.map((i) => (Date.now() - new Date(i.created_at).getTime()) / 86_400_000)) : null;
      return {
        ward, total: mine.length, open: open.length, resolved: mine.filter((i) => i.status === "resolved").length,
        rate: mine.length ? mine.filter((i) => i.status === "resolved").length / mine.length : 0,
        avgHrs: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null, oldest,
      };
    });
    return out.sort((a, b) => b.rate - a.rate || (a.avgHrs ?? Infinity) - (b.avgHrs ?? Infinity));
  }, [issues]);

  const podium = rows.filter((r) => r.total > 0).slice(0, 3);

  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow"><span className="live-dot ok" aria-hidden /> Public accountability</span>
        <h1>Ward <em>leaderboard</em></h1>
        <p>Wards are ranked by the share of reported issues they have resolved, then by how quickly they fix them.</p>
      </header>
      <div style={{ paddingBottom: 96 }}>
        {error && <div className="alert alert-error" role="alert">Could not load data: {error}</div>}
        {!issues && !error && <div className="empty"><span className="spinner" aria-hidden /> Loading…</div>}
        {issues && podium.length > 0 && (
          <div className="podium">
            {podium.map((r, idx) => (
              <div key={r.ward} className={"card" + (idx === 0 ? " first" : "")}>
                <span className="rank">#{idx + 1} · {r.resolved} of {r.total} resolved</span>
                <h3>{r.ward}</h3>
                <div className="big">{Math.round(r.rate * 100)}<small style={{ fontSize: "1.1rem", color: "var(--muted)" }}>%</small></div>
                <p className="meta" style={{ margin: "8px 0 0" }}>
                  {r.avgHrs === null ? "No fixes timed yet" : `Avg ${r.avgHrs.toFixed(1)} h to resolve`} · {r.open} open
                </p>
              </div>
            ))}
          </div>
        )}
        {issues && (
          <div className="table-wrap">
            <table className="wards">
              <thead>
                <tr><th>#</th><th>Ward</th><th>Open</th><th>Resolved</th><th>Resolution rate</th><th>Avg time to resolve</th><th>Oldest open</th></tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.ward}>
                    <td className="num">{idx + 1}</td>
                    <td><strong>{r.ward}</strong></td>
                    <td className="num">{r.open}</td>
                    <td className="num">{r.resolved}/{r.total}</td>
                    <td><span className="bar" aria-hidden><i style={{ width: `${Math.round(r.rate * 100)}%`, animationDelay: `${idx * 80}ms` }} /></span><span className="mono">{Math.round(r.rate * 100)}%</span></td>
                    <td className="num">{r.avgHrs === null ? "-" : `${r.avgHrs.toFixed(1)} h`}</td>
                    <td className={"num" + (r.oldest !== null && r.oldest >= 7 ? " old" : "")}>{r.oldest === null ? "-" : `${Math.floor(r.oldest)} d`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
