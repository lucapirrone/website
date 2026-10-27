import { describe, expect, it } from "vitest";
import { fmtMonth, fmtNum, ghText, sinceText } from "../format";

describe("sinceText", () => {
  const now = new Date(2026, 9, 26);
  it("formats month and year", () => expect(sinceText({ since: "2021-09" }, now).date).toBe("Settembre 2021"));
  it("counts years", () => expect(sinceText({ since: "2021-09" }, now).ago).toBe("da 5 anni"));
  it("singular year", () => expect(sinceText({ since: "2025-06" }, now).ago).toBe("da 1 anno"));
  it("counts months", () => expect(sinceText({ since: "2025-12" }, now).ago).toBe("da 10 mesi"));
  it("current month", () => expect(sinceText({ since: "2026-10" }, now).ago).toBe("da questo mese"));
});

describe("format helpers", () => {
  it("groups thousands with dots", () => expect(fmtNum(5682)).toBe("5.682"));
  it("private repo label", () => expect(ghText({ github: null })).toBe("Repository privato"));
  it("strips protocol", () => expect(ghText({ github: "https://github.com/a/b" })).toBe("github.com/a/b"));
  it("month name", () => expect(fmtMonth("2026-02")).toBe("febbraio 2026"));
});
