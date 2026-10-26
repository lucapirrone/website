import { DATA, getProject } from "@/content/site";
import { STATUS, sinceText } from "@/content/format";
import { BRAND } from "@/content/brand";
import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Scheda del progetto";
export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => DATA.projects.map((p) => ({ slug: p.id }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProject((await params).slug)!;
  return ogCard({
    eyebrow: `Cartello di cantiere · ${DATA.person.name}`,
    title: p.title,
    text: p.text,
    accent: BRAND[p.id],
    rows: [
      ["Inizio lavori", sinceText(p).date],
      ["Stato", STATUS[p.status]],
      ["Stack", p.stack.slice(0, 3).join(" · ")],
    ],
  });
}
