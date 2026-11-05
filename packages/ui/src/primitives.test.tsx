import { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertBanner, Button, Dialog, PinPad, SelectField, StatusBadge, TextField } from "./index";

const html = (element: ReactElement) => renderToStaticMarkup(element);

describe("Button", () => {
  it("is a plain button by default, so it never submits a form by accident", () => {
    expect(html(<Button>Save</Button>)).toContain('type="button"');
  });

  it("blocks clicks and announces busy while loading", () => {
    const markup = html(<Button loading>Save</Button>);
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
  });
});

describe("TextField", () => {
  const markup = html(
    <TextField id="email" label="Email" hint="We never share it" error="Required" />,
  );

  it("links the label, hint and error to the input", () => {
    expect(markup).toContain('for="email"');
    expect(markup).toContain('aria-describedby="email-hint email-error"');
    expect(markup).toContain('id="email-error"');
  });

  it("marks the input invalid when there is an error", () => {
    expect(markup).toContain('aria-invalid="true"');
  });

  it("reads typed text in either direction by default", () => {
    expect(markup).toContain('dir="auto"');
  });
});

describe("SelectField", () => {
  it("renders every option", () => {
    const markup = html(
      <SelectField
        id="age"
        label="Age"
        options={[
          { value: "6", label: "6" },
          { value: "7", label: "7" },
        ]}
      />,
    );
    expect(markup.match(/<option/g)).toHaveLength(2);
  });
});

describe("StatusBadge", () => {
  it("shows an icon next to the text, so meaning does not rely on colour", () => {
    const markup = html(<StatusBadge tone="success">Reviewed</StatusBadge>);
    expect(markup).toContain("<svg");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("Reviewed");
  });
});

describe("AlertBanner", () => {
  it("interrupts screen readers only for warnings and errors", () => {
    expect(html(<AlertBanner tone="danger">Offline</AlertBanner>)).toContain('role="alert"');
    expect(html(<AlertBanner tone="info">Saved</AlertBanner>)).toContain('role="status"');
  });
});

describe("Dialog", () => {
  it("is labelled by its own title", () => {
    const markup = html(
      <Dialog open={false} onClose={() => {}} title="Leave child mode?">
        Body
      </Dialog>,
    );
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
    expect(labelledBy).toBeTruthy();
    expect(markup).toContain(`id="${labelledBy}"`);
  });
});

describe("PinPad", () => {
  const markup = html(
    <PinPad
      labels={{ pad: "Enter PIN", back: "Delete", progress: (n, total) => `${n} of ${total}` }}
      onComplete={() => {}}
    />,
  );

  it("keeps the phone layout in both directions", () => {
    expect(markup).toContain('dir="ltr"');
    const keys = [...markup.matchAll(/<button[^>]*>([0-9])<\/button>/g)].map((m) => m[1]);
    expect(keys).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
  });

  it("names the pad and the delete key for screen readers", () => {
    expect(markup).toContain('aria-label="Enter PIN"');
    expect(markup).toContain('aria-label="Delete"');
  });
});
