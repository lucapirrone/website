import { DATA } from "@/content/site";
import { ProjectFacts, Stack } from "./ProjectFacts";
import { projectPath } from "@/lib/seo";

/* versione classica della home: HTML server-rendered, sempre presente per lettori e motori di ricerca */
export function ClassicView() {
  const P = DATA.person,
    list = [...DATA.projects].sort((a, b) => b.weight - a.weight),
    lot = DATA.freeLots[0];
  return (
    <main id="classic">
      <div className="c-bar">
        <div className="c-wrap">
          <span className="c-logo">{P.name}</span>
        </div>
      </div>
      <div className="c-wrap">
        <section className="c-hero">
          <div>
            <div className="eyebrow">
              {P.role} · {P.city}
            </div>
            <h2 className="c-name">
              {P.name.split(" ")[0]}
              <br />
              {P.name.split(" ").slice(1).join(" ")}
            </h2>
          </div>
          <div>
            <p>{P.intro}</p>
            <div className="c-facts">
              <div>
                <span className="eyebrow">Progetti</span>
                <strong>{DATA.projects.length} in corso</strong>
              </div>
              <div>
                <span className="eyebrow">Base</span>
                <strong>{P.city}</strong>
              </div>
              <div>
                <span className="eyebrow">Ora lì</span>
                <strong id="c-time">--:--</strong>
              </div>
            </div>
          </div>
        </section>
        <section className="c-sec" id="progetti" aria-labelledby="c-proj-title">
          <header>
            <h2 id="c-proj-title">Progetti in corso</h2>
            <span className="eyebrow">Ordinati per peso, da 1 a 5</span>
          </header>
          <div className="c-list">
            {list.map((p, i) => (
              <article className={`c-proj${i === 0 ? " lead" : ""}`} id={`p-${p.id}`} key={p.id}>
                <div className="num">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="eyebrow">
                    {p.tag} · {p.role}
                  </div>
                  <h3>
                    <a href={projectPath(p)}>{p.title}</a>
                  </h3>
                  <p>{p.text}</p>
                </div>
                <div className="c-meta">
                  <ProjectFacts p={p} />
                  <div>
                    <span className="eyebrow">Stack</span>
                    <Stack items={p.stack} />
                  </div>
                  <div className="actions">
                    <a className="cta" href={projectPath(p)}>
                      Scheda completa <span>→</span>
                    </a>
                    {p.url && (
                      <a className="cta ghost" href={p.url} target="_blank" rel="noopener">
                        {p.url.replace("https://", "")} <span>↗</span>
                      </a>
                    )}
                    <button className="cta ghost" data-goto={p.id}>
                      Vedi nella città <span>→</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="c-sec" id="contatti" aria-labelledby="c-free-title" style={{ scrollMarginTop: 96 }}>
          <div className="c-free">
            <div>
              <div className="eyebrow">{DATA.freeLots.length} lotti liberi</div>
              <h2 id="c-free-title">Spazio per il prossimo progetto</h2>
              <p>{lot.text}</p>
            </div>
            <div className="actions">
              <button className="cta" id="c-contact">
                Proponi un progetto
              </button>
            </div>
          </div>
          <p className="eyebrow" id="c-contact-out" hidden style={{ marginTop: 14 }}>
            Qui andrà il contatto reale (email o form).
          </p>
        </section>
        <footer className="c-foot">
          <span>© {P.name}</span>
          <span>
            Stessi contenuti della versione 3D · <button id="c-data">vedi i dati</button>
          </span>
        </footer>
      </div>
    </main>
  );
}
