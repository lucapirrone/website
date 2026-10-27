import type { Metadata } from "next";
import { DATA, type Project } from "@/content/site";
import { sinceText } from "@/content/format";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://lucapirrone.com").replace(/\/$/, "");
export const SITE_NAME = `${DATA.person.name} · ${DATA.person.role}`;
export const HOME_TITLE = `${DATA.person.name} — ${DATA.person.role} a ${DATA.person.city}`;
export const HOME_DESCRIPTION = `${DATA.person.intro} Progetti: ${DATA.projects.map((p) => p.title).join(", ")}.`;

export const projectPath = (p: Pick<Project, "id">) => `/progetti/${p.id}`;

export function projectDescription(p: Project) {
  return `${p.text} ${p.role} dal ${sinceText(p).date.toLowerCase()}. Stack: ${p.stack.slice(0, 4).join(", ")}.`.slice(0, 300);
}

export function projectMetadata(p: Project): Metadata {
  const title = `${p.title} — ${p.tag.toLowerCase()} di ${DATA.person.name}`;
  const description = projectDescription(p);
  return {
    title,
    description,
    alternates: { canonical: projectPath(p) },
    openGraph: { type: "article", title, description, url: projectPath(p), siteName: SITE_NAME, locale: "it_IT" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const personId = `${SITE_URL}/#person`;

export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: DATA.person.name,
        jobTitle: DATA.person.role,
        url: SITE_URL,
        address: { "@type": "PostalAddress", addressLocality: DATA.person.city, addressCountry: "IT" },
        worksFor: DATA.projects.filter((p) => p.tag === "Lavoro").map((p) => ({ "@type": "Organization", name: p.title, url: p.url })),
        knowsAbout: [...new Set(DATA.projects.flatMap((p) => p.stack))],
        sameAs: DATA.person.sameAs,
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, inLanguage: "it-IT", publisher: { "@id": personId } },
      {
        "@type": "ItemList",
        name: "Progetti in corso",
        itemListElement: DATA.projects.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${projectPath(p)}`, name: p.title })),
      },
    ],
  };
}

export function projectJsonLd(p: Project) {
  const url = `${SITE_URL}${projectPath(p)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#app`,
        name: p.title,
        description: p.text,
        url: p.url ?? url,
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        dateCreated: p.since,
        keywords: p.stack.join(", "),
        creator: { "@id": personId, "@type": "Person", name: DATA.person.name },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: DATA.person.name, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: p.title, item: url },
        ],
      },
    ],
  };
}

/* JSON dentro <script>: `<` escapato per non chiudere il tag */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
