<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiSelect, { type UiSelectOption } from '@/components/ui/atoms/UiSelect.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import UiTextarea from '@/components/ui/atoms/UiTextarea.vue'
import {
  applyTheme,
  clearSavedTheme,
  defaultTheme,
  loadSavedTheme,
  parseThemeJson,
  saveTheme,
} from '@/theme/applyTheme'

const supportOptions: UiSelectOption[] = [
  {
    value: 'pin',
    label: 'Pin',
    icon: '△',
    description: 'Restrains horizontal and vertical movement',
  },
  { value: 'roller', label: 'Roller', icon: '◯', description: 'Restrains vertical movement only' },
  {
    value: 'fixed',
    label: 'Fixed',
    icon: '▮',
    description: 'Also restrains rotation',
    disabled: true,
  },
]
const materials = [
  'Aluminium',
  'Bamboo',
  'Cast iron',
  'Concrete',
  'Glulam',
  'Masonry',
  'Reinforced concrete',
  'Stainless steel',
  'Steel',
  'Timber',
  'Titanium',
  'Wrought iron',
].map((label) => ({ value: label.toLowerCase().replace(/\s+/g, '-'), label }))

const support = ref<string | null>(null)
const material = ref<string | null>(null)
const scrolledMaterial = ref<string | null>('steel')
const unknownValue = ref<string | null>('hinge')
const name = ref('')
const span = ref('6')
const notes = ref('')
const loading = ref(false)

const themeText = ref(JSON.stringify(loadSavedTheme(), null, 2))
const themeStatus = ref('')
const themeError = ref(false)

function applyThemeText() {
  const result = parseThemeJson(themeText.value)
  if (!result.ok) {
    themeStatus.value = `Could not apply theme: ${result.error} The previous theme is still active.`
    themeError.value = true
    return
  }
  applyTheme(result.theme)
  saveTheme(result.theme)
  themeStatus.value = 'Theme applied and saved in this browser.'
  themeError.value = false
}

function resetTheme() {
  applyTheme(defaultTheme)
  clearSavedTheme()
  themeText.value = JSON.stringify(defaultTheme, null, 2)
  themeStatus.value = 'Default theme restored.'
  themeError.value = false
}

function simulateLoading() {
  loading.value = true
  setTimeout(() => (loading.value = false), 1500)
}
</script>

