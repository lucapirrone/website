/* Unica fonte dei contenuti: pagine, SEO e città 3D leggono da qui. Niente forme né colori. */

export type Status = "active" | "building";
export type Archetype = "atrio" | "corte" | "terrazze" | "startup";

export type Milestone = { date: string; title: string };
export type ArchLayer = { name: string; items: string[] };

export type Project = {
  id: string;
  archetype: Archetype;
  title: string;
  tag: string;
  role: string;
  status: Status;
  weight: number;
  url?: string;
  since: string;
  stack: string[];
  github: string | null;
  inside: { commits: number; milestones: Milestone[]; arch: ArchLayer[] };
  text: string;
};

export type FreeLot = { id: string; title: string; text: string };

export const DATA = {
  person: {
    name: "Luca Pirrone",
    role: "Product Engineer",
    city: "Roma",
    intro: "Costruisco prodotto end-to-end, dall'idea al rilascio. Di giorno lavoro in Learnn, il resto del tempo porto avanti i miei progetti.",
    sameAs: ["https://github.com/lucapirrone"],
  },
  projects: [
    {
      id: "learnn",
      archetype: "atrio",
      title: "Learnn",
      tag: "Lavoro",
      role: "Product Engineer",
      status: "active",
      weight: 5,
      url: "https://learnn.com",
      since: "2021-09",
      stack: ["React", "React Native", "TypeScript", "AWS Lambda", "AWS CDK", "Strapi"],
      github: null,
      inside: {
        commits: 5682,
        milestones: [
          { date: "2021-09", title: "Entro in Learnn: primo commit" },
          { date: "2026-10", title: "Oltre 5.600 commit su web, app e servizi" },
        ],
        arch: [
          { name: "Client", items: ["Web React", "App React Native", "Estensione Chrome"] },
          { name: "API", items: ["AWS Lambda", "GraphQL"] },
          { name: "Contenuti", items: ["Strapi CMS", "Keycloak"] },
          { name: "Infra", items: ["DynamoDB", "AWS CDK", "Stripe"] },
        ],
      },
      text: "Il lavoro principale, quasi full time. Costruisco prodotto end-to-end: dall'idea al rilascio.",
    },
    {
      id: "voxera",
      archetype: "corte",
      title: "VoxeraOS",
      tag: "Side project",
      role: "Founder",
      status: "active",
      weight: 4,
      url: "https://voxeraos.com",
      since: "2025-06",
      stack: ["Next.js", "TypeScript", "AI SDK", "DynamoDB", "Pinecone", "AWS CDK"],
      github: null,
      inside: {
        commits: 1543,
        milestones: [
          { date: "2025-06", title: "Primo commit" },
          { date: "2026-02", title: "Trascrizione di audio e video" },
          { date: "2026-07", title: "Libreria pubblica dei corsi" },
          { date: "2026-10", title: "Beta privata" },
        ],
        arch: [
          { name: "Client", items: ["Next.js PWA", "Editor Lexical"] },
          { name: "AI", items: ["AI SDK", "OpenAI", "Langfuse"] },
          { name: "API", items: ["AWS Lambda", "Firebase Auth"] },
          { name: "Dati", items: ["DynamoDB", "S3", "Pinecone"] },
        ],
      },
      text: "Il side project più grande. Carichi PDF e appunti e l'AI ti interroga come all'esame orale, con quiz adattivi e flashcard. In beta privata.",
    },
    {
      id: "gestio",
      archetype: "terrazze",
      title: "Gestio",
      tag: "Side project",
      role: "Founder",
      status: "building",
      weight: 3,
      since: "2025-12",
      stack: ["Next.js", "TypeScript", "Postgres", "Drizzle", "Better Auth", "Turborepo"],
      github: null,
      inside: {
        commits: 155,
        milestones: [
          { date: "2025-12", title: "Primo commit" },
          { date: "2026-10", title: "In costruzione: agenda e fatturazione" },
        ],
        arch: [
          { name: "Client", items: ["Next.js", "TanStack Query", "Radix UI"] },
          { name: "API", items: ["Next.js server", "Better Auth"] },
          { name: "Dati", items: ["Postgres", "Drizzle", "S3"] },
          { name: "Infra", items: ["Vercel", "Turborepo"] },
        ],
      },
      text: "Gestionale per strutture mediche: agenda, fatturazione, refertazione e anagrafiche. Nasce dal CRM che ho scritto a 17 anni.",
    },
    {
      id: "smalltalk",
      archetype: "startup",
      title: "SmallTalk",
      tag: "Side project",
      role: "Founder",
      status: "active",
      weight: 2,
      since: "2026-10",
      stack: ["Next.js", "TypeScript", "Neon Postgres", "Drizzle", "grammY", "Claude API", "MCP"],
      github: null,
      inside: {
        commits: 151,
        milestones: [
          { date: "2026-10", title: "Primo commit" },
          { date: "2026-10", title: "Bot Telegram e server MCP" },
        ],
        arch: [
          { name: "Client", items: ["Dashboard Next.js", "Bot Telegram"] },
          { name: "AI", items: ["Claude API", "Server MCP"] },
          { name: "Dati", items: ["Neon Postgres", "Drizzle", "S3"] },
          { name: "Infra", items: ["QStash", "PostHog"] },
        ],
      },
      text: "Piattaforma per istruttori di inglese: studenti, classi, task giornalieri su Telegram e analisi delle lezioni su Google Meet.",
    },
  ] satisfies Project[] as Project[],
  freeLots: [
    { id: "lotto-a", title: "Lotto libero", text: "Spazio pronto per il prossimo progetto. Hai un prodotto da costruire? Parliamone." },
    { id: "lotto-b", title: "Lotto libero", text: "Un altro terreno disponibile vicino al viale. La città è fatta per crescere." },
  ] satisfies FreeLot[] as FreeLot[],
};

export const getProject = (id: string) => DATA.projects.find((p) => p.id === id);
