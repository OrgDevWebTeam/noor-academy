import { type KeyboardEvent, type ReactNode, useState } from "react";
import { cx } from "./cx";

export type PinKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "back";

export type PinState = {
  digits: string;
  /** The full PIN, set only on the key press that completes it. */
  completed?: string;
};

/** Pure state change for one key press, kept separate so it is easy to test. */
export function pressPinKey(digits: string, key: PinKey, length: number): PinState {
  if (key === "back") return { digits: digits.slice(0, -1) };
  const next = (digits + key).slice(0, length);
  // The entered digits are cleared as soon as the PIN is complete.
  return next.length === length ? { digits: "", completed: next } : { digits: next };
}

export type PinPadLabels = {
  /** Names the whole pad, e.g. "Enter your PIN". */
  pad: string;
  /** Names the delete key, e.g. "Delete last digit". */
  back: string;
  /** Announces progress without revealing digits, e.g. "2 of 4 digits entered". */
  progress: (entered: number, total: number) => string;
};

export type PinPadProps = {
  length?: number;
  labels: PinPadLabels;
  disabled?: boolean;
  /** Receives the complete PIN. Check it on the server; never store it in the browser. */
  onComplete: (pin: string) => void;
};

const KEY_ROWS: PinKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

function PadKey({
  label,
  disabled,
  onPress,
  onKeyDown,
  children,
}: {
  label?: string;
  disabled: boolean;
  onPress: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      onKeyDown={onKeyDown}
      className="flex size-16 items-center justify-center rounded-control border border-control bg-surface text-2xl font-semibold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Number pad for a child's PIN (G08, X05). The layout stays 1-2-3 on top in Arabic and English,
 * because number pads are never mirrored. Digits show as dots, and the typed keyboard works too.
 */
export function PinPad({ length = 4, labels, disabled = false, onComplete }: PinPadProps) {
  const [digits, setDigits] = useState("");

  function press(key: PinKey) {
    if (disabled) return;
    const state = pressPinKey(digits, key, length);
    setDigits(state.digits);
    if (state.completed) onComplete(state.completed);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (/^[0-9]$/.test(event.key)) press(event.key as PinKey);
    else if (event.key === "Backspace") press("back");
  }

  return (
    <div
      role="group"
      aria-label={labels.pad}
      dir="ltr"
      className="inline-flex flex-col items-center gap-4"
    >
      <p aria-live="polite" className="sr-only">
        {labels.progress(digits.length, length)}
      </p>
      <div aria-hidden="true" className="flex gap-3">
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={cx(
              "size-4 rounded-full border-2 border-ink",
              index < digits.length && "bg-ink",
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEY_ROWS.flat().map((key) => (
          <PadKey
            key={key}
            disabled={disabled}
            onPress={() => press(key)}
            onKeyDown={handleKeyDown}
          >
            {key}
          </PadKey>
        ))}
        <span aria-hidden="true" />
        <PadKey disabled={disabled} onPress={() => press("0")} onKeyDown={handleKeyDown}>
          {"0"}
        </PadKey>
        <PadKey
          label={labels.back}
          disabled={disabled}
          onPress={() => press("back")}
          onKeyDown={handleKeyDown}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">
            <path
              d="M9 2h16a1 1 0 011 1v14a1 1 0 01-1 1H9L2 10z M13 6l8 8 M21 6l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </PadKey>
      </div>
    </div>
  );
}
