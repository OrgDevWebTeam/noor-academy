export type ButtonVariant = "primary" | "secondary";

const base =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-ink hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-muted",
};

/** Class string for anything that should look like a button, such as a router <Link>. */
export function buttonClasses(variant: ButtonVariant = "primary"): string {
  return `${base} ${variants[variant]}`;
}
