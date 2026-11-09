/** Ages the prototype serves (CRS: children aged 6 to 14). */
export const MIN_CHILD_AGE = 6;
export const MAX_CHILD_AGE = 14;

/** Same limit as the API. */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** The G08 number pad takes four digits; the API accepts 4 to 6. */
export const CHILD_PIN_LENGTH = 4;

const PIN_PATTERN = new RegExp(`^\\d{${CHILD_PIN_LENGTH}}$`);

export type ChildFormValues = {
  displayName: string;
  birthYear: string;
  pin: string;
  pinConfirm: string;
};

export type ChildFormError = "required" | "tooLong" | "pinFormat" | "pinMismatch";

export type ChildFormErrors = Partial<Record<keyof ChildFormValues, ChildFormError>>;

export const EMPTY_CHILD_FORM: ChildFormValues = {
  displayName: "",
  birthYear: "",
  pin: "",
  pinConfirm: "",
};

/** Birth years a child in the served age range can have, newest first. */
export function birthYearOptions(currentYear: number): number[] {
  const count = MAX_CHILD_AGE - MIN_CHILD_AGE + 1;
  return Array.from({ length: count }, (_, index) => currentYear - MIN_CHILD_AGE - index);
}

/**
 * Checks the O01 form before it is sent. This is for the parent's convenience only; the API
 * validates every field again.
 */
export function validateChildForm(values: ChildFormValues, currentYear: number): ChildFormErrors {
  const errors: ChildFormErrors = {};
  const name = values.displayName.trim();

  if (name === "") errors.displayName = "required";
  else if (name.length > DISPLAY_NAME_MAX_LENGTH) errors.displayName = "tooLong";

  if (!birthYearOptions(currentYear).includes(Number(values.birthYear))) {
    errors.birthYear = "required";
  }

  if (!PIN_PATTERN.test(values.pin)) errors.pin = "pinFormat";
  else if (values.pinConfirm !== values.pin) errors.pinConfirm = "pinMismatch";

  return errors;
}
