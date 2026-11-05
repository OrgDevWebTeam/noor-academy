import { EmptyState, buttonClasses } from "@noor/ui";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";
import { OfflineBanner } from "@/components/offline-banner";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { SiteHeader } from "@/components/site-header";
import { LocaleLayout, RootRedirect, useI18n } from "@/i18n/i18n-provider";

/** Chrome shared by every localized page: offline notice, header, page content. */
function Shell() {
  const { locale } = useI18n();
  return (
    <>
      <OfflineBanner locale={locale} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </>
  );
}

function HomePage() {
  const { dict } = useI18n();
  // Swap the note for a dictionary key once the real home screen is designed.
  return <ScreenPlaceholder screenId="C01" title={dict.meta.title} note="Coming soon" />;
}

function NotFoundPage() {
  const { locale } = useI18n();
  // Move these strings into en.json / ar.json (e.g. a `notFound` block) as soon as you can.
  return (
    <EmptyState
      headingLevel={1}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to={`/${locale}`} className={buttonClasses("secondary")}>
          Home
        </Link>
      }
    />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path=":locale" element={<LocaleLayout />}>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            {/* Add real screens here, e.g. <Route path="lessons" element={<LessonsPage />} /> */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