<template>
  <section class="ui-preview">
    <header class="ui-preview__header">
      <h1>UI preview</h1>
      <p class="ui-preview__intro">
        The shared controls, rendered with the current theme. Hover, focus, and open them to check
        each state.
      </p>
    </header>

    <div class="ui-preview__grid">
      <section class="ui-preview__panel" aria-labelledby="preview-buttons">
        <h2 id="preview-buttons">Buttons</h2>
        <div class="ui-preview__row">
          <UiButton variant="primary">Primary</UiButton>
          <UiButton>Secondary</UiButton>
          <UiButton variant="ghost">Ghost</UiButton>
          <UiButton variant="danger">Delete</UiButton>
        </div>
        <div class="ui-preview__row">
          <UiButton size="small">
            <template #icon>⊙</template>
            Small with icon
          </UiButton>
          <UiButton variant="primary" disabled>Disabled</UiButton>
          <UiButton variant="primary" :loading="loading" @click="simulateLoading">
            {{ loading ? 'Saving…' : 'Click to load' }}
          </UiButton>
        </div>
      </section>

      <section class="ui-preview__panel" aria-labelledby="preview-inputs">
        <h2 id="preview-inputs">Inputs</h2>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Structure name"
          hint="Use a name you’ll recognize later."
        >
          <UiInput
            :id="id"
            v-model="name"
            :aria-describedby="describedby"
            :invalid="invalid"
            placeholder="e.g. Roof truss"
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Span (m)"
          required
          :error="Number(span) > 0 ? undefined : 'Enter a span greater than zero.'"
        >
          <UiInput
            :id="id"
            v-model="span"
            type="number"
            :aria-describedby="describedby"
            :invalid="invalid"
          />
        </UiField>
        <UiField v-slot="{ id }" label="Read-only">
          <UiInput :id="id" model-value="https://example.test/share" readonly />
        </UiField>
        <UiField v-slot="{ id }" label="Disabled">
          <UiInput :id="id" model-value="Not editable" disabled />
        </UiField>
        <UiField v-slot="{ id, describedby }" label="Notes">
          <UiTextarea :id="id" v-model="notes" :aria-describedby="describedby" />
        </UiField>
      </section>

      <section class="ui-preview__panel" aria-labelledby="preview-selects">
        <h2 id="preview-selects">Selects</h2>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Support type"
          hint="Fixed is disabled."
        >
          <UiSelect
            :id="id"
            v-model="support"
            :options="supportOptions"
            placeholder="Choose a support"
            :aria-describedby="describedby"
            :invalid="invalid"
          />
        </UiField>
        <UiField v-slot="{ id }" label="Material">
          <UiSelect
            :id="id"
            v-model="material"
            :options="materials"
            placeholder="Choose a material"
          />
        </UiField>
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Invalid select"
          error="Choose a support."
        >
          <UiSelect
            :id="id"
            :model-value="null"
            :options="supportOptions"
            :aria-describedby="describedby"
            :invalid="invalid"
          />
        </UiField>
        <UiField v-slot="{ id }" label="Disabled select">
          <UiSelect :id="id" model-value="pin" :options="supportOptions" disabled />
        </UiField>
        <UiField v-slot="{ id }" label="Empty select">
          <UiSelect :id="id" :model-value="null" :options="[]" />
        </UiField>
        <UiField v-slot="{ id }" label="Unknown value">
          <UiSelect :id="id" v-model="unknownValue" :options="supportOptions" />
        </UiField>
        <p class="ui-preview__value" data-testid="preview-values">
          Support: {{ support ?? 'none' }} · Material: {{ material ?? 'none' }}
        </p>
      </section>

      <section class="ui-preview__panel" aria-labelledby="preview-scroll">
        <h2 id="preview-scroll">Inside a scrollable panel</h2>
        <div class="ui-preview__scroller" data-testid="scroll-panel">
          <p class="ui-preview__filler">Scroll down to reach the select.</p>
          <UiField v-slot="{ id }" label="Scrolled material">
            <UiSelect :id="id" v-model="scrolledMaterial" :options="materials" />
          </UiField>
          <p class="ui-preview__filler">
            The panel is teleported, so this container cannot clip it.
          </p>
        </div>
      </section>

      <section class="ui-preview__panel ui-preview__panel--wide" aria-labelledby="preview-theme">
        <h2 id="preview-theme">Theme JSON</h2>
        <UiField
          v-slot="{ id, describedby }"
          label="Theme"
          hint="Paste a theme exported from the playground, then apply it."
        >
          <UiTextarea
            :id="id"
            v-model="themeText"
            class="ui-preview__json"
            :aria-describedby="describedby"
            spellcheck="false"
          />
        </UiField>
        <div class="ui-preview__row">
          <UiButton variant="primary" @click="applyThemeText">Apply theme</UiButton>
          <UiButton @click="resetTheme">Reset defaults</UiButton>
        </div>
        <p
          v-if="themeStatus"
          role="status"
          class="ui-preview__status"
          :class="{ 'ui-preview__status--error': themeError }"
        >
          {{ themeStatus }}
        </p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.ui-preview {
  display: grid;
  gap: var(--spacing-large);
}

.ui-preview__header {
  display: grid;
  gap: var(--spacing-small);
}

.ui-preview__intro {
  color: var(--colors-muted);
}

.ui-preview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: var(--spacing-large);
  align-items: start;
}

.ui-preview__panel {
  display: grid;
  gap: var(--spacing-medium);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.ui-preview__panel--wide {
  grid-column: 1 / -1;
}

.ui-preview__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-small);
}

.ui-preview__value {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.ui-preview__scroller {
  display: grid;
  gap: var(--spacing-medium);
  max-height: 180px;
  overflow: auto;
  padding: var(--spacing-small);
  border: var(--border-width) dashed var(--colors-border);
  border-radius: var(--shape-controlRadius);
}

.ui-preview__filler {
  min-height: 120px;
  color: var(--colors-muted);
}

.ui-preview__json {
  min-height: 240px;
  font-family: ui-monospace, monospace;
  font-size: var(--fonts-label);
}

.ui-preview__status {
  color: var(--colors-success);
  font-size: var(--fonts-label);
}

.ui-preview__status--error {
  color: var(--colors-error);
}

@media (max-width: 700px) {
  .ui-preview__panel {
    padding: var(--spacing-medium);
  }
}
</style>
