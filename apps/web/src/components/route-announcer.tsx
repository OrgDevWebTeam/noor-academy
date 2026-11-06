import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Tells screen readers that a new page opened. In a single-page app the browser does not load a
 * new document, so without this they announce nothing after a navigation (WCAG 4.1.3).
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname === previousPathname.current) return;
    previousPathname.current = pathname;
    setMessage(document.title);
  }, [pathname]);

  return (
    <p role="status" aria-live="assertive" className="sr-only">
      {message}
    </p>
  );
}
