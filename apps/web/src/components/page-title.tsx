import { useI18n } from "@/i18n/locale-data";

/** The browser tab title: the page's own title with the product name, or the product name alone. */
export function PageTitle({ title }: { title?: string }) {
  const { dict } = useI18n();
  // Each page sets its own title (WCAG 2.4.2). React moves this element into <head>.
  return <title>{title ? `${title} · ${dict.meta.title}` : dict.meta.title}</title>;
}
