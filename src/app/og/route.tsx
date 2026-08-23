import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ASPC RTS Tool";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#0a0a0c",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "56px",
              backgroundColor: "#ef4444",
              borderRadius: "4px",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#fafafa",
                letterSpacing: "6px",
              }}
            >
              ASPC RTS TOOL
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: 28,
                color: "#a1a1aa",
                letterSpacing: "2px",
              }}
            >
              Build Browser · Brochure Specs · Live Pricing
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
