"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { CATEGORY_LABEL, type Category } from "@/lib/issues";
import { compressImage } from "@/lib/client";
import { MAP_CENTER } from "@/lib/wards";
import type { LatLng } from "@/components/LocationPicker";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="empty">Loading map…</div>,
});

interface ReportResult {
  merged: boolean; reportCount: number; category: Category; severity: number;
  description: string; ward: string; aiSource: "ai" | "mock"; photoUrl: string;
}
type State =
  | { kind: "idle" }
  | { kind: "working"; preview: string; step: string }
  | { kind: "locate"; preview: string; why: string }
  | { kind: "done"; result: ReportResult; secs: number; preview: string }
  | { kind: "error"; message: string; hint?: string; retry?: boolean };

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej({ code: 2 });
    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  });
}

export default function ReportPage() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const posRef = useRef<Promise<GeolocationPosition> | null>(null);
  const lastFile = useRef<File | null>(null);
  const manual = useRef(false); // user chose "I can't turn on location"
  const t0 = useRef(0);

  function start(skipGps = false) {
    setState({ kind: "idle" });
    setPicked(null);
    setSearchMsg("");
    manual.current = skipGps;
    if (!skipGps) {
      // Overlap the GPS lookup with photo capture.
      const p = getPosition();
      p.catch(() => {});
      posRef.current = p;
    } else {
      posRef.current = null;
    }
    inputRef.current?.click();
  }

  async function submit(file: File, chosen?: LatLng) {
    lastFile.current = file;
    t0.current = performance.now();
    const preview = URL.createObjectURL(file);
    try {
      let coords: LatLng;
      if (chosen) {
        coords = chosen;
      } else if (manual.current) {
        setState({ kind: "locate", preview, why: "Choose where the problem is." });
        return;
      } else {
        setState({ kind: "working", preview, step: "Getting your location…" });
        if (!posRef.current) posRef.current = getPosition();
        try {
          const pos = await posRef.current;
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          posRef.current = null;
          setState({
            kind: "locate", preview,
            why: "We couldn't get your location. Search for the place or tap the spot on the map.",
          });
          return;
        }
      }
      setState({ kind: "working", preview, step: "Preparing photo…" });
      const blob = await compressImage(file);
      setState({ kind: "working", preview, step: "AI is checking the photo…" });
      const fd = new FormData();
      fd.append("photo", blob, "photo.jpg");
      fd.append("lat", String(coords.lat));
      fd.append("lng", String(coords.lng));
      let res: Response;
      try {
        res = await fetch("/api/report", { method: "POST", body: fd });
      } catch {
        setState({ kind: "error", message: "Network problem. Check your connection and retry.", retry: true });
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) return setState({ kind: "error", message: "Too many reports. Please wait a minute and try again.", retry: true });
      if (res.status === 422) return setState({ kind: "error", message: body.message || "That photo doesn't show a civic problem. Try again." });
      if (!res.ok) return setState({ kind: "error", message: body.message || "Server error. Please try again.", retry: true });
      setState({ kind: "done", result: body, secs: (performance.now() - t0.current) / 1000, preview });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message || "Something went wrong.", retry: true });
    }
  }

  function retry() {
    if (lastFile.current) submit(lastFile.current, picked || undefined);
    else start();
  }

  async function tryGpsAgain() {
    if (!lastFile.current) return;
    manual.current = false;
    posRef.current = null;
    submit(lastFile.current);
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchMsg("");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (Array.isArray(j) && j[0]) setPicked({ lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) });
      else setSearchMsg("No match found. Try a nearby landmark or tap the map.");
    } catch {
      setSearchMsg("Search is unavailable. Tap the map to place the pin.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="container hero">
      <h1>Ward Watch</h1>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="camera"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) submit(f);
        }}
      />

      {state.kind === "idle" && (
        <>
          <button className="btn-primary btn-big" onClick={() => start(false)}>Report a problem</button>
          <p className="helper">Take one photo. We handle the rest.</p>
          <button className="linkbtn" onClick={() => start(true)}>Can&apos;t turn on location? Choose it on the map</button>
          <p className="privacy">Only the photo and location are stored. No account needed.</p>
        </>
      )}

      {state.kind === "working" && (
        <div className="card" role="status" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={state.preview} alt="Your photo" />
          <div className="progress"><span className="spinner" aria-hidden /> {state.step}</div>
        </div>
      )}

      {state.kind === "locate" && (
        <div className="card" style={{ textAlign: "left" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={state.preview} alt="Your photo" style={{ maxHeight: 120 }} />
          <p role="status"><strong>{state.why}</strong></p>
          <form className="searchrow" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <label className="sr-only" htmlFor="loc-q">Search for a place</label>
            <input id="loc-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a street, landmark or area" />
            <button type="submit" disabled={searching}>{searching ? "…" : "Search"}</button>
          </form>
          {searchMsg && <p className="meta" role="status">{searchMsg}</p>}
          <div className="pickmap" aria-label="Map: tap to place the pin">
            <LocationPicker center={picked || MAP_CENTER} value={picked} onPick={setPicked} />
          </div>
          <p className="meta">{picked ? "Pin placed. Tap the map to move it." : "Tap the map to drop a pin on the problem."}</p>
          <div className="btn-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-primary" disabled={!picked} onClick={() => lastFile.current && picked && submit(lastFile.current, picked)}>
              Use this location
            </button>
            <button onClick={tryGpsAgain}>Try GPS again</button>
          </div>
          <details className="howto">
            <summary>How do I turn on location?</summary>
            <p><strong>iPhone:</strong> Settings → Privacy &amp; Security → Location Services → turn on, then allow it for your browser (Safari/Chrome → While Using).</p>
            <p><strong>Android:</strong> pull down the quick settings and turn on Location, then tap the lock icon in the address bar → Permissions → Location → Allow.</p>
          </details>
        </div>
      )}

      {state.kind === "done" && (
        <div className="card result" style={{ textAlign: "left" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={state.preview} alt="Your reported photo" />
          <h2>
            {CATEGORY_LABEL[state.result.category]}{" "}
            {state.result.aiSource === "mock" && <span className="badge badge-demo">Demo AI</span>}
          </h2>
          <p>
            Severity{" "}
            <span className="dots" role="img" aria-label={`Severity ${state.result.severity} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={"dot" + (n <= state.result.severity ? " on" : "")} />
              ))}
            </span>{" "}
            {state.result.severity}/5
          </p>
          <p>{state.result.description}</p>
          <p className="meta">{state.result.ward}</p>
          <p>
            <strong>
              {state.result.merged
                ? `Merged with an existing report - now ${state.result.reportCount} reports`
                : "New issue created"}
            </strong>
          </p>
          <p className="meta">Reported in {state.secs.toFixed(1)} s</p>
          <button className="btn-primary btn-big" onClick={() => start(false)}>Report another</button>
        </div>
      )}

      {state.kind === "error" && (
        <div className="alert alert-error" role="alert" style={{ textAlign: "left" }}>
          <strong>{state.message}</strong>
          {state.hint && <p>{state.hint}</p>}
          <div className="btn-row">
            {state.retry ? (
              <button className="btn-primary" onClick={retry}>Try again</button>
            ) : (
              <button className="btn-primary" onClick={() => start(false)}>Take another photo</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
