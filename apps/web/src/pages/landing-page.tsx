import { PageTitle } from "@/components/page-title";
import { useI18n } from "@/i18n/locale-data";

// G01 — public landing page (placeholder until the design is ready).
export function Component() {
  const { dict } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <PageTitle />
      <h1 className="text-3xl font-semibold">{dict.landing.title}</h1>
      <p className="text-lg text-ink-muted">{dict.landing.subtitle}</p>
    </main>
  );
}
