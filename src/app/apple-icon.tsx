import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #059669 0%, #0f766e 100%)",
          color: "#ecfdf5",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "Arial, Helvetica, sans-serif",
          borderRadius: 40,
        }}
      >
        K
      </div>
    ),
    { ...size },
  );
}
