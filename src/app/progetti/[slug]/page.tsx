import { notFound } from "next/navigation";
import { DATA, getProject } from "@/content/site";
import { fmtMonth, fmtNum, sinceText } from "@/content/format";
import { ProjectFacts, Stack } from "@/components/ProjectFacts";
import { jsonLd, projectJsonLd, projectMetadata, projectPath } from "@/lib/seo";

export const dynamicParams = false;
export const generateStaticParams = () => DATA.projects.map((p) => ({ slug: p.id }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const p = getProject((await params).slug);
  return p ? projectMetadata(p) : {};
}

export default async function ProjectPage({ params }: Props) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const i = DATA.projects.indexOf(p),
    next = DATA.projects[(i + 1) % DATA.projects.length],
    S = sinceText(p);
  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(projectJsonLd(p)) }} />
      <div className="c-bar">
        <div className="c-wrap">
          <a className="c-logo" href="/">
            {DATA.person.name}
          </a>
        </div>
      </div>
      <main className="c-wrap">
        <nav aria-label="Percorso">
          <ol className="crumbs eyebrow">
            <li>
              <a href="/">Città</a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{p.title}</li>
          </ol>
        </nav>
        <article>
          <header className="p-hero">
            <div className="eyebrow">
              {p.tag} · {p.role}
            </div>
            <h1>{p.title}</h1>
            <p>{p.text}</p>
          </header>
          <div className="p-grid">
            <ProjectFacts p={p} weight={false} />
            <div>
              <span className="eyebrow">Commit</span>
              <strong>
                {fmtNum(p.inside.commits)} · {S.ago}
              </strong>
            </div>
          </div>
          <section className="c-sec" aria-labelledby="stack-title">
            <header>
              <h2 id="stack-title">Stack</h2>
            </header>
            <Stack items={p.stack} />
          </section>
          <section className="c-sec" aria-labelledby="timeline-title">
            <header>
              <h2 id="timeline-title">Timeline</h2>
            </header>
            <ol className="timeline">
              {p.inside.milestones.map((m) => (
                <li key={m.date + m.title}>
                  <time className="eyebrow" dateTime={m.date}>
                    {fmtMonth(m.date)}
                  </time>
                  <strong>{m.title}</strong>
                </li>
              ))}
            </ol>
          </section>
          <section className="c-sec" aria-labelledby="arch-title">
            <header>
              <h2 id="arch-title">Architettura</h2>
            </header>
            <div className="arch">
              {p.inside.arch.map((l) => (
                <div key={l.name}>
                  <span className="eyebrow">{l.name}</span>
                  <Stack items={l.items} />
                </div>
              ))}
            </div>
          </section>
        </article>
        <nav className="p-nav actions" aria-label="Altri progetti">
          {p.url && (
            <a className="cta" href={p.url} target="_blank" rel="noopener">
              Visita {p.url.replace("https://", "")} <span>↗</span>
            </a>
          )}
          <a className="cta ghost" href={`/#3d`}>
            Torna alla città
          </a>
          <a className="cta ghost" href={projectPath(next)}>
            {next.title} <span>→</span>
          </a>
        </nav>
      </main>
      <footer className="c-wrap c-foot">
        <span>© {DATA.person.name}</span>
        <span>
          {DATA.person.role} · {DATA.person.city}
        </span>
      </footer>
    </div>
  );
}
