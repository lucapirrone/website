import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e2024",
        color: "#f6f4ef",
        fontSize: 34,
        fontWeight: 900,
        borderRadius: 14,
      }}
    >
      LP
    </div>,
    size,
  );
}
