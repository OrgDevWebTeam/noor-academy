import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.screens.profiles };
}

// G08 — profile picker and child PIN. Parents land here after sign-in.
export default async function ProfilesPage() {
  const dict = await getDictionary();
  return <ScreenPlaceholder screenId="G08" title={dict.screens.profiles} note={dict.placeholder} />;
}
