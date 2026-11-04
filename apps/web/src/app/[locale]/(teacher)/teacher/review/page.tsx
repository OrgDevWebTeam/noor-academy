import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.screens.reviewQueue };
}

// T02 — review queue. Teachers land here after sign-in (G06).
export default async function ReviewQueuePage() {
  const dict = await getDictionary();
  return (
    <ScreenPlaceholder screenId="T02" title={dict.screens.reviewQueue} note={dict.placeholder} />
  );
}
