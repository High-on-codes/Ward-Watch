import Link from "next/link";
import Icon, { Mark } from "@/components/Icon";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-in">
        <div className="footer-brand">
          <Link href="/" className="brand"><Mark size={24} /><span>Ward Watch</span></Link>
          <p>{SITE.tagline} Built for {SITE.event}.</p>
        </div>
        <nav aria-label="Footer" className="footer-cols">
          <div>
            <h2>Use it</h2>
            <Link href="/">Report a problem</Link>
            <Link href="/dashboard">Live dashboard</Link>
            <Link href="/wards">Ward leaderboard</Link>
          </div>
          <div>
            <h2>Learn</h2>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/help">Help and FAQ</Link>
            <a href={SITE.repo} rel="noopener">Source on GitHub</a>
          </div>
          <div>
            <h2>Legal</h2>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms of use</Link>
            <a href={SITE.issues} rel="noopener">Contact</a>
          </div>
        </nav>
      </div>
      <div className="footer-base">
        <span>Not an emergency service. For danger to life, call <strong>112</strong>.</span>
        <a href={SITE.repo} rel="noopener" className="footer-gh"><Icon name="github" size={16} /> High-on-codes/Ward-Watch</a>
      </div>
    </footer>
  );
}
