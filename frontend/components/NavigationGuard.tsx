"use client";

import { useEffect } from "react";

export default function NavigationGuard() {
  useEffect(() => {
    const handlePopState = () => {
      document.documentElement.classList.add("no-vt");
      // Remove after the transition window has passed
      setTimeout(() => document.documentElement.classList.remove("no-vt"), 100);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return null;
}
