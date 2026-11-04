"use client";

import { Button, Dialog, PinPad } from "@noor/ui";
import { useState } from "react";

type DialogDemoLabels = {
  open: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
};

export function DialogDemo({ labels }: { labels: DialogDemoLabels }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {labels.open}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={labels.title}
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button onClick={() => setOpen(false)}>{labels.confirm}</Button>
          </>
        }
      >
        {labels.body}
      </Dialog>
    </>
  );
}

type PinPadDemoLabels = {
  pad: string;
  back: string;
  /** "{entered}" and "{total}" are replaced with numbers. */
  progress: string;
  done: string;
};

export function PinPadDemo({ labels }: { labels: PinPadDemoLabels }) {
  const [entered, setEntered] = useState(false);

  return (
    <div className="flex flex-col items-start gap-3">
      <PinPad
        labels={{
          pad: labels.pad,
          back: labels.back,
          progress: (count, total) =>
            labels.progress.replace("{entered}", String(count)).replace("{total}", String(total)),
        }}
        // The demo never shows the PIN; a real screen sends it to the server to check.
        onComplete={() => setEntered(true)}
      />
      {entered && <p role="status">{labels.done}</p>}
    </div>
  );
}
