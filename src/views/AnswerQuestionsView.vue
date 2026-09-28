<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import AnswerForm from '@/components/questions/AnswerForm.vue'
import QuestionViewer from '@/components/questions/QuestionViewer.vue'
import { useAnswerQuestion } from '@/composables/useAnswerQuestion'
import { parseShareInput } from '@/domain/answers'

const props = defineProps<{ shareId?: string }>()

const router = useRouter()
const state = useAnswerQuestion(() => props.shareId)

const codeInput = ref('')
const codeError = ref<string | undefined>()

function openShared() {
  const code = parseShareInput(codeInput.value)
  if (!code) {
    codeError.value = codeInput.value.trim()
      ? 'That doesn’t look like a share code or link.'
      : 'Enter a share code or link.'
    return
  }
  codeError.value = undefined
  router.push(`/questions/answer/${code}`)
}
</script>

<template>
  <section class="answer-view">
    <header class="answer-view__header">
      <h1>Answer Questions</h1>
      <p v-if="!shareId" class="answer-view__subtitle">Open a question someone shared with you.</p>
    </header>

    <!-- No share id: enter a code or link -->
    <form v-if="!shareId" class="answer-view__open" novalidate @submit.prevent="openShared">
      <UiField
        v-slot="{ id, describedby, invalid }"
        label="Share code or link"
        hint="For example K7QM2XPA, or the full link you received."
        :error="codeError"
      >
        <UiInput
          :id="id"
          v-model="codeInput"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          :aria-describedby="describedby"
          :invalid="invalid"
        />
      </UiField>
      <div>
        <UiButton type="submit" variant="primary">Open question</UiButton>
      </div>
    </form>

    <template v-else>
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
          <RouterLink to="/questions/answer">Enter a different code</RouterLink>
        </div>
      </div>

      <template v-else-if="state.question.value">
        <QuestionViewer :question="state.question.value" />
        <AnswerForm :state="state" @submit="state.submit" />
        <RouterLink
          v-if="state.isSubmitted.value"
          class="answer-view__another"
          to="/questions/answer"
        >
          Answer another question
        </RouterLink>
      </template>
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

.answer-view__subtitle {
  color: var(--colors-muted);
}

.answer-view__open {
  display: grid;
  gap: var(--spacing-medium);
  max-width: 480px;
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
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

  .answer-view__open {
    padding: var(--spacing-medium);
  }
}
</style>
