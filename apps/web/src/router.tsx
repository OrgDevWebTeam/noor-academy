import { redirect, type RouteObject } from "react-router";
import { AreaShell } from "@/components/area-shell";
import { LocaleLayout } from "@/components/locale-layout";
import { LOCALE_ROUTE_ID, loadLocale } from "@/i18n/locale-data";
import { preferredLocale } from "@/i18n/preferred-locale";
import { areaRedirect, type Area } from "@/lib/session/area-access";
import { getSession } from "@/lib/session/session-store";
import { ErrorPage } from "@/pages/error-page";
import { GlobalErrorPage } from "@/pages/global-error-page";
import { LoadingPage } from "@/pages/loading-page";
import { NotFoundPage } from "@/pages/not-found-page";

const area = (name: Area, children: RouteObject[]): RouteObject => ({
  element: <AreaShell area={name} />,
  // Runs before any page of the area loads, so a visitor without the right session never sees it.
  loader: ({ params }) => {
    const target = areaRedirect(name, getSession());
    if (target === "landing") return redirect(`/${params.locale}`);
    return target ? redirect(`/${params.locale}/${target}`) : null;
  },
  children,
});

// Development-only pages: design review, and a test parent session until real sign-in exists.
// Production bundles do not contain them.
const DEV_ROUTES: RouteObject[] = import.meta.env.DEV
  ? [
      { path: "dev/ui", lazy: () => import("@/pages/dev/ui-page") },
      { path: "dev/rtl", lazy: () => import("@/pages/dev/rtl-page") },
      { path: "dev/session", lazy: () => import("@/pages/dev/session-page") },
    ]
  : [];

// `lazy` loads a screen's module when it is first opened and uses its `Component` export, so a
// visit downloads only what it shows. Screen IDs (G01, C01...) come from the UI Screens Spec.
export const routes: RouteObject[] = [
  {
    errorElement: <GlobalErrorPage />,
    HydrateFallback: LoadingPage,
    children: [
      // The loader always redirects; the router still expects a leaf route to have a component.
      { index: true, loader: () => redirect(`/${preferredLocale()}`), Component: LoadingPage },
      {
        id: LOCALE_ROUTE_ID,
        path: ":locale",
        loader: loadLocale,
        Component: LocaleLayout,
        children: [
          {
            errorElement: <ErrorPage />,
            children: [
              { index: true, lazy: () => import("@/pages/landing-page") },
              { path: "maintenance", lazy: () => import("@/pages/maintenance-page") },

              // G08 and O01: profile picker and adding a child. Private. The other onboarding steps
              // (O02–O04) come once their APIs exist.
              area("family", [
                { path: "profiles", lazy: () => import("@/pages/profiles-page") },
                { path: "onboarding/child", lazy: () => import("@/pages/add-child-page") },
              ]),

              // C01–C10: child area. Private.
              // No third-party scripts, trackers or session replay in this area (SEC-009, SEC-011).
              area("child", [{ path: "today", lazy: () => import("@/pages/today-page") }]),

              // Sign-in (G03–G07), parent (P01–P09), teacher (T01–T05) and staff (A01–A10) areas
              // are added with their tasks.

              ...DEV_ROUTES,
              { path: "*", Component: NotFoundPage },
            ],
          },
        ],
      },
    ],
  },
];
