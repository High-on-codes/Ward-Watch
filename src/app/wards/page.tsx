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

  return (
    <div className="wide">
      <h1>Ward accountability</h1>
      <p className="helper">Wards are ranked by the share of reported issues they have resolved, then by how quickly they fix them.</p>
      {error && <div className="alert alert-error" role="alert">Could not load data: {error}</div>}
      {!issues && !error && <div className="empty"><span className="spinner" aria-hidden /> Loading…</div>}
      {issues && (
        <div className="table-wrap">
          <table className="wards">
            <thead>
              <tr><th>#</th><th>Ward</th><th>Open</th><th>Resolved</th><th>Resolution rate</th><th>Avg time to resolve</th><th>Oldest open</th></tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.ward}>
                  <td>{idx + 1}</td>
                  <td><strong>{r.ward}</strong></td>
                  <td>{r.open}</td>
                  <td>{r.resolved}/{r.total}</td>
                  <td><span className="bar" aria-hidden><i style={{ width: `${Math.round(r.rate * 100)}%` }} /></span>{Math.round(r.rate * 100)}%</td>
                  <td>{r.avgHrs === null ? "-" : `${r.avgHrs.toFixed(1)} h`}</td>
                  <td>{r.oldest === null ? "-" : `${Math.floor(r.oldest)} d`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
