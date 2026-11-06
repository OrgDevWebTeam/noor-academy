import { redirect, type RouteObject } from "react-router";
import { AreaShell, type Area } from "@/components/area-shell";
import { LocaleLayout } from "@/components/locale-layout";
import { LOCALE_ROUTE_ID, loadLocale } from "@/i18n/locale-data";
import { preferredLocale } from "@/i18n/preferred-locale";
import { ErrorPage } from "@/pages/error-page";
import { GlobalErrorPage } from "@/pages/global-error-page";
import { LoadingPage } from "@/pages/loading-page";
import { NotFoundPage } from "@/pages/not-found-page";

const area = (name: Area, children: RouteObject[]): RouteObject => ({
  element: <AreaShell area={name} />,
  children,
});

// Development-only pages for design review. Production bundles do not contain them.
const DEV_ROUTES: RouteObject[] = import.meta.env.DEV
  ? [
      { path: "dev/ui", lazy: () => import("@/pages/dev/ui-page") },
      { path: "dev/rtl", lazy: () => import("@/pages/dev/rtl-page") },
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

              // G03–G07: sign-up, sign-in and recovery. Public, but no child data is shown here.
              area("auth", [{ path: "sign-in", lazy: () => import("@/pages/sign-in-page") }]),

              // G08 and O01–O04: profile picker and onboarding. Private.
              area("family", [{ path: "profiles", lazy: () => import("@/pages/profiles-page") }]),

              // C01–C10: child area. Private.
              // No third-party scripts, trackers or session replay in this area (SEC-009, SEC-011).
              area("child", [{ path: "today", lazy: () => import("@/pages/today-page") }]),

              // P01–P09: parent area. Private.
              area("parent", [{ path: "parent", lazy: () => import("@/pages/parent-home-page") }]),

              // T01–T05: teacher area. Private, and limited to assigned children.
              area("teacher", [
                { path: "teacher/review", lazy: () => import("@/pages/review-queue-page") },
              ]),

              // A01–A10: staff area. Private, by role.
              area("admin", [
                { path: "admin/content", lazy: () => import("@/pages/content-admin-page") },
              ]),

              ...DEV_ROUTES,
              { path: "*", Component: NotFoundPage },
            ],
          },
        ],
      },
    ],
  },
];
