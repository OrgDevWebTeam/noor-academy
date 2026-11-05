import { type ReactNode, useEffect, useId, useRef } from "react";

export type DialogProps = {
  open: boolean;
  /** Runs when the dialog closes, including on Escape. Set `open` to false here. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

/**
 * Modal dialog built on the native <dialog> element. The browser moves focus inside,
 * makes the page behind it inert, and closes it on Escape, so no focus-trap code is needed.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-control border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div>{children}</div>
        {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  );
}
