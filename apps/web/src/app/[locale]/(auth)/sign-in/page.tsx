import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.screens.signIn };
}

// G06 — sign-in. May become the identity provider's hosted page (OD-03).
export default async function SignInPage() {
  const dict = await getDictionary();
  return <ScreenPlaceholder screenId="G06" title={dict.screens.signIn} note={dict.placeholder} />;
}
