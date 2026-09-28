<script setup lang="ts">
import { RouterLink } from 'vue-router'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import AnswerForm from '@/components/questions/AnswerForm.vue'
import QuestionViewer from '@/components/questions/QuestionViewer.vue'
import { useAnswerQuestion } from '@/composables/useAnswerQuestion'

const props = defineProps<{ shareId: string }>()

const state = useAnswerQuestion(() => props.shareId)
</script>

<template>
  <section class="answer-view">
    <header class="answer-view__header">
      <RouterLink class="answer-view__back" to="/answers">← All shared questions</RouterLink>
      <h1>Answer a question</h1>
    </header>

    <UiStatus v-if="state.loadStatus.value === 'loading'" tone="loading">
      Loading the shared question…
    </UiStatus>

    <div v-else-if="state.loadStatus.value === 'error'" class="answer-view__error">
      <UiStatus tone="error">
        {{
          state.notFound.value
            ? state.loadError.value
            : `Could not load the question. ${state.loadError.value}`
        }}
      </UiStatus>
      <div class="answer-view__error-actions">
        <UiButton v-if="!state.notFound.value" @click="state.load">Try again</UiButton>
        <RouterLink to="/answers">Enter a different code</RouterLink>
      </div>
    </div>

    <template v-else-if="state.question.value">
      <QuestionViewer :question="state.question.value" />
      <AnswerForm :state="state" @submit="state.submit" />
      <RouterLink v-if="state.isSubmitted.value" class="answer-view__another" to="/answers">
        Answer another question
      </RouterLink>
    </template>
  </section>
</template>

<style scoped>
.answer-view {
  display: grid;
  gap: var(--spacing-large);
  width: 100%;
  max-width: var(--answer-max-width);
  margin: 0 auto;
}

.answer-view__header {
  display: grid;
  gap: 4px;
}

.answer-view__back {
  justify-self: start;
  font-size: var(--fonts-label);
}

.answer-view__error {
  display: grid;
  gap: var(--spacing-medium);
}

.answer-view__error-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-medium);
}

.answer-view__another {
  justify-self: start;
}

@media (max-width: 700px) {
  .answer-view {
    gap: var(--spacing-medium);
  }
}
</style>
