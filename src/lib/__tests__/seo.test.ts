import { describe, expect, it } from "vitest";
import { DATA } from "@/content/site";
import { homeJsonLd, jsonLd, projectDescription, projectJsonLd, projectMetadata, SITE_URL } from "../seo";

describe("seo", () => {
  it("home graph has Person, WebSite and every project", () => {
    const g = homeJsonLd()["@graph"] as { "@type": string; itemListElement?: unknown[] }[];
    expect(g.map((n) => n["@type"])).toEqual(["Person", "WebSite", "ItemList"]);
    expect(g[2].itemListElement).toHaveLength(DATA.projects.length);
  });
  it.each(DATA.projects)("$id metadata: canonical, bounded description", (p) => {
    const m = projectMetadata(p);
    expect(m.alternates?.canonical).toBe(`/progetti/${p.id}`);
    expect(projectDescription(p).length).toBeLessThanOrEqual(300);
    expect(String(m.title)).toContain(p.title);
  });
  it("project JSON-LD links back to the person", () => {
    const g = projectJsonLd(DATA.projects[0])["@graph"] as { creator?: { "@id": string } }[];
    expect(g[0].creator?.["@id"]).toBe(`${SITE_URL}/#person`);
  });
  it("escapes < in inline JSON", () => expect(jsonLd({ a: "</script>" })).not.toContain("</script>"));
});
