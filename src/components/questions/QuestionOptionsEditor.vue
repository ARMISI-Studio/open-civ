<script setup lang="ts">
import { useId } from 'vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import { QUESTION_LIMITS, type QuestionOptionDraft } from '@/domain/questions'

defineProps<{
  options: QuestionOptionDraft[]
  /** Error for the option list as a whole (count, correct answer). */
  error?: string
  /** Errors for individual options, keyed by option key. */
  optionErrors: Record<string, string>
  canAdd: boolean
  canRemove: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [key: string]
  'update:text': [key: string, text: string]
  'update:correct': [key: string]
}>()

const uid = useId()
const legendHintId = `${uid}-hint`
const errorId = `${uid}-error`
</script>

<template>
  <fieldset
    class="question-options"
    :aria-describedby="[legendHintId, error ? errorId : null].filter(Boolean).join(' ')"
    :aria-invalid="!!error || undefined"
  >
    <legend class="question-options__legend">Answer options</legend>
    <p :id="legendHintId" class="question-options__hint">
      Write {{ QUESTION_LIMITS.minOptions }}–{{ QUESTION_LIMITS.maxOptions }} options and mark the
      correct one.
    </p>

    <ol class="question-options__list">
      <li
        v-for="(option, index) in options"
        :key="option.key"
        class="question-options__row"
        :class="{ 'question-options__row--correct': option.correct }"
      >
        <label class="question-options__correct">
          <input
            type="radio"
            class="question-options__radio"
            :name="`${uid}-correct`"
            :checked="option.correct"
            :aria-label="`Option ${index + 1} is correct`"
            @change="emit('update:correct', option.key)"
          />
          <span class="question-options__correct-text" aria-hidden="true">Correct</span>
        </label>
        <div class="question-options__text">
          <UiInput
            :id="`${uid}-option-${option.key}`"
            :model-value="option.text"
            :aria-label="`Option ${index + 1}`"
            :maxlength="QUESTION_LIMITS.option"
            :placeholder="`Option ${index + 1}`"
            :invalid="!!optionErrors[option.key]"
            :aria-describedby="
              optionErrors[option.key] ? `${uid}-option-${option.key}-error` : undefined
            "
            @update:model-value="emit('update:text', option.key, $event)"
          />
          <p
            v-if="optionErrors[option.key]"
            :id="`${uid}-option-${option.key}-error`"
            class="question-options__error"
          >
            <span aria-hidden="true">!</span> {{ optionErrors[option.key] }}
          </p>
        </div>
        <UiButton
          variant="ghost"
          size="small"
          class="question-options__remove"
          :disabled="!canRemove"
          :aria-label="`Remove option ${index + 1}`"
          @click="emit('remove', option.key)"
        >
          ✕
        </UiButton>
      </li>
    </ol>

    <p v-if="error" :id="errorId" class="question-options__error" role="alert">
      <span aria-hidden="true">!</span> {{ error }}
    </p>

    <UiButton size="small" class="question-options__add" :disabled="!canAdd" @click="emit('add')">
      <template #icon>＋</template>
      Add option
    </UiButton>
  </fieldset>
</template>

<style scoped>
.question-options {
  display: grid;
  gap: var(--spacing-small);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.question-options__legend {
  padding: 0;
  font-size: var(--fonts-label);
  font-weight: 500;
}

.question-options__hint {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.question-options__list {
  display: grid;
  gap: var(--spacing-small);
  margin: 0;
  padding: 0;
  list-style: none;
}

.question-options__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--spacing-small);
  padding: var(--spacing-small);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-controlRadius);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.question-options__row--correct {
  background: var(--colors-selection);
  border-color: var(--colors-primary);
}

.question-options__correct {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--shape-controlHeight);
  padding: 0 4px;
  color: var(--colors-muted);
  font-size: var(--fonts-label);
  cursor: pointer;
}

.question-options__row--correct .question-options__correct {
  color: var(--colors-primary);
  font-weight: 600;
}

.question-options__radio {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--colors-primary);
}

.question-options__text {
  display: grid;
  gap: 4px;
}

.question-options__error {
  color: var(--colors-error);
  font-size: var(--fonts-label);
}

.question-options__add {
  justify-self: start;
}

@media (max-width: 480px) {
  .question-options__correct-text {
    display: none;
  }
}
</style>
