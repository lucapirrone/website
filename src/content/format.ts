import type { Project } from "./site";

export const STATUS = { active: "Attivo", building: "In costruzione" } as const;
export const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/* "2021-09" → "Settembre 2021" e da quanto tempo */
export function sinceText(p: Pick<Project, "since">, now = new Date()) {
  const [y, m] = p.since.split("-").map(Number);
  const months = (now.getFullYear() - y) * 12 + now.getMonth() + 1 - m;
  const ago =
    months < 1
      ? "da questo mese"
      : months < 12
        ? `da ${months} ${months === 1 ? "mese" : "mesi"}`
        : `da ${Math.floor(months / 12)} ${months < 24 ? "anno" : "anni"}`;
  return { date: MESI[m - 1][0].toUpperCase() + MESI[m - 1].slice(1) + " " + y, ago };
}

export const ghText = (p: Pick<Project, "github">) => (p.github ? p.github.replace(/^https?:\/\//, "") : "Repository privato");
export const fmtNum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const fmtMonth = (d: string) => {
  const [y, m] = d.split("-").map(Number);
  return `${MESI[m - 1]} ${y}`;
};
