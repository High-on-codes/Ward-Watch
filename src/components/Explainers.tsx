"use client";

import { useState } from "react";
import { bandFor, computePriority } from "@/lib/issues";

const DAY = 86_400_000;

export function PriorityCalculator() {
  const [severity, setSeverity] = useState(3);
  const [reports, setReports] = useState(2);
  const [age, setAge] = useState(4);
  const now = Date.now();
  const priority = computePriority(severity, reports, new Date(now - age * DAY), "reported", now);
  const band = bandFor(priority);
  const ageFactor = 1 + Math.min(age, 14) / 7;
  // Meter scale: 0..30, with band edges at 5, 10, 20.
  const pos = Math.min(100, (priority / 30) * 100);

  return (
    <div className="viz calc">
      <label>
        <span>Severity <b>{severity}/5</b></span>
        <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} />
      </label>
      <label>
        <span>Reports merged into it <b>{reports}</b></span>
        <input type="range" min={1} max={8} value={reports} onChange={(e) => setReports(Number(e.target.value))} />
      </label>
      <label>
        <span>Days open <b>{age} d · ×{ageFactor.toFixed(2)}</b></span>
        <input type="range" min={0} max={21} value={age} onChange={(e) => setAge(Number(e.target.value))} />
      </label>
      <div className="calc-meter" aria-hidden><i style={{ left: `${pos}%` }} /></div>
      <div className="calc-out" aria-live="polite">
        <div>
          <span className="meta">Priority</span>
          <div><b>{priority}</b></div>
        </div>
        <span className={`badge badge-${band}`}>{band}</span>
      </div>
      <p className="viz-cap">Age stops counting after 14 days, so the factor tops out at ×3. Resolved issues drop to 0.</p>
    </div>
  );
}

export function VerifyDemo() {
  const [conf, setConf] = useState(82);
  const [fixed, setFixed] = useState(true);
  const ok = fixed && conf >= 60;
  const R = 80;
  const len = Math.PI * R;
  const off = len * (1 - conf / 100);
  const tx = 100 + R * Math.cos(Math.PI * (1 - 0.6));
  const ty = 100 - R * Math.sin(Math.PI * (1 - 0.6));

  return (
    <div className="viz calc">
      <svg viewBox="0 0 200 128" role="img" aria-label={`Confidence ${conf}%, threshold 60%`}>
        <path className="gauge-arc" d="M20 100 A80 80 0 0 1 180 100" />
        <path className="gauge-ok" d={`M${tx.toFixed(1)} ${ty.toFixed(1)} A80 80 0 0 1 180 100`} />
        <path className="gauge-val" d="M20 100 A80 80 0 0 1 180 100" style={{ strokeDasharray: len, strokeDashoffset: off }} />
        <line x1={tx} y1={ty - 12} x2={tx} y2={ty + 12} stroke="var(--ink)" strokeWidth="2" transform={`rotate(${90 - 180 * 0.4} ${tx} ${ty})`} />
        <text x="100" y="88" className="gauge-text">{conf}%</text>
        <text x="100" y="124" className="gauge-sub">CONFIDENCE · CLOSE AT 60%</text>
      </svg>
      <label>
        <span>Model confidence <b>{conf}%</b></span>
        <input type="range" min={0} max={100} value={conf} onChange={(e) => setConf(Number(e.target.value))} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
        <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--primary)" }} />
        The after-photo shows the problem removed
      </label>
      <div className={"alert " + (ok ? "alert-ok" : "alert-warn")} role="status" style={{ margin: 0 }}>
        {ok
          ? "Verified. The ticket closes and the issue leaves the queue."
          : "Not verified. The reason is saved and the issue stays open for another try."}
      </div>
    </div>
  );
}
