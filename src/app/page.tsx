"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { CATEGORY_LABEL, type Category } from "@/lib/issues";
import { compressImage } from "@/lib/client";
import { MAP_CENTER } from "@/lib/wards";
import Link from "next/link";
import Icon from "@/components/Icon";
import HeroScene from "@/components/HeroScene";
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


  const STEPS = ["Getting your location…", "Preparing photo…", "AI is checking the photo…"];
  const STEP_LABEL = ["Finding where you are", "Preparing the photo and removing its metadata", "AI is checking the photo"];

  return (
    <>
      <section className="hero">
        <svg className="hero-contours" viewBox="0 0 900 640" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <path key={k} d={`M${-60 + k * 6} ${120 + k * 52} C ${180 + k * 10} ${40 + k * 58}, ${360 - k * 8} ${260 + k * 40}, ${560 + k * 4} ${150 + k * 50} S ${880 - k * 12} ${90 + k * 56}, ${1000} ${170 + k * 48}`} />
            ))}
          </g>
        </svg>
        <div className="wrap hero-grid">
          <div className="report-panel">
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
              <div className="flow">
                <span className="eyebrow"><span className="live-dot" aria-hidden /> Your ward, watched with care</span>
                <h1>Report a civic problem with <em>one photo.</em></h1>
                <p className="lede">
                  AI classifies and rates it, nearby duplicates merge automatically, and the municipality sees a live,
                  priority-ranked map. A ticket closes only when an after-photo proves the fix.
                </p>
                <div className="cta-ring">
                  <button className="btn-primary btn-big" onClick={() => start(false)}>
                    <Icon name="camera" /> Report a problem
                  </button>
                </div>
                <p className="helper">Take one photo. We handle the rest.</p>
                <button className="linkbtn" onClick={() => start(true)}>Can&apos;t turn on location? Choose it on the map</button>
                <p className="privacy"><Icon name="lock" size={16} /> Only the photo and location are stored. No account needed.</p>
              </div>
            )}

            {state.kind === "working" && (
              <div className="card flow" role="status" aria-live="polite">
                <div className="preview-wrap scanning">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="preview" src={state.preview} alt="Your photo" />
                </div>
                <ol className="steps-mini">
                  {STEP_LABEL.map((label, n) => {
                    const at = Math.max(0, STEPS.indexOf(state.step));
                    return (
                      <li key={label} className={n < at ? "done" : n === at ? "now" : ""}>
                        <i aria-hidden>{n < at && <Icon name="check" size={14} />}</i>
                        {label}
                      </li>
                    );
                  })}
                </ol>
                <span className="sr-only">{state.step}</span>
              </div>
            )}

            {state.kind === "locate" && (
              <div className="card flow">
                <div className="preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="preview" src={state.preview} alt="Your photo" style={{ maxHeight: 120 }} />
                </div>
                <p role="status" style={{ margin: "0 0 4px" }}><strong>{state.why}</strong></p>
                <form className="searchrow" onSubmit={(e) => { e.preventDefault(); search(); }}>
                  <label className="sr-only" htmlFor="loc-q">Search for a place</label>
                  <input id="loc-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a street, landmark or area" />
                  <button type="submit" disabled={searching}>{searching ? <span className="spinner" aria-label="Searching" /> : "Search"}</button>
                </form>
                {searchMsg && <p className="meta" role="status">{searchMsg}</p>}
                <div className="pickmap" aria-label="Map: tap to place the pin">
                  <LocationPicker center={picked || MAP_CENTER} value={picked} onPick={setPicked} />
                </div>
                <p className="meta">{picked ? "Pin placed. Tap the map to move it." : "Tap the map to drop a pin on the problem."}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button className="btn-primary" disabled={!picked} onClick={() => lastFile.current && picked && submit(lastFile.current, picked)}>
                    <Icon name="pin" size={18} /> Use this location
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
              <div className="card flow result">
                <div className="preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="preview" src={state.preview} alt="Your reported photo" />
                </div>
                <span className="eyebrow"><span className="live-dot ok" aria-hidden /> Report received</span>
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
                <div className="result-banner">
                  <Icon name={state.result.merged ? "merge" : "check"} />
                  {state.result.merged
                    ? `Merged with an existing report - now ${state.result.reportCount} reports`
                    : "New issue created"}
                </div>
                <div className="result-meta">
                  <span><Icon name="pin" size={14} /> {state.result.ward}</span>
                  <span className="mono">Reported in {state.secs.toFixed(1)} s</span>
                </div>
                <button className="btn-primary btn-big" onClick={() => start(false)}><Icon name="camera" /> Report another</button>
                <p style={{ textAlign: "center", marginTop: 12 }}><Link href="/dashboard">See it on the live map</Link></p>
              </div>
            )}

            {state.kind === "error" && (
              <div className="alert alert-error flow" role="alert">
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

          <HeroScene />
        </div>
      </section>

      <section className="section section-tint" aria-labelledby="journey-h">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow" data-reveal>From photo to fixed</span>
            <h2 id="journey-h" data-reveal style={{ ["--d" as string]: 1 }}>Four quiet steps. <em>Nothing</em> slips through.</h2>
            <p data-reveal style={{ ["--d" as string]: 2 }}>No forms, no phone trees. Every report is placed, rated, grouped with its neighbours and followed until the fix is proven.</p>
          </div>
          <div className="journey" data-trace-wrap>
            <svg className="journey-line" viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true">
              <path className="base" d="M20 0 V1000" vectorEffect="non-scaling-stroke" />
              <path className="trace" data-trace d="M20 0 V1000" vectorEffect="non-scaling-stroke" />
            </svg>
            <article className="jstep" data-step>
              <span className="num">01 · SNAP</span>
              <h3><Icon name="camera" size={24} /> One photo, located for you</h3>
              <p>Open the camera and shoot. GPS is captured while you frame the shot, so there is nothing to type. If location is off, drop a pin or search for a landmark instead.</p>
              <span className="fact"><Icon name="lock" size={14} /> EXIF removed on your phone</span>
            </article>
            <article className="jstep" data-step>
              <span className="num">02 · TRIAGE</span>
              <h3><Icon name="spark" size={24} /> AI names it and rates it</h3>
              <p>A vision model classifies the problem and rates severity from 1 (cosmetic) to 5 (immediate hazard), with one factual sentence. It is told to ignore people and number plates.</p>
              <span className="fact">category · severity 1–5 · description</span>
            </article>
            <article className="jstep" data-step>
              <span className="num">03 · MERGE</span>
              <h3><Icon name="merge" size={24} /> Neighbours become one issue</h3>
              <p>A report of the same kind within 30 m of an open issue joins it instead of cluttering the queue. Each extra report raises the count and keeps the highest severity.</p>
              <span className="fact">PostGIS ST_DWithin · 30 m</span>
            </article>
            <article className="jstep" data-step>
              <span className="num">04 · VERIFY</span>
              <h3><Icon name="shield" size={24} /> Closed only when it&apos;s really fixed</h3>
              <p>The worker uploads an after-photo. AI compares it with the original, and the ticket closes only if it is resolved with at least 60% confidence. Otherwise the reason is kept and the issue stays open.</p>
              <span className="fact"><Icon name="check" size={14} /> confidence ≥ 0.6</span>
            </article>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="duo-h">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow" data-reveal>Two sides of the same street</span>
            <h2 id="duo-h" data-reveal style={{ ["--d" as string]: 1 }}>Calm for citizens. <em>Clear</em> for officers.</h2>
          </div>
          <div className="duo">
            <div className="card" data-reveal>
              <span className="icon-chip"><Icon name="people" /></span>
              <h3>For people reporting</h3>
              <ul className="ticks">
                <li><Icon name="check" size={18} /> One tap to the camera, automatic GPS, no forms.</li>
                <li><Icon name="check" size={18} /> No account, no sign-up. Only the photo and location are stored.</li>
                <li><Icon name="check" size={18} /> Instant feedback: what it is, how serious, and whether others reported it too.</li>
                <li><Icon name="check" size={18} /> Installable on your home screen like an app.</li>
              </ul>
            </div>
            <div className="card" data-reveal style={{ ["--d" as string]: 1 }}>
              <span className="icon-chip"><Icon name="building" /></span>
              <h3>For the municipality</h3>
              <ul className="ticks">
                <li><Icon name="check" size={18} /> A live map, refreshed every 15 seconds and ranked by priority.</li>
                <li><Icon name="check" size={18} /> Duplicates merged automatically, so the queue stays honest.</li>
                <li><Icon name="check" size={18} /> Assign and resolve from the field with a photo.</li>
                <li><Icon name="check" size={18} /> A public ward leaderboard for resolution rate and speed.</li>
              </ul>
            </div>
          </div>
          <div className="cats" data-reveal aria-label="Categories Ward Watch recognises">
            {Object.values(CATEGORY_LABEL).map((c) => <span key={c} className="cat"><i aria-hidden /> {c}</span>)}
          </div>
        </div>
      </section>

      <section className="section section-tint" aria-labelledby="prio-h">
        <div className="wrap formula">
          <div>
            <span className="eyebrow" data-reveal>Attention, in order</span>
            <h2 id="prio-h" data-reveal style={{ ["--d" as string]: 1, fontSize: "clamp(2rem, 4.4vw, 3.1rem)", margin: "14px 0" }}>
              The most urgent problem is <em>always on top.</em>
            </h2>
            <p data-reveal style={{ ["--d" as string]: 2, color: "var(--ink-2)" }}>
              Priority grows with severity, with every extra report, and with time left unfixed (capped at two weeks), so old problems can&apos;t quietly sink.
            </p>
            <p data-reveal style={{ ["--d" as string]: 3 }}><Link href="/how-it-works#priority">Try the priority calculator</Link></p>
          </div>
          <div className="viz" data-reveal style={{ ["--d" as string]: 1 }}>
            <div className="equation" aria-label="priority equals severity times reports times age factor">
              <span className="term">priority<small>score</small></span><span className="op">=</span>
              <span className="term">severity<small>1–5</small></span><span className="op">×</span>
              <span className="term">reports<small>count</small></span><span className="op">×</span>
              <span className="term">age<small>1 to 3×</small></span>
            </div>
            <div className="bands">
              <div className="b-c"><b>Critical</b><span>≥ 20</span></div>
              <div className="b-h"><b>High</b><span>≥ 10</span></div>
              <div className="b-m"><b>Medium</b><span>≥ 5</span></div>
              <div className="b-l"><b>Low</b><span>&lt; 5</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-label="Ward Watch in numbers">
        <div className="wrap">
          <div className="numbers" data-reveal>
            <div><b><span data-count="1">1</span></b><span>photo is all a report needs</span></div>
            <div><b><span data-count="30">30</span><small>m</small></b><span>radius for merging duplicates</span></div>
            <div><b><span data-count="60">60</span><small>%</small></b><span>minimum AI confidence to close</span></div>
            <div><b><span data-count="15">15</span><small>s</small></b><span>between live dashboard refreshes</span></div>
          </div>
        </div>
      </section>

      <section className="closer" aria-labelledby="closer-h">
        <svg className="rings" viewBox="0 0 900 900" aria-hidden="true">
          <circle cx="450" cy="450" r="140" /><circle cx="450" cy="450" r="230" /><circle cx="450" cy="450" r="330" /><circle cx="450" cy="450" r="440" />
        </svg>
        <div className="wrap">
          <span className="eyebrow" data-reveal>See something?</span>
          <h2 id="closer-h" data-reveal style={{ ["--d" as string]: 1 }}>Your street is <em>worth one photo.</em></h2>
          <p data-reveal style={{ ["--d" as string]: 2 }}>It takes a few seconds. Ward Watch keeps an eye on it until it&apos;s fixed.</p>
          <div className="row" data-reveal style={{ ["--d" as string]: 3 }}>
            <button className="btn-primary" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); start(false); }}>
              <Icon name="camera" size={18} /> Report a problem
            </button>
            <Link className="btn" href="/dashboard"><Icon name="map" size={18} /> Open the live map</Link>
          </div>
        </div>
      </section>
    </>
  );
}
