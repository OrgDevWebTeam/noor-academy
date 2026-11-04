"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only, so development never serves stale files. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      // The site works without it; installing as an app is optional.
      console.warn("Service worker registration failed", error);
    });
  }, []);

  return null;
}
