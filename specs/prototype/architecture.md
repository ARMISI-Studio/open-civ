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
    StructuresListView.vue
    StructureEditorView.vue
    QuestionsListView.vue
    QuestionBuilderView.vue
    AnswersListView.vue
    AnswerQuestionsView.vue
  components/
    ui/
      atoms/
        UiButton.vue
        UiInput.vue
        UiSelect.vue
        UiLabel.vue
      molecules/
        UiField.vue
      organisms/        # only when a shared molecule combination appears
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
  theme/
    default.json
    types.ts
    applyTheme.ts
  styles/
    tokens.css
    base.css
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
    analysis/
      frame2d.ts        # load analysis: all structural calculations, for engineering review
    structures.ts
    questions.ts
    answers.ts
```

## Shared UI components

Build a small, themeable UI layer before building the feature forms. Screens should compose these components so a design change updates every screen. Keep structural-learning logic and API calls out of the UI layer.

| Component | Responsibility |
| --- | --- |
| `UiButton` | Consistent primary, secondary, ghost, and danger actions; sizes, icons, disabled and loading states. |
| `UiInput` | Styled native text/number inputs with consistent sizing, focus, disabled, readonly, and invalid states. |
| `UiSelect` | A custom dropdown with a styled trigger and option panel, replacing the browser-native select appearance. |
| `UiLabel` | A styled native `<label>` with an optional required indicator. |
| `UiField` | Molecule combining `UiLabel`, a control, an optional hint, and a validation message, linked through IDs. |

### Component contracts

- `UiButton`: accept `variant`, `size`, `disabled`, and `loading`; provide default and optional icon slots. Render a native button, default to `type="button"`, and allow an explicit submit type. Loading prevents repeat activation and keeps an accessible text label.
- `UiInput`: declare only `modelValue` and `invalid`; emit `update:modelValue`. Native attributes (`id`, `type`, `placeholder`, `disabled`, `readonly`, `min`, `autocomplete`, …) and native events pass through `$attrs` to the `<input>`, which is the root element. Keep text values as strings; convert and validate domain values in the form layer.
- `UiLabel`: render a native `<label>`; `for` and other attributes pass through `$attrs`. Accept `required` to show the indicator; label content comes from the default slot.
- `UiSelect`: accept `modelValue: string | null`, `options`, `placeholder`, `disabled`, and `invalid`; emit `update:modelValue`. Start with single selection. Each option has a stable `value`, a `label`, and optional `description`, `icon`, and `disabled` fields. Provide an option slot for richer presentation while preserving the option’s accessible name and selection behavior.
- `UiField`: accept `label`, `hint`, `error`, and `required`. Each text prop is the default content of a matching slot (`label`, `hint`, `error`), so callers can pass a string or richer markup. The default slot receives the stable control ID and hint/error IDs as slot props. The label targets the control; the control receives `aria-describedby` and `aria-invalid` when applicable. Feature forms own validation rules and pass the resulting messages down.

### Custom select appearance and behavior

The select should feel like part of the app: a rounded trigger with a chevron, a floating panel with a subtle border and shadow, comfortable option rows, and a checkmark beside the selected option. Support icons and short descriptions for options such as materials or support types. Style hover, keyboard focus, selection, and disabled states distinctly using theme tokens.

Use an accessible headless select primitive behind `UiSelect` to handle interaction; keep that dependency and its styling private to the wrapper. Choose and verify the primitive when implementing the component. Do not build a clickable list of divs with only mouse support.

Required behavior:

- Open and navigate with the keyboard, select with Enter, close with Escape, and support typing to jump to an option.
- Maintain correct combobox/listbox roles, expanded state, active option, and selected state. Disabled options cannot be selected.
- Return focus to the trigger after selection or Escape. Tab continues normal focus navigation; outside clicks close the panel without stealing focus.
- Keep the panel aligned with the trigger, within the viewport, and scrollable for long lists. Constrain its width on mobile.
- Teleport the panel outside clipping containers. Keep it within the same theme scope as the trigger.
- Treat an empty list and an unknown selected value explicitly; do not silently select the first option.

Search and multi-select can be added later if a feature needs them.

## Component patterns

These rules apply to every component, and most strictly to the shared UI layer. The aim is to follow the open–closed principle: a parent can extend or restyle a component without editing it. Sources: [Create a Vue.js component library without losing your mind](https://medium.com/@miladd3/vue-js-component-library-without-losing-your-mind-e8f64f23bb17) and [Custom style your Vue components like a pro](https://medium.com/@miladd3/custom-style-your-vue-components-like-a-pro-fba12ea6194d).

### Atomic layers

The shared library in `components/ui/` follows atomic design, limited to three levels:

- **Atoms** (`ui/atoms/`) are single-purpose controls such as `UiButton`, `UiInput`, `UiSelect`, and `UiLabel`. Each has one responsibility; for example, an input does not render its own label.
- **Molecules** (`ui/molecules/`) combine atoms into a reusable unit with a consistent look, such as `UiField`, which combines a label, a control, a hint, and an error.
- **Organisms** (`ui/organisms/`) combine molecules. Add this folder only when the same combination is shared across features.

Templates and pages are not part of the library: `layouts/` and `views/` fill those roles. Feature-specific compositions such as `QuestionForm` live in their feature folder, not in `ui/`.

Prefix shared components with `Ui` so they cannot clash with a component library added later.

### Extend through attributes and slots, not new props

Do not add a prop each time a caller needs something different. Before adding a prop, check whether one of these already covers it:

- **Attribute passthrough.** Make the native element the root of an atom so Vue's attribute fallthrough forwards native attributes, classes, and listeners (`id`, `disabled`, `maxlength`, `@blur`, `@keydown`, …). When a wrapper element is unavoidable, set `inheritAttrs: false`, bind `class` and `style` to the root, and bind the remaining attrs to the native control. Declare props only for behavior the native element lacks, such as `modelValue`, `invalid`, `variant`, or `loading`.
- **Slots with prop defaults.** When a component shows text, accept it as a prop and use that prop as the default content of a named slot. `<UiField label="Span">` covers the simple case; `<template #label>` covers an icon, unit, or tooltip.
- **Slot-wrapped inner parts.** Molecules can render their inner atom as the default content of a slot, so a caller can swap `UiInput` for `UiSelect` without a new component.
- **Native-feeling organisms.** A form organism renders a real `<form>` root, so `@submit.prevent` and native form attributes work unchanged.

