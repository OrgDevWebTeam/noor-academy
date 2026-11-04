import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.screens.parentHome };
}

// P01 — parent home (FR-PAR-001).
export default async function ParentHomePage() {
  const dict = await getDictionary();
  return (
    <ScreenPlaceholder screenId="P01" title={dict.screens.parentHome} note={dict.placeholder} />
  );
}
