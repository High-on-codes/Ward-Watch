import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Ward Watch to report civic problems and for officers who resolve them.",
};

const TOC = [
  { id: "what", label: "What Ward Watch is" },
  { id: "emergency", label: "Not for emergencies" },
  { id: "use", label: "Reporting fairly" },
  { id: "content", label: "Your photos" },
  { id: "ai", label: "AI decisions" },
  { id: "officers", label: "Officer access" },
  { id: "service", label: "Availability and liability" },
  { id: "third", label: "Maps and other services" },
  { id: "changes", label: "Changes and contact" },
];

export default function Terms() {
  return (
    <LegalShell
      eyebrow="Terms of use"
      title={<>Simple rules for a <em>shared street.</em></>}
      intro="By using Ward Watch you agree to these terms. They are short because the idea is simple: report real problems honestly, and we'll keep watch until they're fixed."
      toc={TOC}
    >
      <p className="updated">Last updated {SITE.legalUpdated}</p>

      <h2 id="what">What Ward Watch is</h2>
      <p>
        Ward Watch lets anyone report a civic problem (garbage dumps, potholes, blocked drains, waterlogging and similar) with one photo, and gives
        municipal officers a priority-ranked map to act on. It was built for {SITE.event}. Unless your municipality has told you otherwise, it is a
        demonstration and not an official complaint channel, and a report here is not a formal complaint to any authority.
      </p>

      <h2 id="emergency">Not for emergencies</h2>
      <p>
        Ward Watch is not monitored around the clock. If anyone is in danger, such as an open manhole on a busy road, live wires, a fire or flooding
        that threatens homes, call <strong>112</strong> first. You can report it here afterwards.
      </p>

      <h2 id="use">Reporting fairly</h2>
      <ul>
        <li>Report real problems in public places, at the place where they actually are.</li>
        <li>Photograph the problem, not people. Don&apos;t photograph inside private homes or capture faces or number plates on purpose.</li>
        <li>Don&apos;t submit false, staged or repeated reports, offensive images, or anything you don&apos;t have the right to share.</li>
        <li>Don&apos;t try to overload the service, get around rate limits or the admin passcode, or access data other than through the site.</li>
      </ul>
      <p>We may remove reports or block access that breaks these rules.</p>

      <h2 id="content">Your photos</h2>
      <p>
        You keep any rights you have in your photo. By submitting it, you confirm you took it or may share it, and you let Ward Watch store it,
        analyse it with AI, show it publicly on the dashboard alongside the issue, and share it with the officers responsible for fixing the
        problem. See the <Link href="/privacy">privacy page</Link> for what is stored and for how to ask for a photo to be removed.
      </p>

      <h2 id="ai">AI decisions</h2>
      <p>
        Category, severity, descriptions and fix verification are produced by an AI model and can be wrong. They help rank and check work; they
        are not a judgement about anyone. Officers keep the final say. When no AI key is configured, results are clearly marked as{" "}
        <span className="badge badge-demo">Demo AI</span> and are not real assessments.
      </p>

      <h2 id="officers">Officer access</h2>
      <p>
        Assigning and resolving issues is limited to people given the admin passcode. Keep it private, use it only for genuine work on reported
        issues, and resolve an issue only with a real after-photo of the same place.
      </p>

      <h2 id="service">Availability and liability</h2>
      <p>
        Ward Watch is provided as it is, without warranties of any kind. It may be unavailable, change, or lose data, and reports may not be acted
        on. To the extent the law allows, the people who build and run Ward Watch are not liable for any loss arising from using it or relying on
        it, including a problem that is not fixed.
      </p>

      <h2 id="third">Maps and other services</h2>
      <p>
        Maps use data © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap contributors</a>, and place search uses
        Nominatim. Those services have their own terms. The source code is published on <a href={SITE.repo} rel="noopener">GitHub</a>.
      </p>

      <h2 id="changes">Changes and contact</h2>
      <p>
        We may update these terms; the date at the top will change when we do. Questions or problems: <a href={SITE.issues} rel="noopener">open an
        issue on GitHub</a>.
      </p>
    </LegalShell>
  );
}
