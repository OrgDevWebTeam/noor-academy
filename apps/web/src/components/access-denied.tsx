import { EmptyState, buttonClasses } from "@noor/ui";
import { Link } from "react-router";
import { useI18n } from "@/i18n/locale-data";

/**
 * X06 — "no permission" (403). Shows a general message that reveals nothing about the page or
 * its data. Not used yet: area pages show it once the API can answer a permission check
 * (ADR-0006).
 */
export function AccessDenied() {
  const { dict, locale } = useI18n();

  return (
    <EmptyState
      headingLevel={1}
      title={dict.accessDenied.title}
      description={dict.accessDenied.body}
      action={
        <Link to={`/${locale}`} className={buttonClasses("secondary")}>
          {dict.accessDenied.home}
        </Link>
      }
    />
  );
}
