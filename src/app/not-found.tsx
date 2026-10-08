import Link from "next/link";
import Icon, { Mark } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="lost">
      <span style={{ color: "var(--primary)", display: "inline-block" }}><Mark size={56} /></span>
      <h1>This street isn&apos;t <em>on our map.</em></h1>
      <p>The page you were looking for doesn&apos;t exist or has moved. Everything else is still being watched.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href="/"><Icon name="camera" size={18} /> Report a problem</Link>
        <Link className="btn" href="/dashboard"><Icon name="map" size={18} /> Live dashboard</Link>
      </div>
    </div>
  );
}
