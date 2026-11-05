import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { applyLocale } from "@/i18n/config";
import { localeInPath } from "@/i18n/paths";
import { preferredLocale } from "@/i18n/preferred-locale";
import { registerServiceWorker } from "./register-service-worker";
import { routes } from "./router";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Before the first render, so a right-to-left page never shows a left-to-right frame.
applyLocale(localeInPath(window.location.pathname) ?? preferredLocale());

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createBrowserRouter(routes)} />
  </StrictMode>,
);

registerServiceWorker();
