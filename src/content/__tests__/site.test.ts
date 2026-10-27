import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { DATA } from "../site";
import { BRAND } from "../brand";

describe("content", () => {
  it("project ids are unique slugs", () => {
    const ids = DATA.projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
  });
  it.each(DATA.projects)("$id has dates, stack, interior, logos and brand", (p) => {
    expect(p.since).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(p.stack.length).toBeGreaterThan(0);
    p.inside.milestones.forEach((m) => expect(m.date).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/));
    expect(existsSync(`public/logos/${p.id}-roof.png`)).toBe(true);
    expect(existsSync(`public/logos/${p.id}-front.png`)).toBe(true);
    expect(BRAND[p.id]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
