import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PriorityCalculator, VerifyDemo } from "@/components/Explainers";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Ward Watch triages photos, merges duplicate reports, ranks priority and verifies fixes before a ticket can close.",
};

export default function HowItWorks() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow" data-reveal>How it works</span>
        <h1 data-reveal style={{ ["--d" as string]: 1 }}>Quiet on the surface. <em>Careful</em> underneath.</h1>
        <p data-reveal style={{ ["--d" as string]: 2 }}>
          Civic issues usually arrive as calls and WhatsApp photos with no location, category or severity. Officials can&apos;t tell what is
          urgent, duplicates flood the queue, and tickets get closed without being fixed. Here is what Ward Watch does instead.
        </p>
      </header>

      <section className="deep" id="triage" aria-labelledby="triage-h">
        <div>
          <span className="eyebrow">01 · Triage</span>
          <h2 id="triage-h">A photo becomes a <em>structured report</em></h2>
          <p>
            Your phone resizes the photo and re-encodes it, which also strips EXIF metadata, then sends it with your location. A vision model
            returns one JSON object: whether it is a civic issue at all, its category, a severity from 1 to 5, and one factual sentence.
          </p>
          <p>
            Selfies, screenshots and indoor scenes are turned away politely and the photo is deleted. The model is told to ignore people and
            number plates and never to describe individuals.
          </p>
          <p className="meta">
            No AI key configured, or the API is down? Ward Watch falls back to deterministic demo results and shows a <span className="badge badge-demo">Demo AI</span> badge, so the app never goes dead.
          </p>
        </div>
        <div className="viz" data-reveal>
          <div className="triage-card" aria-label="Example triage result">
            <div className="row"><span>is_civic_issue</span><span>true</span></div>
            <div className="row"><span>category</span><span>&quot;pothole&quot;</span></div>
            <div className="row"><span>severity</span><span>4 <span className="dots" aria-hidden>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={"dot" + (n <= 4 ? " on" : "")} />)}</span></span></div>
            <div className="row" style={{ flexDirection: "column" }}><span>description</span><span className="typing">&quot;Deep pothole across the left lane beside the bus stop.&quot;</span></div>
          </div>
          <p className="viz-cap">Example output. Severity 1 is cosmetic, 4 blocks a path or drain, 5 is an immediate hazard.</p>
        </div>
      </section>

      <section className="deep flip" id="dedupe" aria-labelledby="dedupe-h">
        <div>
          <span className="eyebrow">02 · Merge</span>
          <h2 id="dedupe-h">Ten reports of one pothole are <em>one issue</em></h2>
          <p>
            A new report joins an existing issue when it is the same category, not yet resolved, and within 30 m. The database checks this with
            PostGIS <code>ST_DWithin</code> in a single transaction, under a per-category lock, so two people reporting at the same moment can&apos;t
            both create a new issue.
          </p>
          <p>Each merge raises the report count and keeps the highest severity anyone saw, which pushes the issue up the queue.</p>
        </div>
        <div className="viz dd-viz" data-reveal>
          <svg viewBox="0 0 320 220" role="img" aria-label="An open issue with a 30 metre radius. A same-category report inside merges; a different category inside, and a report outside, stay separate.">
            <rect width="320" height="220" rx="12" fill="var(--map-bg)" />
            <path d="M-10 120 H330 M150 -10 V230" stroke="var(--map-road)" strokeWidth="14" />
            <circle cx="150" cy="110" r="62" className="dd-radius" />
            <text x="214" y="58" fontFamily="var(--f-mono)" fontSize="11" fill="var(--muted)">30 m</text>
            <line x1="150" y1="110" x2="186" y2="84" stroke="var(--ink)" strokeDasharray="3 3" strokeOpacity=".5" />
            <circle cx="150" cy="110" r="10" fill="#b9500e" stroke="var(--surface)" strokeWidth="3" className="hit" />
            <circle cx="186" cy="84" r="7" fill="#b9500e" stroke="var(--surface)" strokeWidth="2.5" />
            <rect x="112" y="140" width="13" height="13" rx="3" fill="#3459c0" stroke="var(--surface)" strokeWidth="2.5" />
            <circle cx="268" cy="176" r="7" fill="#b9500e" stroke="var(--surface)" strokeWidth="2.5" />
          </svg>
          <ul className="ticks" style={{ marginTop: 14, fontSize: ".9rem" }}>
            <li><Icon name="merge" size={18} /> Pothole inside 30 m: merges, count becomes 2</li>
            <li><Icon name="list" size={18} /> Blocked drain inside 30 m: different category, its own issue</li>
            <li><Icon name="pin" size={18} /> Pothole further away: a separate issue</li>
          </ul>
        </div>
      </section>

      <section className="deep" id="priority" aria-labelledby="priority-h">
        <div>
          <span className="eyebrow">03 · Priority</span>
          <h2 id="priority-h">Urgency that <em>grows</em> while nobody acts</h2>
          <p>
            <code>priority = severity × reports × ageFactor</code>, where <code>ageFactor = 1 + min(days, 14) / 7</code>. Resolved issues score 0.
            Bands: critical at 20 and above, high at 10, medium at 5, low below that.
          </p>
          <p>Move the sliders to see how a mild problem that many people notice, or that sits for a fortnight, climbs into view.</p>
        </div>
        <div data-reveal><PriorityCalculator /></div>
      </section>

      <section className="deep flip" id="verify" aria-labelledby="verify-h">
        <div>
          <span className="eyebrow">04 · Verified closure</span>
          <h2 id="verify-h">A ticket can&apos;t be <em>closed falsely</em></h2>
          <p>
            When a worker resolves an issue, they upload an after-photo. The model sees the original and the after-photo together and answers
            whether the same place now has the problem removed or repaired, with a confidence from 0 to 1.
          </p>
          <p>
            The issue closes only when the answer is yes and confidence is at least 0.6. A different place, a dark or blurry shot, or a problem
            still in view keeps it open, and the reason is saved for the officer.
          </p>
        </div>
        <div data-reveal><VerifyDemo /></div>
      </section>

      <section className="deep" id="architecture" aria-labelledby="arch-h">
        <div>
          <span className="eyebrow">Under the hood</span>
          <h2 id="arch-h">Small, typed, and <em>closed</em> by default</h2>
          <ul className="ticks">
            <li><Icon name="check" size={18} /> Phone PWA and dashboard talk only to Next.js API routes. The browser never talks to the database.</li>
            <li><Icon name="check" size={18} /> Supabase Postgres with PostGIS for issues and reports; Supabase Storage for photos. Row-level security is on with no policies.</li>
            <li><Icon name="check" size={18} /> Anthropic vision API for triage and verification, with validated JSON output and one retry.</li>
            <li><Icon name="check" size={18} /> Assign and resolve are protected by an admin passcode; reports are rate-limited per IP address.</li>
            <li><Icon name="check" size={18} /> Category-agnostic pipeline, wards from JSON and a map centre from config, so another city is a settings change.</li>
          </ul>
        </div>
        <div className="viz" data-reveal>
          <span className="eyebrow">Honest limitations</span>
          <ul className="ticks" style={{ marginTop: 14 }}>
            <li><Icon name="eye" size={18} /> AI can misclassify, so officers keep the final say.</li>
            <li><Icon name="eye" size={18} /> Wards use nearest-centre placeholders; production should use real ward boundaries.</li>
            <li><Icon name="eye" size={18} /> No accounts beyond the demo passcode yet.</li>
            <li><Icon name="eye" size={18} /> Next: notifications, multilingual UI, municipal API integration and an offline queue.</li>
          </ul>
        </div>
      </section>

      <section className="closer" style={{ paddingTop: 72 }}>
        <h2>Seen enough? <em>Try it.</em></h2>
        <div className="row">
          <Link className="btn btn-primary" href="/"><Icon name="camera" size={18} /> Report a problem</Link>
          <Link className="btn" href="/help">Read the FAQ</Link>
        </div>
      </section>
    </div>
  );
}
