# Product build plan: 2D structures, questions, and answers

## Goal

Build the frontend for a structural-learning app with three main areas:

1. **2D Structure Editor** — create and edit 2D structural diagrams/models.
2. **Question Builder & Sharing** — create questions from saved structures or a new structure, then share them with people.
3. **Answer Questions** — open and answer shared questions.

The frontend is a Vue app. The backend is a separate project that exposes an API. Frontend code should be written around API contracts and should not embed long-term persistence or server logic.

These requirements replace the earlier single-page, client-only prototype assumptions. If there is a conflict, this document takes priority.

## Scope and working assumptions

The project is no longer one fixed question on one page. It is a routed application with a broader workflow:

- Users can create or edit 2D structures.
- Users can create questions using existing structures or by creating a new structure during question creation.
- Users can share questions with other people.
- Recipients can answer questions.
- The frontend is Vue 3, TypeScript, and Vite.
- The backend is separate and will provide API endpoints for structures, questions, shares, and answers.
- Until the backend exists, frontend work may use typed API adapters, mocks, or fixture data, but those must be isolated so they can be replaced by real API calls.

Out of scope for the frontend project:

- Implementing the backend server.
- Implementing database persistence directly in the frontend.
- Building authentication unless the backend/API requirements explicitly require it.
- Creating a full structural solver. A simple load analysis is planned separately; see [Area 4](#area-4-load-analysis-planned).

## Main app navigation

The app should have three primary tabs and matching routes. Each tab opens a list of its items, with an action to create a new one. Selecting an item opens it.

| Tab | List route | Item routes | Purpose |
| --- | --- | --- | --- |
| Structures | `/structures` | `/structures/new`, `/structures/:structureId` | List saved 2D structures; create, view, and edit them in the Structure Editor. |
| Questions | `/questions` | `/questions/new`, `/questions/:questionId` | List questions with their share status; create or edit them in the Question Builder, then share them. |
| Answers | `/answers` | `/answers/:shareId` | List questions that are shared and can be answered, open one by share code or link, and answer it. |

Navigation requirements:

- The three tabs must be visible as the main app navigation.
- The active tab must be clearly indicated.
- Routes must be bookmarkable and reloadable.
- Mobile layout must keep navigation usable without horizontal overflow.
- Unknown routes should redirect to the default route or show a simple not-found state.
- Default route should open the Structures tab unless a shared-question link defines a different entry point.
- A tab stays active on its list and on its item routes.
- Each list shows loading, empty, and error states.

## Area 1: 2D Structure Editor

### Purpose

Let users create and edit a 2D structure that can later be used in questions.

### Core capabilities

- Create a new 2D structure.
- Display the structure in an interactive 2D canvas or SVG workspace.
- Add, select, move, and delete structural elements.
- Represent common structural objects, such as:
  - nodes/joints,
  - members/elements,
  - supports/restraints,
  - loads,
  - labels or annotations.
- Edit basic properties for selected objects.
- Save the structure through the backend API.
- Load existing structures from the backend API.

### 2D editor behaviour

- The structure model (nodes, members, supports, loads) lives as plain typed data in application state; the canvas/SVG only renders that data and must never be the only place it exists.
- Saving, loading, validation, and edits all operate on the model, never on rendered SVG/canvas elements.
- Geometry should use consistent units and coordinates.
- Selection, editing, and deletion must be explicit and reversible where practical.
- Validation should prevent invalid structures where possible, or clearly show validation errors.

### Expected structure data

A structure should be represented with typed data similar to:

```ts
type Structure = {
  id: string;
  name: string;
  description?: string;
  nodes: StructureNode[];
  members: StructureMember[];
  supports: StructureSupport[];
  loads: StructureLoad[];
  metadata?: Record<string, unknown>;
};
```

Exact fields should be finalized with the backend API contract.

## Area 2: Question Builder & Sharing

### Purpose

Let users make questions using structures they created or by creating a new structure as part of the question flow.

### Core capabilities

- Start a new question.
- Choose an existing structure from the backend.
- Or create a new structure and attach it to the question.
- Define the question prompt.
- Define answer type and answer options.
- Mark correct answer(s) where applicable.
- Add explanation, reveal content, or solution notes.
- Save the question through the backend API.
- Generate or request a share link/invite through the backend API.
- Show share status clearly after saving/sharing.

### Supported question model

The first implementation should support a simple, typed question model before adding advanced mechanics.

Recommended initial question types:

- Multiple choice.
- Short answer, if backend validation rules are defined.
- Structure-based prompt with one selected structure.

A question should be represented with typed data similar to:

```ts
type Question = {
  id: string;
  title: string;
  prompt: string;
  structureId?: string;
  answerType: 'multipleChoice' | 'shortAnswer';
  options?: QuestionOption[];
  explanation?: string;
  share?: QuestionShare;
};
```

Exact fields should be finalized with the backend API contract.

### Sharing behaviour

- Sharing must go through the backend API.
- The frontend should not invent permanent share IDs locally.
- A successful share should provide a link, code, or recipient status returned by the API.
- Copy-to-clipboard may be added for share links.
- Failed sharing should show a useful error message.

## Area 3: Answer Questions

### Purpose

Let people answer questions that have been created and shared.

### Core capabilities

- Open a shared question from a route, link, or share code.
- Display the question prompt and linked structure.
- Let the respondent submit an answer.
- Send the answer to the backend API.
- Show submitted state and feedback according to backend rules.
- Prevent accidental duplicate submission where appropriate.

### Answer flow

1. Load the question from the API.
2. Display the structure and question prompt.
3. User selects or enters an answer.
4. Submit is disabled until the answer is valid enough to send.
5. Submit answer to the API.
6. Show result, confirmation, or explanation based on API response.

### Shared question routes

Shared links open `/answers/:shareId`. The earlier forms `/questions/answer` and `/questions/answer/:shareId` redirect to `/answers` and `/answers/:shareId`. A shorter public route such as `/q/:shareId` can still be decided with the backend/API contract.

## Area 4: Load analysis (planned)

Status: planned, not yet specified in detail and not part of the current build or its acceptance criteria.

### Purpose

Let users see how a structure responds to its loads, in the spirit of tools like SkyCiv but much simpler: a 2D structure with supports and loads goes in, and results such as support reactions come out.

### Engineering logic must be reviewable

- All analysis logic and formulas live together in one dedicated, readable file (or small folder), separate from UI code, so a structural engineer can read and verify them without knowing Vue or the rest of the app.
- That file states its assumptions in plain language: sign conventions, units, the analysis method, material and section properties, and what it does not handle.
- Each formula or step is commented with what it computes and, where one exists, a reference (textbook, code clause, or standard method).
- The file comes with worked test cases whose expected results a structural engineer can check by hand (for example, a simply supported beam with a central point load).
- UI code only displays the results and never re-implements engineering calculations.

### Open questions

To settle before building:

- Which results to show: support reactions only, member end forces, deflected shape, or axial/shear/moment diagrams.
- Which load types to support: the current nodal point loads only, or also distributed loads on members and point moments.
- Material and section properties: fixed defaults, or editable per member.
- Where the analysis runs: in the frontend, or as a backend API endpoint (the reviewable-file rule applies either way).
- Whether questions can use analysis results, for example to generate or check the correct answer.

## Backend API expectations

The backend is a separate project. The frontend should expect API support for:

### Structures

- List structures.
- Create structure.
- Read structure.
- Update structure.
- Delete structure, if allowed.

### Questions

- List created questions, with their share status.
- Create question.
- Read question.
- Update question, if allowed.
- Attach structure to question.
- Create share link or invitation.

### Answers

- List questions that are currently shared and can be answered.
- Read shared question by share ID/code.
- Submit answer.
- Return answer status, feedback, explanation, or result according to product rules.

API details that must be confirmed:

- Base URL and environment variable name.
- Authentication requirements.
- Error response format.
- Validation response format.
- Share URL format.
- Whether answers are anonymous or tied to users.
- Whether question feedback is immediate or delayed.

## Build sequence

### 1. App routes and main tabs

- Add Vue Router if not already configured.
- Create the three main views.
- Add main tab navigation.
- Redirect the root route to `/structures`.
- Add a simple not-found route or fallback redirect.

Exit criterion: the app has three visible tabs and the matching routes work by direct URL load.

### 2. Structure Editor foundation

- Define typed structure domain models.
- Build the 2D structure canvas/workspace.
- Add basic create/edit/select/delete interactions for the first useful structure elements.
- Add API adapter functions for loading and saving structures.
- Use mocks only behind the API boundary until the backend is available.

Exit criterion: a user can create a simple 2D structure and save/load it through the current API adapter.

### 3. Question Builder foundation

- Define typed question models.
- Build the question form.
- Allow selecting an existing structure.
- Allow creating a new structure as part of the question flow if required for the first release.
- Add answer options and correct-answer selection for multiple choice.
- Add save and share actions through API adapters.

Exit criterion: a user can create a question from a structure and receive a share result from the API adapter.

### 4. Answer Questions foundation

- Build shared-question loading route.
- Display the question and linked structure.
- Add answer form and validation.
- Submit answers through the API adapter.
- Display submitted/result state.

Exit criterion: a shared question can be opened and answered through the frontend flow.

### 5. API integration and hardening

- Replace mocks with real backend calls when the backend project is ready.
- Confirm request/response types.
- Add loading, empty, and error states.
- Add route guards only if authentication is required.
- Add tests for route navigation, core editor actions, question creation, sharing, and answer submission.

Exit criterion: the frontend works against the backend API in development.

## Acceptance criteria

- The app has three main tabs: Structures, Questions, and Answers.
- Each tab lists its items (saved structures, created questions, shared questions to answer) and can start a new structure or question, or open a shared one by code.
- Each tab has a matching route.
- The root route opens the Structures tab by default.
- The 2D Structure Editor can represent and edit a basic structure.
- The Question Builder can create a question from an existing or new structure.
- The Question Builder can request a share action from the backend API.
- The Answer Questions area can load a shared question and submit an answer.
- Frontend persistence and sharing go through API modules, not ad-hoc local-only logic.
- API types are centralized and easy to update when the backend contract changes.
- Loading, validation, and error states are visible to users.
- The layout works on desktop and mobile.

Architecture, implementation rules, and testing expectations live in [architecture.md](architecture.md).

For this planning change, application code is not implemented. This document updates the project direction from a single client-only prototype to a routed Vue frontend that works with a separate backend API project.

Sina Tarighi
Milad Dehghan
