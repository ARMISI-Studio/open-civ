# Frontend architecture

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

## Implementation rules

- Use Vue Router for the three main routes.
- Keep route views thin and move reusable behaviour into components/composables.
- Keep API calls behind typed API modules.
- Keep mock data separate from API modules so it can be removed later.
- Do not couple canvas/SVG rendering to API response objects directly; map API data into domain models first if needed.
- Avoid global state unless route-level state sharing becomes necessary.

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
