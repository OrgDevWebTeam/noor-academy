import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.screens.today };
}

// C01 — Today's journey (FR-JRN-002). The active child comes from the session, never the URL.
export default async function TodayPage() {
  const dict = await getDictionary();
  return <ScreenPlaceholder screenId="C01" title={dict.screens.today} note={dict.placeholder} />;
}
