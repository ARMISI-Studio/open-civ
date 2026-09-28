<script setup lang="ts">
import { computed, useId } from 'vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiSelect from '@/components/ui/atoms/UiSelect.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import UiTextarea from '@/components/ui/atoms/UiTextarea.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import QuestionOptionsEditor from './QuestionOptionsEditor.vue'
import StructureList from '@/components/structures/StructureList.vue'
import StructureWorkspace from '@/components/structures/StructureWorkspace.vue'
import type { QuestionBuilder, StructureSource } from '@/composables/useQuestionBuilder'
import type { RequestStatus } from '@/composables/useStructures'
import { ANSWER_TYPES, QUESTION_LIMITS, type AnswerType } from '@/domain/questions'
import { NAME_MAX_LENGTH, type StructureSummary } from '@/domain/structures'

const props = defineProps<{
  builder: QuestionBuilder
  structures: StructureSummary[]
  structuresStatus: RequestStatus
  structuresError: string | null
}>()

const emit = defineEmits<{ submit: []; 'retry-structures': [] }>()

const b = props.builder
const uid = useId()

const SOURCES: { value: StructureSource; label: string; description: string }[] = [
  {
    value: 'existing',
    label: 'Use a saved structure',
    description: 'Pick one from Structures.',
  },
  {
    value: 'new',
    label: 'Draw a new structure',
    description: 'It is saved together with the question.',
  },
]

const structureId = computed({
  get: () => b.draft.value.structureId,
  set: (id: string | null) => b.update({ structureId: id }),
})

const newStructureNameError = computed(() =>
  b.attempted.value
    ? b.newStructure.issues.value.find((i) => i.field === 'name')?.message
    : undefined,
)

const answerTypeOptions = ANSWER_TYPES.map((t) => ({ ...t }))
</script>

