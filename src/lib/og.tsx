import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/* immagine social nello stile del cartello di cantiere */
export function ogCard({
  eyebrow,
  title,
  text,
  accent = "#d99a1e",
  rows = [],
}: {
  eyebrow: string;
  title: string;
  text: string;
  accent?: string;
  rows?: [string, string][];
}) {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f6f4ef", color: "#1e2024", fontFamily: "sans-serif" }}>
      <div style={{ height: 70, background: accent, display: "flex", alignItems: "center", padding: "0 60px", color: "#fff", fontSize: 26, letterSpacing: 4 }}>
        {eyebrow.toUpperCase()}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "50px 60px", gap: 20 }}>
        <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase", letterSpacing: -2 }}>{title}</div>
        <div style={{ fontSize: 32, lineHeight: 1.35, color: "#3a3d42", maxWidth: 1000 }}>{text}</div>
        <div style={{ display: "flex", gap: 40, marginTop: "auto" }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 20, color: "#646a72", letterSpacing: 3 }}>{k.toUpperCase()}</span>
              <span style={{ fontSize: 30, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
