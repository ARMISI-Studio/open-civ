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

## Shared UI layer

7. **reka-ui is the headless select primitive.** Its Select provides the combobox/listbox roles, keyboard navigation, typeahead, teleport, and collision-aware positioning. It is imported only inside `UiSelect.vue`. Two of its defaults were changed to meet architecture.md:
   - Tab and Shift+Tab close the panel and move focus to the next or previous control. reka blocks Tab by default.
   - An outside click closes the panel and leaves focus on whatever was clicked. By default reka swallows the click and moves focus back to the trigger.
8. **reka-ui hides the rest of the page from assistive technology while a select is open.** It sets `aria-hidden` on everything except the panel (the standard Radix modal-listbox pattern), and this cannot be turned off. Mouse clicks outside the panel still work.
9. **Empty and unknown select values.** With no options, the trigger is disabled and reads "No options available". A value that matches no option shows "Unavailable option (value)" with the error border. The first option is never selected automatically.
10. **`UiTextarea` added as an atom.** Question prompts and explanations need multi-line text. It has the same contract as `UiInput`.
11. **`UiButton` sizes.** `small` reduces padding and font size but keeps the 44px minimum height from ui.md.
12. **Theme import UI lives in `/ui-preview`.** It accepts theme JSON exported from the playground, keeps the last valid theme when an import is invalid, and saves only the theme preference in `localStorage`. The playground's storage key is reused, so a theme saved in the playground carries over to the app.
