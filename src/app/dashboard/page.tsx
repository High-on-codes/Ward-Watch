"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL, type Category, type IssueWithPriority, type Status } from "@/lib/issues";
import { MAP_CENTER } from "@/lib/wards";
import { adminFetch, ageDays, compressImage } from "@/lib/client";

const IssueMap = dynamic(() => import("@/components/IssueMap"), {
  ssr: false,
  loading: () => <div className="empty">Loading map…</div>,
});

type Banner = { id: string; ok: boolean; text: string };

export default function Dashboard() {
  const [issues, setIssues] = useState<IssueWithPriority[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resolveTarget = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/issues", { cache: "no-store" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `HTTP ${r.status}`);
      const j = await r.json();
      setIssues(j.issues);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e) {
      setError((e as Error).message); // keep previous data
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [load]);

  const stats = useMemo(() => {
    const all = issues || [];
    const open = all.filter((i) => i.status !== "resolved");
    const resolved = all.filter((i) => i.status === "resolved" && i.resolved_at);
    const day = resolved.filter((i) => Date.now() - new Date(i.resolved_at!).getTime() < 86_400_000);
    const hrs = resolved.map((i) => (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / 3_600_000);
    return {
      open: open.length,
      critical: open.filter((i) => i.band === "critical").length,
      day: day.length,
      avg: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null,
    };
  }, [issues]);

  const visible = useMemo(
    () =>
      (issues || []).filter(
        (i) =>
          (catFilter === "all" || i.category === catFilter) &&
          (statusFilter === "all" || i.status === statusFilter) &&
          (showResolved || statusFilter === "resolved" || i.status !== "resolved")
      ),
    [issues, catFilter, statusFilter, showResolved]
  );

  function select(id: string, scroll: boolean) {
    setSelected(id);
    if (scroll) document.getElementById(`issue-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function assign(id: string) {
    setBusy(id);
    try {
      const r = await adminFetch(`/api/issues/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "assigned" }),
      });
      if (r.status === 401) setBanner({ id, ok: false, text: "Wrong or missing admin passcode." });
      else if (!r.ok) setBanner({ id, ok: false, text: (await r.json().catch(() => ({}))).message || "Could not assign." });
      else await load();
    } finally {
      setBusy(null);
    }
  }

  function startResolve(id: string) {
    resolveTarget.current = id;
    setBanner(null);
    fileRef.current?.click();
  }

  async function onAfterPhoto(file: File) {
    const id = resolveTarget.current;
    if (!id) return;
    setBusy(id);
    setBanner({ id, ok: true, text: "Verifying with AI…" });
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append("photo", blob, "after.jpg");
      const r = await adminFetch(`/api/issues/${id}/resolve`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) setBanner({ id, ok: false, text: "Wrong or missing admin passcode." });
      else if (!r.ok) setBanner({ id, ok: false, text: j.message || "Could not verify. Try again." });
      else if (j.resolved) setBanner({ id, ok: true, text: `Verified, ${Math.round(j.confidence * 100)}%: ${j.reason}` });
      else setBanner({ id, ok: false, text: `Not verified: ${j.reason}` });
      await load();
    } catch (e) {
      setBanner({ id, ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const secs = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;

  return (
    <div className="dash">
      <input
        ref={fileRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onAfterPhoto(f); }}
      />
      <div className="stats">
        <div className="stat"><b>{stats.open}</b><span>Open issues</span></div>
        <div className="stat"><b>{stats.critical}</b><span>Critical</span></div>
        <div className="stat"><b>{stats.day}</b><span>Resolved in last 24 h</span></div>
        <div className="stat"><b>{stats.avg === null ? "-" : stats.avg.toFixed(1)}</b><span>Avg hours to resolve</span></div>
      </div>
      <div className="dash-toolbar">
        <span aria-live="polite">{secs === null ? "Loading…" : `Updated ${secs}s ago`}</span>
        {error && <span style={{ color: "var(--critical)" }}>Update failed: {error}</span>}
        <label>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "all")}>
            <option value="all">All</option><option value="reported">Reported</option>
            <option value="assigned">Assigned</option><option value="resolved">Resolved</option>
          </select>
        </label>
        <button className="chip" aria-pressed={catFilter === "all"} onClick={() => setCatFilter("all")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} className="chip" aria-pressed={catFilter === c} onClick={() => setCatFilter(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="dash-body">
        <div className="map-wrap">
          <IssueMap
            issues={visible} center={MAP_CENTER} selectedId={selected} showResolved={showResolved || statusFilter === "resolved"}
            onSelect={(id) => select(id, true)}
          />
        </div>
        <div className="list">
          {issues === null && !error && <div className="empty"><span className="spinner" aria-hidden /> Loading issues…</div>}
          {issues === null && error && <div className="alert alert-error" role="alert">Could not load issues: {error}</div>}
          {issues && issues.length === 0 && (
            <div className="empty">No issues yet. <Link href="/">Report the first problem</Link>.</div>
          )}
          {issues && issues.length > 0 && visible.length === 0 && <div className="empty">No issues match these filters.</div>}
          {visible.map((i) => (
            <article
              key={i.id} id={`issue-${i.id}`} className={"card issue" + (i.id === selected ? " active" : "")}
              onClick={() => select(i.id, false)}
            >
              <div className="issue-head">
                <strong>{CATEGORY_LABEL[i.category]}</strong>
                {i.status !== "resolved" && <span className={`badge badge-${i.band}`}>{i.band}</span>}
                <span className={`pill pill-${i.status}`}>{i.status}</span>
                {i.status === "resolved" && <span className="badge badge-verified">Verified</span>}
                <span className="prio">Priority {i.priority}</span>
              </div>
              <div className="meta">
                {i.report_count} report{i.report_count === 1 ? "" : "s"} - {i.status === "resolved" ? "was open" : "open"}{" "}
                {Math.floor(ageDays(i.created_at))}d - {i.ward || "No ward"} - severity {i.severity}/5
              </div>
              {i.description && <div>{i.description}</div>}
              {i.status === "resolved" && i.verification && (
                <div className="meta">AI: {i.verification.reason} ({Math.round(i.verification.confidence * 100)}%)</div>
              )}
              <div className="thumbs">
                {i.before_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={i.before_photo} alt={`Before: ${CATEGORY_LABEL[i.category]}`} loading="lazy" />
                ) : (
                  <div className="placeholder">{CATEGORY_LABEL[i.category]}</div>
                )}
                {i.after_photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={i.after_photo} alt="After photo" loading="lazy" />
                )}
              </div>
              {banner && banner.id === i.id && (
                <div className={"alert " + (banner.ok ? "alert-ok" : "alert-warn")} role="status">
                  {banner.text}
                  {!banner.ok && banner.text.startsWith("Not verified") && (
                    <div className="btn-row">
                      <button className="btn-sm" onClick={(e) => { e.stopPropagation(); startResolve(i.id); }}>Try again</button>
                    </div>
                  )}
                </div>
              )}
              {i.status !== "resolved" && (
                <div className="actions">
                  {i.status === "reported" && (
                    <button className="btn-sm" disabled={busy === i.id} onClick={(e) => { e.stopPropagation(); assign(i.id); }}>Assign</button>
                  )}
                  <button className="btn-sm btn-primary" disabled={busy === i.id} onClick={(e) => { e.stopPropagation(); startResolve(i.id); }}>
                    {busy === i.id ? "Working…" : "Resolve"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
