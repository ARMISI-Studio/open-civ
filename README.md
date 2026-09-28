# open-civ

Frontend for a structural-learning app: draw 2D structures, turn them into questions, share them, and answer shared questions. Vue 3, TypeScript, and Vite.

The product spec lives in [specs/prototype/](specs/prototype/): [prototype.md](specs/prototype/prototype.md) (requirements), [architecture.md](specs/prototype/architecture.md), [ui.md](specs/prototype/ui.md), and [decisions.md](specs/prototype/decisions.md) (gaps resolved during the build).

## Routes

| Route | Screen |
| --- | --- |
| `/structures` | Structures list |
| `/structures/new`, `/structures/:structureId` | Structure Editor |
| `/questions` | Questions list, with share status |
| `/questions/new`, `/questions/:questionId` | Question Builder |
| `/answers` | Shared questions to answer, and the share-code form |
| `/answers/:shareId` | Answer a shared question |
| `/ui-preview` | Shared UI components and theme import (not in the main tabs) |

## Load analysis

The structure workspace has a **Show results** toggle. It shows support reactions, member end forces, and the deflected shape. All of the structural calculations are in [src/domain/analysis/frame2d.ts](src/domain/analysis/frame2d.ts), written to be reviewed by a structural engineer. The file header states the method, assumptions, units, and sign conventions. [The tests beside it](src/domain/analysis/__tests__/frame2d.spec.ts) check textbook cases that can be worked by hand.

## Mock backend

There is no backend yet. [MSW](https://mswjs.io) answers every API request in the browser from `src/mocks/`, and stores its data in `localStorage`. To reset the data, clear the site's storage.

The app only calls the backend through the typed modules in `src/api/`. Request and response types and the endpoint list are in `src/api/types.ts`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base URL of the backend API |
| `VITE_API_MOCKS` | on | Set to `off` to disable the mock backend and call the real API |

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

This project replaces its workspace TypeScript package with [typescript-native-bridge](https://github.com/johnsoncodehk/typescript-native-bridge). Command-line tools use the bridge automatically. To use it in VS Code after installing dependencies, accept the prompt to use the workspace TypeScript version. If the prompt does not appear, run **TypeScript: Select TypeScript Version** and choose **Use Workspace Version**.

## Project Setup

```sh
pnpm install
```

### Develop

```sh
pnpm dev
```

### Type-check, compile, and minify for production

```sh
pnpm build
```

### Unit tests ([Vitest](https://vitest.dev/))

```sh
pnpm test:unit --run
```

Unit tests run against the same MSW handlers as the app. The server is set up in `src/__tests__/setup.ts`.

### End-to-end tests ([Playwright](https://playwright.dev))

```sh
# Install the browser for the first run
pnpm exec playwright install chromium

# Runs against the dev server (started automatically)
pnpm test:e2e

# Runs against the production build, as on CI
pnpm build && CI=1 pnpm test:e2e

# Watch the browser
PW_HEADED=1 pnpm test:e2e
```

### Lint and format

```sh
pnpm lint
pnpm format
```
