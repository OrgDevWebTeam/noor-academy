import { EmptyState, buttonClasses } from "@noor/ui";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/i18n-provider";

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
