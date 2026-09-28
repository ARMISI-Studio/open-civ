# Implementation decisions

Small gaps in [prototype.md](prototype.md), [architecture.md](architecture.md), and [ui.md](ui.md) that were resolved with the simplest option during the prototype build. Each can change once the backend contract or product rules are confirmed.

## Tooling

1. **Mock backend.** There is no backend yet, so [MSW](https://mswjs.io) answers every API request. Handlers and seed data live in `src/mocks/`; the app talks to them only through `src/api/`. The mock worker starts by default in both `pnpm dev` and `pnpm preview`. Set `VITE_API_MOCKS=off` (and `VITE_API_BASE_URL`) to use a real API instead. Build step 5, "replace mocks with real backend calls", cannot be done yet; that step was limited to hardening (loading, empty, and error states, and tests).
2. **Pinia removed.** The scaffold's counter store was unused, and architecture.md says to avoid global state. Composables hold per-view state instead.
3. **Playwright runs Chromium only, headless.** The config previously ran headed outside CI and required Firefox and WebKit to be installed. Mobile coverage uses a phone-sized viewport in the relevant specs. Set `PW_HEADED=1` to watch the browser. The HTML report no longer opens automatically.

## Routing

4. **Not-found page, not a redirect.** Unknown routes show a "Page not found" view with a link back to Structures.
5. **Detail routes.** Superseded by 36.
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

## API contract (mocked)

13. **Base URL and error format.** The base URL is `VITE_API_BASE_URL`, defaulting to `/api`. Every non-2xx response has the body `{ "error": { "code", "message", "fields"? } }`. Validation failures return 422 with code `validation_failed` and a message for each field. All endpoints and DTOs are listed in `src/api/types.ts`, which is the one file to update when the backend contract is confirmed.
14. **No authentication.** Neither spec requires it, so the app has no auth headers, route guards, or user identity.
15. **Mock persistence.** The MSW mock backend saves its data in `localStorage` (`open-civ-mock-db-v1`) so reloads and share links keep working. It seeds two structures: a simply supported beam and a cantilever. Responses are delayed by 300 ms in the browser so loading states are visible; in unit tests there is no delay.
16. **Element ids.** Ids inside a structure (`n1`, `m1`, `s1`, `l1`) are created in the frontend, because they only need to be unique within that structure. Structure, question, answer, and share ids always come from the API.

## Structure Editor

17. **Units and coordinates.** Positions are in metres (x to the right, y up) and forces in kN. New and dragged nodes snap to a 0.5 m grid; typed coordinates can be any number.
18. **Supported elements.** The editor supports nodes (with labels), members (with optional labels), supports (pin, roller, or fixed; at most one per node), and point loads at nodes given as Fx/Fy components. Distributed loads, member properties, and free-floating annotations were left out of the first version.
19. **Validation rules.** A structure can be saved only if:
    - it has a name of at most 80 characters;
    - it has at least one member;
    - node labels are not blank or repeated, and no two nodes share a position;
    - every node is connected to a member (checked once any member exists);
    - no member has zero length or repeats another;
    - every support and load references an existing node;
    - every load has a non-zero force.
    Stability is not checked because there is no solver. Problems are listed under the canvas and shown with red markers on the drawing. Saving is blocked until they are fixed, and the mock API re-checks the same rules.
20. **Reversible editing.** There is undo and redo (buttons, Ctrl+Z, Ctrl+Shift+Z), and a whole drag or a run of typing counts as one step. Deleting a node also deletes its members, supports, and loads. Deleting a saved structure asks for confirmation. The mock API refuses to delete a structure that a question uses (409).
21. **Keyboard access.** Every drawing element can be focused and selected with Enter or Space. With the canvas or an element focused, Delete removes the selection, Escape cancels, and the arrow keys move a selected node by 0.5 m. The properties panel can also add a node by coordinates, connect nodes, and add supports and loads, so the editor works without a pointer.
22. **Mobile.** Below 700px the tool strip wraps above the canvas and the properties panel collapses into a "Properties" disclosure. It opens automatically when you select something.
23. **`UiStatus` atom added.** Feedback messages show an icon and a hidden text label as well as color, as ui.md requires. Errors use `role="alert"`; other messages use `role="status"`.

## Question Builder

24. **Multiple choice only, one correct option.** Prototype.md says short answer needs backend validation rules, which are not defined. It appears in the answer-type list as disabled with that reason. Each question has 2–6 options with unique, non-blank text, and exactly one is marked correct. The same rules run in the form and in the mock API.
25. **A structure is required.** Every question uses one structure, either a saved one or one drawn in the builder. Prototype.md's `structureId?` stays optional in the API types.
26. **New structure in the builder.** The full structure editor is embedded in the form. On save, the structure is created (or updated) through the structures API first, then the question is saved with its id. The structure then appears in the Structure Editor like any other.
27. **Save before sharing.** Sharing is disabled until the question is saved, and again while it has unsaved changes, so the link always points to what the author sees. The link, share code, and URL come from the API. Asking to share an already shared question returns the same link. The mock builds links as `<origin>/questions/answer/<shareId>` from an 8-character code.
28. **Validation timing.** Question and structure errors appear after the first save attempt, next to each field and in a count by the save button. Server field errors (422) are mapped onto the same fields.
29. **The builder is not a saved route.** Superseded by 37: saved questions now open at `/questions/:questionId`.

## Answer Questions

30. **Share routes.** Superseded by 36: a shared link opens `/answers/<shareId>`. The share-code form (code or pasted link, any case) is on `/answers`. Unknown codes get a clear error and a way back.
31. **Immediate, anonymous feedback.** The specs leave both timing and identity open. The mock grades the answer straight away and returns whether it was correct, the correct option, and the author's explanation. Answers are stored without any user identity.
32. **Duplicate protection.** Submit is disabled until an option is chosen and while the request is in flight. After a result, the options lock and the submit button disappears. Reloading the page allows another attempt, because answers are anonymous and there is no identity to deduplicate on.
33. **What respondents receive.** Respondents get the question without the correct flags, with the structure embedded (`GET /shared/:shareId`), so the answer page makes one request.

## Hardening (step 5)

34. **Unsaved-changes guard.** The Structure Editor and Question Builder ask for confirmation before navigating away with unsaved work, and the browser shows its standard prompt on reload or tab close. Moving between structures inside the editor uses the editor's own confirmation, so you are only asked once.
35. **Architecture guard tests.** `src/__tests__/architecture.spec.ts` fails if code outside `src/api/` makes network calls or uses DTO types, or if anything other than the theme uses browser storage. This keeps two acceptance criteria true as the code changes: persistence goes through the API modules, and the API types stay in one place.

## List-based tabs (requested after the first build)

Prototype.md was updated for this change.

36. **Tabs and routes.** The tabs are now Structures, Questions, and Answers. Each opens a list:
    - `/structures`, `/structures/new`, `/structures/:structureId`
    - `/questions`, `/questions/new`, `/questions/:questionId`
    - `/answers`, `/answers/:shareId`

    `/questions/create`, `/questions/answer`, and `/questions/answer/:shareId` redirect to the new paths, so old bookmarks and share links still work. The mock now builds share links as `<origin>/answers/<shareId>`.
37. **Questions can be reopened.** `GET /questions` lists questions with their structure name and share status. Opening one loads it into the builder, where it can be edited, saved, and shared. After the first save, a new question moves to its own URL.
38. **The Answers list shows every currently shared question.** It uses `GET /shared`. There are no accounts, so "questions you can answer" means every question that is currently shared. When accounts exist, this endpoint can filter by user. A local history of opened questions was rejected because app data must go through the API. The share-code form stays at the top of the page.
39. **The editors lost their pickers.** With list pages in place, the Structure Editor no longer has an "Open a saved structure" select or a "New structure" button, and the Question Builder no longer has a "New question" button. Each has a "← All …" link back to its list. Leaving an editor with unsaved changes always asks first.
