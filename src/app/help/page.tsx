import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help and FAQ",
  description: "Answers about reporting with Ward Watch: location, photos, duplicates, privacy and how fixes are verified.",
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need an account?",
    a: <p>No. Tap Report a problem, take one photo, and you&apos;re done. Nothing asks for your name, email or phone number.</p>,
  },
  {
    q: "What can I report?",
    a: <p>Problems in public places: garbage dumps, potholes, blocked drains, waterlogging, and other civic issues such as broken streetlights or damaged footpaths, which are filed as Other.</p>,
  },
  {
    q: "My location won't turn on. Can I still report?",
    a: (
      <>
        <p>Yes. Tap &quot;Can&apos;t turn on location? Choose it on the map&quot;, take the photo, then search for a street or landmark or tap the exact spot on the map.</p>
        <p><strong>iPhone:</strong> Settings → Privacy &amp; Security → Location Services → turn on, then allow it for your browser (Safari/Chrome → While Using).</p>
        <p><strong>Android:</strong> pull down the quick settings and turn on Location, then tap the lock icon in the address bar → Permissions → Location → Allow.</p>
      </>
    ),
  },
  {
    q: "It said my photo doesn't show a civic problem.",
    a: <p>The AI turns away selfies, screenshots and indoor scenes. Step back so the problem and a bit of its surroundings are in frame, in good light, and try again. The rejected photo is deleted.</p>,
  },
  {
    q: "Someone already reported the same thing. Should I still report?",
    a: <p>Yes. If yours is the same kind of problem within 30 m of an open issue, it is merged into it. The report count goes up, and so does its priority, which tells officers it affects more people.</p>,
  },
  {
    q: "How do I know it was fixed?",
    a: <p>Open the <Link href="/dashboard">dashboard</Link> and tick Show resolved. An issue only closes when a worker&apos;s after-photo is checked by AI against the original and passes with at least 60% confidence. Resolved issues show a Verified badge and the AI&apos;s reason.</p>,
  },
  {
    q: "Who can see my photo?",
    a: <p>Anyone using the dashboard. That&apos;s what makes it accountable, so please frame the problem, not people. Read the <Link href="/privacy">privacy page</Link> for details and how to ask for a photo to be removed.</p>,
  },
  {
    q: "What does the Demo AI badge mean?",
    a: <p>The site is running without an AI key, or the AI service was briefly unreachable, so it used placeholder results to keep working. Category and severity in that case are not real assessments.</p>,
  },
  {
    q: "Can I install it like an app?",
    a: <p>Yes. On iPhone, open it in Safari, tap Share, then Add to Home Screen. On Android, open the browser menu and choose Install app or Add to Home screen.</p>,
  },
  {
    q: "I'm an officer. How do I assign or resolve?",
    a: <p>On the dashboard, choose Assign or Resolve on an issue. You&apos;ll be asked for the admin passcode once per browser tab. Resolve opens your camera for the after-photo.</p>,
  },
];

export default function Help() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow" data-reveal><Icon name="help" size={16} /> Help</span>
        <h1 data-reveal style={{ ["--d" as string]: 1 }}>Questions, <em>answered gently.</em></h1>
        <p data-reveal style={{ ["--d" as string]: 2 }}>Everything people usually ask before and after their first report.</p>
      </header>
      <div className="legal">
        <aside className="toc help-aside">
          <div className="card">
            <h2>Still stuck?</h2>
            <p className="meta" style={{ marginTop: 0 }}>Tell us what happened and on which device.</p>
            <a className="btn btn-sm" href={SITE.issues} rel="noopener"><Icon name="github" size={16} /> Open an issue</a>
          </div>
        </aside>
        <div className="faq" style={{ maxWidth: "72ch" }}>
          {FAQ.map((f, i) => (
            <details key={f.q} data-reveal style={{ ["--d" as string]: Math.min(i, 5) }} open={i === 0}>
              <summary>{f.q}</summary>
              <div>{f.a}</div>
            </details>
          ))}
          <p className="meta" style={{ marginTop: 20 }}>Not an emergency service. If anyone is in danger, call <strong>112</strong>.</p>
        </div>
      </div>
    </div>
  );
}
