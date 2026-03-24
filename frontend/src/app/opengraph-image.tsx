import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pixora — Private Event Photo Sharing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0b0b0b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 420,
            borderRadius: "50%",
            background: "rgba(0,212,255,0.12)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: 100,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(176,38,255,0.10)",
            filter: "blur(70px)",
          }}
        />

        {/* Camera icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "rgba(0,212,255,0.12)",
            border: "1.5px solid rgba(0,212,255,0.30)",
            marginBottom: 28,
          }}
        >
          {/* Simple camera SVG inline */}
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00D4FF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "-2px",
            background: "linear-gradient(135deg, #00D4FF 0%, #B026FF 100%)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 20,
            lineHeight: 1,
          }}
        >
          Pixora
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.55)",
            fontWeight: 400,
            letterSpacing: "-0.3px",
            textAlign: "center",
            maxWidth: 580,
            lineHeight: 1.4,
          }}
        >
          Private event photo sharing — only with the people who were there.
        </div>

        {/* Bottom pill */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 999,
            border: "1px solid rgba(0,212,255,0.25)",
            background: "rgba(0,212,255,0.07)",
            color: "#00D4FF",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#00D4FF",
            }}
          />
          pixora.app
        </div>
      </div>
    ),
    { ...size }
  );
}
