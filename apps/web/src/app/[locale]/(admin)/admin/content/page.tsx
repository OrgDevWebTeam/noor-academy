import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.screens.contentAdmin };
}

// A01 — content management (FR-CMS-001). Content admins land here after sign-in (G06).
export default async function ContentAdminPage() {
  const dict = await getDictionary();
  return (
    <ScreenPlaceholder screenId="A01" title={dict.screens.contentAdmin} note={dict.placeholder} />
  );
}
