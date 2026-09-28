<script setup lang="ts">
import { computed, useId } from 'vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import type { AnswerQuestionState } from '@/composables/useAnswerQuestion'

const props = defineProps<{ state: AnswerQuestionState }>()
const emit = defineEmits<{ submit: [] }>()

const s = props.state
const uid = useId()
const errorId = `${uid}-error`

const question = computed(() => s.question.value!)
const locked = computed(() => s.isSubmitted.value || s.isSubmitting.value)

function optionState(id: string) {
  const result = s.result.value
  if (!result) return null
  if (id === result.correctOptionId) return 'correct'
  if (id === s.selectedOptionId.value) return 'incorrect'
  return null
}

const showValidation = computed(
  () => s.attempted.value && !!s.validationError.value && !s.isSubmitted.value,
)
</script>

<template>
  <form class="answer-form" novalidate @submit.prevent="emit('submit')">
    <fieldset
      class="answer-form__options"
      :disabled="locked"
      :aria-describedby="showValidation ? errorId : undefined"
      :aria-invalid="showValidation || undefined"
    >
      <legend class="answer-form__legend">Your answer</legend>
      <label
        v-for="option in question.options"
        :key="option.id"
        class="answer-form__option"
        :class="{
          'answer-form__option--selected': s.selectedOptionId.value === option.id,
          'answer-form__option--correct': optionState(option.id) === 'correct',
          'answer-form__option--incorrect': optionState(option.id) === 'incorrect',
        }"
      >
        <input
          type="radio"
          class="answer-form__radio"
          :name="`${uid}-answer`"
          :value="option.id"
          :checked="s.selectedOptionId.value === option.id"
          @change="s.select(option.id)"
        />
        <span class="answer-form__option-text">{{ option.text }}</span>
        <span
          v-if="optionState(option.id) === 'correct'"
          class="answer-form__badge answer-form__badge--correct"
        >
          ✓ Correct answer
        </span>
        <span
          v-else-if="optionState(option.id) === 'incorrect'"
          class="answer-form__badge answer-form__badge--incorrect"
        >
          ✗ Your answer
        </span>
      </label>
    </fieldset>

    <p v-if="showValidation" :id="errorId" class="answer-form__error" role="alert">
      <span aria-hidden="true">!</span> {{ s.validationError.value }}
    </p>

    <UiStatus v-if="s.submitStatus.value === 'error'" tone="error">
      Could not submit your answer. {{ s.submitError.value }}
    </UiStatus>

    <section v-if="s.result.value" class="answer-form__result" aria-live="polite">
      <UiStatus :tone="s.result.value.correct ? 'success' : 'warning'">
        <strong>{{ s.result.value.correct ? 'Correct!' : 'Not quite.' }}</strong>
        Your answer was submitted.
      </UiStatus>
      <div v-if="s.result.value.explanation" class="answer-form__explanation">
        <h3 class="answer-form__explanation-heading">Explanation</h3>
        <p>{{ s.result.value.explanation }}</p>
      </div>
    </section>

    <div v-else class="answer-form__actions">
      <UiButton
        type="submit"
        variant="primary"
        :disabled="!s.selectedOptionId.value"
        :loading="s.isSubmitting.value"
      >
        {{ s.isSubmitting.value ? 'Submitting…' : 'Submit answer' }}
      </UiButton>
      <p v-if="!s.selectedOptionId.value" class="answer-form__hint">Choose an answer to submit.</p>
    </div>
  </form>
</template>

<style scoped>
.answer-form {
  display: grid;
  gap: var(--spacing-medium);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.answer-form__options {
  display: grid;
  gap: var(--spacing-small);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.answer-form__legend {
  margin-bottom: var(--spacing-small);
  padding: 0;
  font-size: var(--fonts-section);
  font-weight: 600;
}

.answer-form__option {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-small) var(--spacing-medium);
  min-height: var(--shape-controlHeight);
  padding: var(--spacing-medium);
  border: var(--border-width) solid var(--colors-inputBorder);
  border-radius: var(--shape-controlRadius);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.answer-form__option:hover {
  border-color: var(--colors-primary);
}

.answer-form__option:has(:focus-visible) {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.answer-form__option--selected {
  background: var(--colors-selection);
  border-color: var(--colors-primary);
}

.answer-form__options:disabled .answer-form__option {
  cursor: default;
}

.answer-form__option--correct {
  border-color: var(--colors-success);
  box-shadow: inset 0 0 0 1px var(--colors-success);
}

.answer-form__option--incorrect {
  border-color: var(--colors-error);
  box-shadow: inset 0 0 0 1px var(--colors-error);
}

.answer-form__radio {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--colors-primary);
}

.answer-form__option-text {
  flex: 1 1 160px;
}

.answer-form__badge {
  font-size: var(--fonts-label);
  font-weight: 600;
}

.answer-form__badge--correct {
  color: var(--colors-success);
}

.answer-form__badge--incorrect {
  color: var(--colors-error);
}

.answer-form__error {
  color: var(--colors-error);
  font-size: var(--fonts-label);
}

.answer-form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-medium);
}

.answer-form__hint {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.answer-form__result {
  display: grid;
  gap: var(--spacing-medium);
}

.answer-form__explanation {
  display: grid;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  background: var(--colors-background);
  border-radius: var(--shape-controlRadius);
}

.answer-form__explanation-heading {
  font-size: var(--fonts-body);
}

@media (max-width: 700px) {
  .answer-form {
    padding: var(--spacing-medium);
  }

  .answer-form__actions > .ui-button {
    flex: 1;
  }
}
</style>
