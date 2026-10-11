"use client";

import { useContext } from "react";
import { NavbarContext } from "./NavbarContext";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const context = useContext(NavbarContext);
  const isCollapsed = context?.isCollapsed ?? false;

  return (
    <main style={{
      paddingTop: isCollapsed ? "32px" : "64px",
      minHeight: "100vh",
      transition: "padding-top 0.3s ease",
    }}>
      {children}
    </main>
  );
}
