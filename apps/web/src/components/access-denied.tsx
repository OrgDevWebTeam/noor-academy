import { EmptyState, buttonClasses } from "@noor/ui";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

/**
 * X06 — "no permission" (403). Shows a general message that reveals nothing about the page or
 * its data. Not used yet: area layouts show it once they have a server-side access check
 * (Architecture 6).
 */
export async function AccessDenied() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <EmptyState
      headingLevel={1}
      title={dict.accessDenied.title}
      description={dict.accessDenied.body}
      action={
        <Link href={`/${locale}`} className={buttonClasses("secondary")}>
          {dict.accessDenied.home}
        </Link>
      }
    />
  );
}