<template>
  <form class="question-form" novalidate @submit.prevent="emit('submit')">
    <section class="question-form__section" aria-labelledby="qf-question">
      <h2 id="qf-question" class="question-form__heading">Question</h2>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Title"
        required
        :error="b.errors.value.title"
      >
        <UiInput
          :id="id"
          :model-value="b.draft.value.title"
          :maxlength="QUESTION_LIMITS.title"
          placeholder="e.g. Find the support reaction"
          autocomplete="off"
          :aria-describedby="describedby"
          :invalid="invalid"
          @update:model-value="b.update({ title: $event })"
        />
      </UiField>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Prompt"
        required
        :error="b.errors.value.prompt"
      >
        <UiTextarea
          :id="id"
          :model-value="b.draft.value.prompt"
          :maxlength="QUESTION_LIMITS.prompt"
          rows="3"
          placeholder="What is the vertical reaction at support A?"
          :aria-describedby="describedby"
          :invalid="invalid"
          @update:model-value="b.update({ prompt: $event })"
        />
      </UiField>
    </section>

    <section class="question-form__section" aria-labelledby="qf-structure">
      <h2 id="qf-structure" class="question-form__heading">Structure</h2>
      <fieldset class="question-form__sources">
        <legend class="visually-hidden">Where the structure comes from</legend>
        <label
          v-for="source in SOURCES"
          :key="source.value"
          class="question-form__source"
          :class="{ 'question-form__source--active': b.structureSource.value === source.value }"
        >
          <input
            type="radio"
            class="question-form__source-radio"
            :name="`${uid}-source`"
            :value="source.value"
            :checked="b.structureSource.value === source.value"
            @change="b.setStructureSource(source.value)"
          />
          <span class="question-form__source-text">
            <span class="question-form__source-label">{{ source.label }}</span>
            <span class="question-form__source-description">{{ source.description }}</span>
          </span>
        </label>
      </fieldset>

      <StructureList
        v-if="b.structureSource.value === 'existing'"
        v-model="structureId"
        label="Structure"
        required
        :structures="structures"
        :status="structuresStatus"
        :error="structuresError"
        :field-error="b.errors.value.structure"
        @retry="emit('retry-structures')"
      />

      <div v-else class="question-form__new-structure">
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Structure name"
          required
          :error="newStructureNameError"
        >
          <UiInput
            :id="id"
            :model-value="b.newStructure.structure.value.name"
            :maxlength="NAME_MAX_LENGTH"
            placeholder="e.g. Portal frame"
            autocomplete="off"
            :aria-describedby="describedby"
            :invalid="invalid"
            @update:model-value="b.newStructure.updateDetails({ name: $event }, 'name')"
            @blur="b.newStructure.endEdit()"
          />
        </UiField>
        <StructureWorkspace :editor="b.newStructure" />
        <UiStatus v-if="b.attempted.value && b.newStructureInvalid.value" tone="error">
          Fix the structure problems listed under the drawing.
        </UiStatus>
      </div>
    </section>

    <section class="question-form__section" aria-labelledby="qf-answer">
      <h2 id="qf-answer" class="question-form__heading">Answer</h2>
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Answer type"
        :error="b.errors.value.answerType"
      >
        <UiSelect
          :id="id"
          :model-value="b.draft.value.answerType"
          :options="answerTypeOptions"
          :aria-describedby="describedby"
          :invalid="invalid"
          @update:model-value="b.update({ answerType: $event as AnswerType })"
        />
      </UiField>
      <QuestionOptionsEditor
        :options="b.draft.value.options"
        :error="b.errors.value.options"
        :option-errors="b.errors.value.optionText"
        :can-add="b.canAddOption.value"
        :can-remove="b.canRemoveOption.value"
        @add="b.addOption"
        @remove="b.removeOption"
        @update:text="b.setOptionText"
        @update:correct="b.setCorrectOption"
      />
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Explanation"
        hint="Optional. Shown to respondents after they answer."
        :error="b.errors.value.explanation"
      >
        <UiTextarea
          :id="id"
          :model-value="b.draft.value.explanation"
          :maxlength="QUESTION_LIMITS.explanation"
          rows="3"
          :aria-describedby="describedby"
          :invalid="invalid"
          @update:model-value="b.update({ explanation: $event })"
        />
      </UiField>
    </section>

    <div class="question-form__footer">
      <UiStatus v-if="b.attempted.value && b.errorCount.value > 0" tone="error">
        Fix {{ b.errorCount.value }} {{ b.errorCount.value === 1 ? 'problem' : 'problems' }} before
        saving.
      </UiStatus>
      <UiStatus v-if="b.saveStatus.value === 'error'" tone="error">
        Could not save the question. {{ b.saveError.value }}
      </UiStatus>
      <UiStatus v-else-if="b.isSaved.value && !b.isDirty.value" tone="success">
        Question saved.
      </UiStatus>
      <UiStatus v-else-if="b.isSaved.value && b.isDirty.value" tone="warning">
        You have unsaved changes.
      </UiStatus>
      <div class="question-form__actions">
        <UiButton type="submit" variant="primary" :loading="b.saveStatus.value === 'loading'">
          {{
            b.saveStatus.value === 'loading'
              ? 'Saving…'
              : b.isSaved.value
                ? 'Save changes'
                : 'Save question'
          }}
        </UiButton>
      </div>
    </div>
  </form>
</template>

<style scoped>
.question-form {
  display: grid;
  gap: var(--spacing-large);
  min-width: 0;
}

.question-form__section {
  display: grid;
  gap: var(--spacing-medium);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
  min-width: 0;
}

.question-form__sources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-small);
  margin: 0;
  padding: 0;
  border: 0;
}

.question-form__source {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  border: var(--border-width) solid var(--colors-inputBorder);
  border-radius: var(--shape-controlRadius);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.question-form__source--active {
  background: var(--colors-selection);
  border-color: var(--colors-primary);
}

.question-form__source-radio {
  width: 18px;
  height: 18px;
  margin: 3px 0 0;
  accent-color: var(--colors-primary);
}

.question-form__source-text {
  display: grid;
}

.question-form__source-label {
  font-weight: 600;
}

.question-form__source-description {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.question-form__new-structure {
  display: grid;
  gap: var(--spacing-medium);
  min-width: 0;
}

.question-form__new-structure :deep(.structure-workspace__properties),
.question-form__new-structure :deep(.structure-workspace__tools),
.question-form__new-structure :deep(.structure-workspace__canvas-panel) {
  background: var(--colors-background);
}

.question-form__footer {
  display: grid;
  gap: var(--spacing-small);
}

.question-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-small);
}

@media (max-width: 700px) {
  .question-form__section {
    padding: var(--spacing-medium);
  }

  .question-form__actions > * {
    flex: 1;
  }
}
</style>
