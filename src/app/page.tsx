import { ClassicView } from "@/components/ClassicView";
import { CityMount } from "@/components/CityMount";
import { DATA } from "@/content/site";
import { homeJsonLd, jsonLd } from "@/lib/seo";

const NOSCRIPT = `#scene,#loading,#fade,.ui,#mode,#compass{display:none!important}html body{overflow:auto!important}body #classic{display:block!important;position:static}`;

export default function Home() {
  const P = DATA.person;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(homeJsonLd()) }} />
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      <canvas id="scene" aria-label={`Città industriale 3D: ogni edificio è un progetto in corso di ${P.name.split(" ")[0]}`} />
      <div id="fade" />
      <div id="loading">Costruisco la città…</div>

      <header id="brand" className="ui">
        <div className="kicker">
          {P.role} · {P.city}
        </div>
        <h1>
          {P.name.split(" ")[0]}
          <br />
          {P.name.split(" ").slice(1).join(" ")}
        </h1>
        <p>Una città industriale: ogni edificio è un progetto che sto costruendo adesso.</p>
      </header>

      <div id="status" className="ui">
        <div className="loc" aria-live="polite">
          <span className="pin" />
          <b>{P.city}</b>
          <span id="loc-time">--:--</span>
          <span className="sep">·</span>
          <span id="loc-wx">…</span>
          <span id="loc-mode" hidden>
            manuale
          </span>
        </div>
        <button
          id="open-settings"
          className="icon-btn"
          aria-expanded="false"
          aria-controls="settings"
          aria-label="Impostazioni ora e meteo"
          title="Ora e meteo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button id="open-data" className="icon-btn" aria-label="Dati e tema" title="Dati e tema">
          {"{ }"}
        </button>
        <div id="settings" role="dialog" aria-label="Ora e meteo" hidden />
      </div>

      <div id="mode" className="ui" role="group" aria-label="Versione del sito">
        <button data-mode="3d" aria-pressed="true">
          3D
        </button>
        <button data-mode="classic" aria-pressed="false">
          Classica
        </button>
      </div>

      <aside id="caption" className="ui" aria-live="polite" hidden />
      <aside id="inside" className="ui" aria-live="polite" hidden />
      <nav id="tour" className="ui" aria-label="Tappe del percorso" />

      <ClassicView />

      <div id="hint" className="ui">
        Scorri per percorrere il viale · trascina per guardarti intorno
      </div>
      <button id="compass" className="ui" title="Torna alla vista iniziale" aria-label="Torna alla vista iniziale">
        <span>N</span>
      </button>

      <div id="data" hidden>
        <div className="box" role="dialog" aria-modal="true" aria-labelledby="data-title">
          <header>
            <div>
              <h3 id="data-title">Dati, pianta e aspetto sono separati</h3>
              <p>
                I contenuti (sinistra) non contengono né forme né colori. La pianta decide dove sta ogni edificio; palette, ora di Roma e meteo decidono
                l&apos;aspetto (destra).
              </p>
            </div>
            <button className="btn" id="close-data">
              Chiudi
            </button>
          </header>
          <div className="cols">
            <div>
              <h4>world.json</h4>
              <pre id="data-json" />
            </div>
            <div>
              <h4>palette + ambiente</h4>
              <pre id="theme-json" />
            </div>
          </div>
        </div>
      </div>
      <CityMount />
    </>
  );
}
