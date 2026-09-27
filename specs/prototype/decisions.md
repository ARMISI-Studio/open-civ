# Implementation decisions

Small gaps in [prototype.md](prototype.md), [architecture.md](architecture.md), and [ui.md](ui.md) that were resolved with the simplest option during the prototype build. Each can change once the backend contract or product rules are confirmed.

## Tooling

1. **Mock backend.** There is no backend yet, so [MSW](https://mswjs.io) answers every API request. Handlers and seed data live in `src/mocks/`; the app talks to them only through `src/api/`. The mock worker starts by default in both `pnpm dev` and `pnpm preview`. Set `VITE_API_MOCKS=off` (and `VITE_API_BASE_URL`) to use a real API instead. Build step 5, "replace mocks with real backend calls", cannot be done yet; that step was limited to hardening (loading, empty, and error states, and tests).
2. **Pinia removed.** The scaffold's counter store was unused, and architecture.md says to avoid global state. Composables hold per-view state instead.
3. **Playwright runs Chromium only, headless.** The config previously ran headed outside CI and required Firefox and WebKit to be installed. Mobile coverage uses a phone-sized viewport in the relevant specs. Set `PW_HEADED=1` to watch the browser. The HTML report no longer opens automatically.

## Routing

4. **Not-found page, not a redirect.** Unknown routes show a "Page not found" view with a link back to the Structure Editor.
5. **Detail routes.** `/structures/:structureId` opens a saved structure so it can be bookmarked. `/questions/answer/:shareId` opens a shared question. The `/q/:shareId` short form was not added; the public share route is still to be decided with the backend.
6. **Component preview at `/ui-preview`.** It is registered in all builds so the e2e tests can run against `pnpm preview` on CI, but it is not linked from the main tabs.
