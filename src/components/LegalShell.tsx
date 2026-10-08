export default function LegalShell({
  eyebrow, title, intro, toc, children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: React.ReactNode;
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow" data-reveal>{eyebrow}</span>
        <h1 data-reveal style={{ ["--d" as string]: 1 }}>{title}</h1>
        <p data-reveal style={{ ["--d" as string]: 2 }}>{intro}</p>
      </header>
      <div className="legal">
        <nav className="toc" aria-label="On this page">
          <h2>On this page</h2>
          <ol>
            {toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.label}</a></li>)}
          </ol>
        </nav>
        <article className="prose">{children}</article>
      </div>
    </div>
  );
}