```vue
<!-- UiField.vue (sketch) -->
<template>
  <div class="ui-field">
    <UiLabel class="ui-field__label" :for="id" :required="required">
      <slot name="label">{{ label }}</slot>
    </UiLabel>
    <slot :id="id" :describedby="describedby" :invalid="!!error" />
    <p v-if="hint || $slots.hint" :id="hintId" class="ui-field__hint">
      <slot name="hint">{{ hint }}</slot>
    </p>
    <p v-if="error || $slots.error" :id="errorId" class="ui-field__error">
      <slot name="error">{{ error }}</slot>
    </p>
  </div>
</template>
```

### Styling rules

- **No margin on a component's root.** A component does not know where it will be placed. The parent sets spacing with `gap` on its own layout, or by adding a class to the child. The same applies to root-level width, grid placement, and alignment.
- **No inline styles or `!important`.** Parents cannot override them. The exception is values computed at runtime, such as dropdown panel coordinates or SVG geometry in the structure canvas. Pass those as CSS custom properties where practical (`:style="{ '--panel-top': top }"`), so the rules that use them stay in the stylesheet.
- **Props for variants only.** Use props for design-system variants and states such as `variant="primary | secondary | ghost | danger"`, `size`, `invalid`, and `loading`. Do not add props like `color`, `padding`, `width`, or `rounded`. The parent styles the component with CSS instead.
- **Name elements with classes.** Give each root a kebab-case class matching the component (`ui-button`, `ui-select`). Give important inner parts a `block__part` class (`ui-select__trigger`, `ui-select__panel`, `ui-field__hint`) and variants a `block--modifier` class (`ui-button--danger`). Full BEM is not required; the aim is that parents have stable hooks to target.
- **Keep component selectors flat.** Use a single class selector per rule inside components, so a parent rule such as `.share-panel .ui-button` wins on specificity without hacks.

