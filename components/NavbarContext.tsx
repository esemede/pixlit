"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface NavbarContextType {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

export const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pixlit-navbar-collapsed");
    setIsCollapsed(saved === "true");
    setMounted(true);
  }, []);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("pixlit-navbar-collapsed", String(newState));
  };

  if (!mounted) return children;

  return (
    <NavbarContext.Provider value={{ isCollapsed, toggleCollapsed }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (!context) throw new Error("useNavbar debe usarse dentro de NavbarProvider");
  return context;
}

export function useNavbarHeight() {
  try {
    const { isCollapsed } = useNavbar();
    return isCollapsed ? 32 : 64;
  } catch {
    return 64; // Default value during SSR
  }
}
