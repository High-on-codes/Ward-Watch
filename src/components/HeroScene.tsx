/**
 * Looping illustration of one issue's life: a report lands, a second report nearby merges into it,
 * priority rises, and an after-photo closes it. Pure SVG + CSS keyframes (see .scene in globals.css).
 */
export default function HeroScene() {
  return (
    <figure className="scene" aria-label="Illustration: two nearby reports merge into one issue, which is later verified as fixed">
      <div className="scene-chrome">
        <span className="live-dot" aria-hidden /> Live ward map
        <span className="scene-coord">16.4928° N · 80.4982° E</span>
      </div>
      <svg viewBox="0 0 400 300" role="presentation">
        <defs>
          <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="sc-grid" />
          </pattern>
        </defs>
        <rect width="400" height="300" className="sc-bg" />
        <rect width="400" height="300" fill="url(#dots)" />
        <path d="M-10 262 C 60 236, 110 290, 190 268 S 320 246, 410 276 L410 310 L-10 310Z" className="sc-water" />
        <g className="sc-blocks">
          <rect x="18" y="20" width="92" height="74" rx="8" />
          <rect x="126" y="20" width="88" height="74" rx="8" />
          <rect x="248" y="20" width="132" height="74" rx="8" />
          <rect x="18" y="138" width="92" height="66" rx="8" />
          <rect x="126" y="138" width="88" height="56" rx="8" />
          <rect x="248" y="138" width="60" height="48" rx="8" />
          <rect x="322" y="138" width="58" height="34" rx="8" />
        </g>
        <g className="sc-roads">
          <path d="M-10 116 H410" />
          <path d="M230 -10 V310" />
          <path d="M118 -10 V240" />
          <path d="M-10 232 C 120 214, 260 196, 410 180" />
        </g>
        <g className="sc-contours">
          <path d="M20 60 C 80 40, 140 80, 200 58 S 320 30, 390 62" />
          <path d="M10 180 C 90 160, 150 200, 230 176 S 340 150, 400 170" />
        </g>

        {/* ambient issues elsewhere, breathing slowly */}
        <g className="sc-amb">
          <circle cx="70" cy="168" r="5" className="amb amb-1" />
          <circle cx="330" cy="58" r="4.5" className="amb amb-2" />
          <circle cx="168" cy="60" r="4" className="amb amb-3" />
        </g>

        {/* dedupe radius around issue A */}
        <circle cx="230" cy="116" r="38" className="sc-radius" />
        <text x="272" y="88" className="sc-radius-label">30 m</text>

        {/* second report B, slides into A */}
        <g className="sc-b">
          <circle cx="262" cy="142" r="7.5" className="pin pin-b" />
        </g>

        {/* issue A */}
        <g className="sc-a">
          <circle cx="230" cy="116" r="7" className="ripple r1" />
          <circle cx="230" cy="116" r="7" className="ripple r2" />
          <circle cx="230" cy="116" r="9.5" className="pin pin-a" />
          <path d="M225.5 116.5 l3 3 l6 -6.5" className="sc-check" />
        </g>
        <g className="sc-count">
          <circle cx="244" cy="103" r="8" />
          <text x="244" y="106.5">2</text>
        </g>
      </svg>

      <div className="scene-card" aria-hidden>
        <div className="sc-cap c1"><b>New report</b><span>Pothole · severity 4/5 · Ward 3</span></div>
        <div className="sc-cap c2"><b>Second report, 18 m away</b><span>Same category, so it merges</span></div>
        <div className="sc-cap c3"><b>One issue, 2 reports</b><span>Priority rises to the top of the queue</span></div>
        <div className="sc-cap c4"><b>Fixed and verified</b><span>After-photo checked by AI · 92%</span></div>
      </div>
    </figure>
  );
}
