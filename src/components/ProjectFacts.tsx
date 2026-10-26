import type { Project } from "@/content/site";
import { STATUS, ghText, sinceText } from "@/content/format";

export const Bars = ({ n }: { n: number }) => (
  <span className="weight" aria-label={`Peso ${n} su 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <u key={i} className={i <= n ? "on" : ""} />
    ))}
  </span>
);

export const Stack = ({ items }: { items: string[] }) => (
  <ul className="c-stack" aria-label="Stack">
    {items.map((n) => (
      <li key={n}>{n}</li>
    ))}
  </ul>
);

/* stato, inizio, GitHub: gli stessi dati del cartello di cantiere */
export function ProjectFacts({ p, weight = true }: { p: Project; weight?: boolean }) {
  return (
    <>
      <div>
        <span className="eyebrow">Stato</span>
        <strong>
          <span className={`dot ${p.status}`} />
          {STATUS[p.status]}
        </strong>
      </div>
      {weight && (
        <div>
          <span className="eyebrow">Peso</span>
          <Bars n={p.weight} />
        </div>
      )}
      <div>
        <span className="eyebrow">Inizio lavori</span>
        <strong>
          <time dateTime={p.since}>{sinceText(p).date}</time>
        </strong>
      </div>
      <div>
        <span className="eyebrow">GitHub</span>
        <strong>
          {p.github ? (
            <a href={p.github} target="_blank" rel="noopener">
              {ghText(p)} ↗
            </a>
          ) : (
            ghText(p)
          )}
        </strong>
      </div>
    </>
  );
}
