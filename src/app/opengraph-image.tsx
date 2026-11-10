import { ImageResponse } from "next/og";
import { site } from "@/lib/config";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #111827 0%, #111827 55%, #1e3a8a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: "#14B8A6" }} />
          </div>
          <span>
            Creators<span style={{ color: "#14B8A6" }}>AI</span>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Your next collaboration starts here.</div>
          <div style={{ fontSize: 32, color: "#cbd5e1" }}>Verified creators · Reliable brands · Local communities</div>
        </div>
        <div style={{ fontSize: 26, color: "#14B8A6" }}>{site.tagline}</div>
      </div>
    ),
    size,
  );
}
