import type { Locale } from "./config";

/**
 * Digits shown in the Arabic UI: Latin (0-9) for now. Use "arab" for Arabic-Indic digits (٠-٩).
 * Open decision for the design team; changing this one value changes every number and date.
 */
export const ARABIC_NUMBERING: "latn" | "arab" = "latn";

function intlLocale(locale: Locale): string {
  return locale === "ar" ? `ar-u-nu-${ARABIC_NUMBERING}` : locale;
}

/** A number in the conventions of the page language. */
export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

/** A date in the conventions of the page language. */
export function formatDate(
  locale: Locale,
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
}

/** Fills `{name}` slots in dictionary text with numbers in the page language, e.g. "{done} of {total}". */
export function formatTemplate(
  locale: Locale,
  text: string,
  values: Record<string, number>,
): string {
  return text.replace(/\{(\w+)\}/g, (slot, name: string) => {
    const value = values[name];
    return value === undefined ? slot : formatNumber(locale, value);
  });
}

/** Text for each CLDR plural category. Arabic uses all six; English uses "one" and "other". */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Picks the right plural form for `count`; `{count}` in the text becomes the formatted number. */
export function plural(locale: Locale, count: number, forms: PluralForms): string {
  const category = new Intl.PluralRules(locale).select(count);
  const text = forms[category] ?? forms.other;
  return text.replace("{count}", formatNumber(locale, count));
}
