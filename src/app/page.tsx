"use client";

import { useRef, useState } from "react";
import { CATEGORY_LABEL, type Category } from "@/lib/issues";
import { compressImage } from "@/lib/client";

interface ReportResult {
  merged: boolean; reportCount: number; category: Category; severity: number;
  description: string; ward: string; aiSource: "ai" | "mock"; photoUrl: string;
}
type State =
  | { kind: "idle" }
  | { kind: "working"; preview: string; step: string }
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
  const inputRef = useRef<HTMLInputElement>(null);
  const posRef = useRef<Promise<GeolocationPosition> | null>(null);
  const lastFile = useRef<File | null>(null);
  const t0 = useRef(0);

  function start() {
    setState({ kind: "idle" });
    // Overlap the GPS lookup with photo capture.
    const p = getPosition();
    p.catch(() => {});
    posRef.current = p;
    inputRef.current?.click();
  }

  async function submit(file: File) {
    lastFile.current = file;
    t0.current = performance.now();
    const preview = URL.createObjectURL(file);
    setState({ kind: "working", preview, step: "Getting your location…" });
    try {
      if (!posRef.current) posRef.current = getPosition();
      let pos: GeolocationPosition;
      try {
        pos = await posRef.current;
      } catch {
        posRef.current = null;
        setState({
          kind: "error",
          message: "We couldn't get your location.",
          hint: "Turn on Location for this site in your browser or phone settings, then try again.",
          retry: true,
        });
        return;
      }
      setState({ kind: "working", preview, step: "Preparing photo…" });
      const blob = await compressImage(file);
      setState({ kind: "working", preview, step: "AI is checking the photo…" });
      const fd = new FormData();
      fd.append("photo", blob, "photo.jpg");
      fd.append("lat", String(pos.coords.latitude));
      fd.append("lng", String(pos.coords.longitude));
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
    if (lastFile.current) submit(lastFile.current);
    else start();
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
          <button className="btn-primary btn-big" onClick={start}>Report a problem</button>
          <p className="helper">Take one photo. We handle the rest.</p>
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
          <button className="btn-primary btn-big" onClick={start}>Report another</button>
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
              <button className="btn-primary" onClick={start}>Take another photo</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
