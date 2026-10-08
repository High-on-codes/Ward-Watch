import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Ward Watch stores when you report a problem, who processes it, and what it never collects.",
};

const TOC = [
  { id: "summary", label: "In short" },
  { id: "collect", label: "What we collect" },
  { id: "public", label: "What is public" },
  { id: "not", label: "What we never collect" },
  { id: "processors", label: "Services we use" },
  { id: "storage", label: "Browser storage" },
  { id: "retention", label: "How long we keep it" },
  { id: "rights", label: "Your choices" },
  { id: "changes", label: "Changes and contact" },
];

export default function Privacy() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title={<>Only a photo and <em>a place.</em></>}
      intro="Ward Watch is built to need as little about you as possible. This page explains exactly what is stored when you report a problem and who handles it."
      toc={TOC}
    >
      <p className="updated">Last updated {SITE.legalUpdated}</p>

      <section className="summary-box" id="summary">
        <h2>In short</h2>
        <ul>
          <li>No account, no name, no email, no phone number.</li>
          <li>We store the photo you take and where the problem is. Photo metadata (EXIF) is removed on your phone first.</li>
          <li>Reported issues, including their photos, appear on the public dashboard.</li>
          <li>No cookies, no analytics, no advertising trackers.</li>
        </ul>
      </section>

      <h2 id="collect">What we collect</h2>
      <h3>When you report a problem</h3>
      <table className="data-table">
        <thead><tr><th>Data</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>The photo, resized and re-encoded on your device (which strips EXIF metadata such as camera model and embedded GPS)</td><td>So the AI can classify it and officers can see the problem</td></tr>
          <tr><td>The location of the problem: your device GPS, or the pin you placed or the place you searched</td><td>To put the issue on the map, assign a ward and merge nearby duplicates</td></tr>
          <tr><td>What the AI concluded: category, severity 1 to 5, a one-sentence description</td><td>To rank issues by priority</td></tr>
          <tr><td>The time of the report and the ward it falls in</td><td>To track age, priority and how quickly wards resolve issues</td></tr>
        </tbody>
      </table>
      <h3>When a worker resolves an issue</h3>
      <p>The after-photo they upload, and the AI&apos;s verification result (resolved or not, confidence and a one-sentence reason).</p>
      <h3>Your IP address</h3>
      <p>
        To stop flooding, the server counts recent reports per IP address in memory (up to 20 a minute). This count is not written to the
        database and disappears when the server restarts. Our hosting provider may keep standard request logs, which include IP addresses.
      </p>
      <p>
        If the AI decides a photo does not show a civic problem, the photo is deleted straight away and nothing is saved.
      </p>

      <h2 id="public">What is public</h2>
      <p>
        Ward Watch is a public accountability tool. Every reported issue, with its photo, location, category, description, status and dates, is
        shown on the <Link href="/dashboard">dashboard</Link> and counted on the <Link href="/wards">ward leaderboard</Link>. Photos are stored at
        web addresses that anyone with the link can open.
      </p>
      <p>
        Please frame the problem, not people. Avoid faces, number plates, house interiors and anything personal. The AI is told to ignore people
        and never to describe individuals, but it can&apos;t remove them from your photo.
      </p>

      <h2 id="not">What we never collect</h2>
      <ul>
        <li>Your name, email address, phone number or any account details.</li>
        <li>Contacts, other photos on your phone, or your location history. Location is read once, only when you report.</li>
        <li>Cookies, analytics, fingerprinting or advertising identifiers.</li>
      </ul>

      <h2 id="processors">Services we use</h2>
      <table className="data-table">
        <thead><tr><th>Service</th><th>What it receives</th></tr></thead>
        <tbody>
          <tr><td>Supabase (database and storage)</td><td>Issues, reports and photos</td></tr>
          <tr><td>Anthropic (AI vision model)</td><td>The photo for triage; the before and after photos for verification</td></tr>
          <tr><td>Our hosting provider</td><td>Requests to the site and API, including your IP address</td></tr>
          <tr><td>OpenStreetMap tile servers</td><td>Map tile requests from your browser when a map is shown, including your IP address</td></tr>
          <tr><td>Nominatim (OpenStreetMap search)</td><td>The text you type, only if you search for a place instead of using GPS</td></tr>
        </tbody>
      </table>
      <p>Your browser never talks to our database directly; all access goes through the Ward Watch server.</p>

      <h2 id="storage">Browser storage</h2>
      <p>
        Ward Watch sets no cookies. If you are an officer and enter the admin passcode on the dashboard, it is kept in your browser&apos;s session
        storage so you aren&apos;t asked again, and it is cleared when you close the tab.
      </p>

      <h2 id="retention">How long we keep it</h2>
      <p>
        Issues and their photos are kept as part of the public record of what was reported and fixed, including after resolution. There is no
        automatic deletion schedule yet. Rejected photos are deleted immediately.
      </p>

      <h2 id="rights">Your choices</h2>
      <ul>
        <li>You can report with a pin on the map instead of sharing your device location.</li>
        <li>
          If a photo shows you, someone you know, or anything personal, ask us to remove it by <a href={SITE.issues} rel="noopener">opening an issue on GitHub</a> with
          a description of the report (place and approximate time). Please don&apos;t post the personal details themselves in the issue.
        </li>
        <li>Because we don&apos;t collect identity, we can&apos;t link reports to you, and won&apos;t ask you to prove who you are beyond describing the report.</li>
      </ul>

      <h2 id="changes">Changes and contact</h2>
      <p>
        If this policy changes, we&apos;ll update this page and the date at the top. Questions go to the project&apos;s <a href={SITE.issues} rel="noopener">GitHub issues</a>.
        See also the <Link href="/terms">terms of use</Link>.
      </p>
    </LegalShell>
  );
}
