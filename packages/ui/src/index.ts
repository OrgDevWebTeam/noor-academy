// Bilingual, RTL-aware UI primitives. Tokens live in ./styles.css (import "@noor/ui/styles.css").
// Rule: logical CSS only (ms-/ps-/text-start), so every primitive works in LTR and RTL.

export { AlertBanner, type AlertBannerProps, type BannerTone } from "./alert-banner";
export {
  Button,
  buttonClasses,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "./button";
export { Card, type CardProps } from "./card";
export { Dialog, type DialogProps } from "./dialog";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export {
  SelectField,
  TextField,
  type SelectFieldProps,
  type SelectOption,
  type TextFieldProps,
} from "./field";
export {
  PinPad,
  pressPinKey,
  type PinKey,
  type PinPadLabels,
  type PinPadProps,
  type PinState,
} from "./pin-pad";
export { Skeleton, SkeletonText } from "./skeleton";
export { StatusBadge, type StatusBadgeProps, type StatusTone } from "./status-badge";
