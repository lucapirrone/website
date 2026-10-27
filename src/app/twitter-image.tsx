import { DATA } from "@/content/site";
import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = `${DATA.person.name}, ${DATA.person.role} a ${DATA.person.city}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const P = DATA.person;
  return ogCard({ eyebrow: `${P.role} · ${P.city}`, title: P.name, text: P.intro, rows: [["Progetti", DATA.projects.map((p) => p.title).join(" · ")]] });
}
