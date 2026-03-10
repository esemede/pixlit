import type { ReactNode } from "react";

interface ToolLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function ToolLayout({ title, description, children }: ToolLayoutProps) {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
      {/* Ad slot top */}
      <div className="ad-slot" style={{ height: "90px", marginBottom: "32px" }}>
        📢 AD SLOT — 728×90 Leaderboard
      </div>

      <h1
        style={{
          fontSize: "32px",
          fontWeight: 800,
          marginBottom: "8px",
          color: "white",
        }}
      >
        {title}
      </h1>
      <p style={{ color: "#aaa", marginBottom: "36px", fontSize: "16px", lineHeight: "1.6" }}>
        {description}
      </p>

      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        {children}
      </div>

      {/* Ad slot bottom */}
      <div className="ad-slot" style={{ height: "250px", marginTop: "32px" }}>
        📢 AD SLOT — 300×250 Rectangle
      </div>
    </div>
  );
}
