import { TextField } from "@noor/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";
import { formatDate, formatNumber, plural, type PluralForms } from "@/i18n/format";
import { getLocale } from "@/i18n/get-dictionary";

export const metadata: Metadata = { title: "RTL check", robots: { index: false } };

// Sample text for checking direction only; real screens take their text from the dictionaries.
const SAMPLES: Record<
  "ar" | "en",
  {
    title: string;
    mixed: string;
    name: string;
    mixedEnd: string;
    startEdge: string;
    next: string;
    play: string;
    typeHere: string;
    missions: PluralForms;
  }
> = {
  ar: {
    title: "فحص الاتجاه",
    mixed: "أكمل",
    name: "Adam Smith",
    mixedEnd: "مهمة اليوم بنجاح.",
    startEdge: "هذا الخط على بداية السطر: يمين بالعربي.",
    next: "التالي (السهم ينقلب)",
    play: "تشغيل (لا ينقلب)",
    typeHere: "اكتب بالعربي أو بالإنجليزي",
    missions: {
      zero: "لا مهمات",
      one: "مهمة واحدة",
      two: "مهمتان",
      few: "{count} مهمات",
      many: "{count} مهمة",
      other: "{count} مهمة",
    },
  },
  en: {
    title: "Direction check",
    mixed: "",
    name: "آدم",
    mixedEnd: "finished today's mission.",
    startEdge: "This line is on the start edge: left in English.",
    next: "Next (the arrow flips)",
    play: "Play (never flips)",
    typeHere: "Type in Arabic or English",
    missions: { one: "{count} mission", other: "{count} missions" },
  },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-line pb-2 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// Developer page for checking Arabic and English layout. Returns 404 in production builds.
export default async function RtlCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const locale = await getLocale();
  const s = SAMPLES[locale];
  const date = new Date(Date.UTC(2026, 10, 4));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">{s.title}</h1>

      <Section title="Mixed text · <bdi>">
        <p>
          {s.mixed} <bdi>{s.name}</bdi> {s.mixedEnd}
        </p>
      </Section>

      <Section title="Numbers · dates · plurals (Intl)">
        <ul className="flex flex-col gap-1">
          <li>{formatNumber(locale, 1234567.89)}</li>
          <li>{formatDate(locale, date, { dateStyle: "full", timeZone: "UTC" })}</li>
          {[0, 1, 2, 3, 11, 100].map((count) => (
            <li key={count}>{plural(locale, count, s.missions)}</li>
          ))}
        </ul>
      </Section>

      <Section title="Logical spacing · mirroring">
        <p className="border-s-4 border-primary ps-4">{s.startEdge}</p>
        <p className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="rtl:-scale-x-100"
          >
            <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {s.next}
        </p>
        <p className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 4l10 6-10 6z" fill="currentColor" />
          </svg>
          {s.play}
        </p>
      </Section>

      <Section title="Typing · dir=auto">
        <TextField id="rtl-free-text" label={s.typeHere} />
      </Section>
    </main>
  );
}
