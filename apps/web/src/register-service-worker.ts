/** Registers /sw.js in production builds only, so development never serves stale files. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
    // The site works without it; installing as an app is optional.
    console.warn("Service worker registration failed", error);
  });
}
