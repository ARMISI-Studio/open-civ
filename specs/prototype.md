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
- Creating a full structural solver unless separately specified.

## Main app navigation

The app should have three primary tabs and matching routes.

| Tab | Route | Purpose |
| --- | --- | --- |
| Structure Editor | `/structures` | Create, view, and edit 2D structures. |
| Question Builder | `/questions/create` | Make questions from an existing structure or a new structure, then share them. |
| Answer Questions | `/questions/answer` | Answer questions that were created and shared. |

Navigation requirements:

- The three tabs must be visible as the main app navigation.
- The active tab must be clearly indicated.
- Routes must be bookmarkable and reloadable.
- Mobile layout must keep navigation usable without horizontal overflow.
- Unknown routes should redirect to the default route or show a simple not-found state.
- Default route should open the Structure Editor unless a shared-question link defines a different entry point.

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

- The editor should keep structure data separate from rendering code.
- The display model must not be the only source of truth.
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

The answering area may need additional route forms, such as:

- `/questions/answer`
- `/questions/answer/:shareId`
- `/q/:shareId`

The exact public sharing route should be decided with the backend/API contract.

## Frontend architecture

Use the existing Vue 3, TypeScript, and Vite project.

Suggested structure:

```text
src/
  App.vue
  router/
    index.ts
  layouts/
    AppLayout.vue
  views/
    StructureEditorView.vue
    QuestionBuilderView.vue
    AnswerQuestionsView.vue
  components/
    navigation/
      MainTabs.vue
    structures/
      StructureCanvas.vue
      StructureToolbar.vue
      StructurePropertiesPanel.vue
      StructureList.vue
    questions/
      QuestionForm.vue
      QuestionOptionsEditor.vue
      ShareQuestionPanel.vue
      QuestionViewer.vue
      AnswerForm.vue
  composables/
    useStructures.ts
    useQuestionBuilder.ts
    useAnswerQuestion.ts
  api/
    client.ts
    structures.ts
    questions.ts
    answers.ts
  domain/
    structures.ts
    questions.ts
    answers.ts
```

Implementation rules:

- Use Vue Router for the three main routes.
- Keep route views thin and move reusable behaviour into components/composables.
- Keep API calls behind typed API modules.
- Keep mock data separate from API modules so it can be removed later.
- Do not couple canvas/SVG rendering to API response objects directly; map API data into domain models first if needed.
- Avoid global state unless route-level state sharing becomes necessary.

## Backend API expectations

The backend is a separate project. The frontend should expect API support for:

### Structures

- List structures.
- Create structure.
- Read structure.
- Update structure.
- Delete structure, if allowed.

### Questions

- List created questions, if needed.
- Create question.
- Read question.
- Update question, if allowed.
- Attach structure to question.
- Create share link or invitation.

### Answers

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

- The app has three main tabs: Structure Editor, Question Builder, and Answer Questions.
- Each tab has a matching route.
- The root route opens the Structure Editor by default.
- The 2D Structure Editor can represent and edit a basic structure.
- The Question Builder can create a question from an existing or new structure.
- The Question Builder can request a share action from the backend API.
- The Answer Questions area can load a shared question and submit an answer.
- Frontend persistence and sharing go through API modules, not ad-hoc local-only logic.
- API types are centralized and easy to update when the backend contract changes.
- Loading, validation, and error states are visible to users.
- The layout works on desktop and mobile.

## Testing expectations

Unit tests should cover:

- Route definitions and default redirect.
- Main tab active state.
- Structure model validation helpers.
- Structure editor state changes.
- Question form validation.
- Share action success and failure states.
- Answer form validation and submit state.

End-to-end tests should cover:

- Navigating between the three main tabs.
- Creating or editing a simple structure.
- Creating a question from a structure.
- Sharing a question.
- Opening and answering a shared question.
- Mobile viewport navigation.

For this planning change, application code is not implemented. This document updates the project direction from a single client-only prototype to a routed Vue frontend that works with a separate backend API project.
