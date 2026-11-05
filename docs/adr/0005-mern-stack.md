# ADR-0005: MERN stack

- Status: Accepted (team decision)
- Supersedes: Architecture v1.0 choices of NestJS (API) and Next.js (web).
- Decision: MongoDB (ADR-0003), Express API in TypeScript on Node 22, React single-page app built
  with Vite.
- Consequences:
  - **No server-side rendering.** The app sits behind login and does not need SEO. Public marketing
    pages, if any, are a separate concern.
  - **Frontend is static files** (`vite build`) served from CDN/object storage or a small container.
    The API is a separate service. Cross-origin calls use the CORS allow-list; locally the Vite dev
    server proxies `/v1` to the API.
  - **Browser variables use the `VITE_` prefix** (replacing `NEXT_PUBLIC_`). Never put secrets in them.
  - **Express is unopinionated**, so structure is enforced by convention (see ADR-0002) and by tests,
    notably the family-isolation repository rule.
  - **Libraries to add for the web shell** (team to confirm): react-router (locale routing),
    i18next / react-i18next (translations), vite-plugin-pwa (manifest, service worker, offline page).
  - **Decorator-free code**, so unit and HTTP tests run directly in Vitest.
  - **Architecture document amendments needed:** stack section, ADRs naming NestJS/Next.js,
    deployment diagram (web becomes static hosting), and the PWA/i18n implementation notes.