### Overriding from the parent

Components use `<style scoped>`. A parent's scoped styles already reach a child component's root element. To reach an inner part, use `:deep()` with the named class:

```vue
<!-- ShareQuestionPanel.vue -->
<template>
  <section class="share-panel">
    <UiInput class="share-panel__link" readonly :model-value="shareUrl" />
    <UiButton class="share-panel__copy" variant="secondary">Copy</UiButton>
  </section>
</template>

<style scoped>
.share-panel {
  display: flex;
  gap: var(--spacing-small);
}
.share-panel__link {
  flex: 1;
}
.share-panel :deep(.ui-button__icon) {
  color: var(--colors-primary);
}
</style>
```

Parent overrides still use theme tokens rather than raw values. Local layout and one-off adjustments belong in the parent. If the same visual override appears in several places, make it a variant in the UI layer instead of copying it. A teleported panel sits outside the parent's DOM, so `:deep()` cannot reach it; theme it through tokens and add a class passthrough (such as `panelClass`) only when a real case needs it.

## Theme architecture

Use a JSON theme as the shared source for colors, spacing, fonts, and corner/control sizes. Start with the schema used by [the visual playground](../../public/ui-playground.html): `colors`, `spacing`, `fonts`, and `shape`.

- `theme/default.json` holds the app’s chosen defaults. Export a theme from the playground and use it to update this file after validating its schema.
- `theme/types.ts` defines the theme contract. `theme/applyTheme.ts` validates imported values and maps them to CSS custom properties, such as `--colors-primary`, `--spacing-medium`, and `--fonts-family`.
- Apply tokens at the document root so controls and teleported dropdown panels share the same theme. Convert numeric size and spacing values to pixels; keep line height unitless.
- `styles/tokens.css` defines derived component tokens and shared layering values. `styles/base.css` handles global typography, page defaults, and focus treatment.
- UI components consume tokens instead of repeating hex colors, font sizes, padding, and radii. Keep component variants in the UI layer; screens may adjust layout from the parent (see [Component patterns](#component-patterns)) but should not redefine a variant's look.
- Preserve the last valid theme if an import is invalid. Store only theme preferences locally; application data continues to use the API layer.

The standalone HTML playground is a design reference today. When the Vue UI layer is implemented, add a development preview that renders the actual `UiButton`, `UiInput`, and `UiSelect` components using the same theme. Include their interactive states so the preview and production components stay in sync.

## Implementation rules

- Use Vue Router for the three main routes.
- Use the shared UI components for feature buttons, inputs, and selects. Keep native elements inside these wrappers for semantics where appropriate.
- Keep route views thin and move reusable behaviour into components/composables.
- Keep API calls behind typed API modules.
- Keep mock data separate from API modules so it can be removed later.
- Do not couple canvas/SVG rendering to API response objects directly; map API data into domain models first if needed.
- Avoid global state unless route-level state sharing becomes necessary.

## Testing expectations

Unit tests should cover:

- Theme validation and token mapping, including invalid imports.
- Button submit type, loading, and disabled behavior.
- Input value updates and accessible label/error associations.
- Attribute passthrough: native attributes, classes, and listeners reach the native element; `UiField` label/hint/error slots override their prop defaults.
- Select value updates, disabled options, empty options, and controlled value changes.

- Route definitions and default redirect.
- Main tab active state.
- Structure model validation helpers.
- Structure editor state changes.
- Question form validation.
- Share action success and failure states.
- Answer form validation and submit state.
- Load analysis against hand-checkable textbook cases, including unstable structures.

End-to-end tests should cover:

- Navigating between the three main tabs and their list pages.
- Creating or editing a simple structure.
- Creating a question from a structure.
- Sharing a question.
- Opening and answering a shared question.
- Showing load analysis results for a structure.
- Mobile viewport navigation.

Browser tests for shared controls should cover keyboard navigation, selection, Escape/Tab behavior, focus handling, and a dropdown inside a scrollable panel. Check dropdown placement on mobile and after theme changes. Review the component preview for hover, focus, selected, loading, disabled, and error states.
