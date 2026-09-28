<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import QuestionForm from '@/components/questions/QuestionForm.vue'
import ShareQuestionPanel from '@/components/questions/ShareQuestionPanel.vue'
import StructurePreview from '@/components/structures/StructurePreview.vue'
import { useQuestionBuilder } from '@/composables/useQuestionBuilder'
import { useStructures } from '@/composables/useStructures'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import type { Structure } from '@/domain/structures'

const props = defineProps<{ questionId?: string }>()

const router = useRouter()
const builder = useQuestionBuilder()
const structures = useStructures()
const preview = ref<Structure | null>(null)

/** Anything typed that is not saved yet. A fresh, untouched form counts as clean. */
const hasUnsavedWork = computed(() =>
  builder.isSaved.value ? builder.isDirty.value : builder.isDirty.value && isTouched.value,
)
const isTouched = computed(() => {
  const d = builder.draft.value
  return (
    !!d.title.trim() ||
    !!d.prompt.trim() ||
    !!d.explanation.trim() ||
    !!d.structureId ||
    d.options.some((o) => o.text.trim()) ||
    builder.newStructure.isDirty.value
  )
})
useUnsavedChangesGuard(hasUnsavedWork)

async function loadRoute(id: string | undefined) {
  // Already showing it, e.g. right after the first save redirected to its URL.
  if (id && id === builder.saved.value?.id) return
  preview.value = null
  if (id) await builder.loadQuestion(id)
  else builder.reset()
}

watch(() => props.questionId, loadRoute)
onMounted(() => {
  loadRoute(props.questionId)
  structures.refreshList()
})

// Load the chosen saved structure for the preview.
watch(
  () => [builder.structureSource.value, builder.draft.value.structureId] as const,
  async ([source, id]) => {
    if (source !== 'existing' || !id) {
      preview.value = null
      return
    }
    if (preview.value?.id === id) return
    const loaded = await structures.load(id)
    if (builder.draft.value.structureId === id) preview.value = loaded
  },
)

const previewStatus = computed(() => structures.loadStatus.value)

async function save() {
  const wasNew = !builder.saved.value
  const saved = await builder.save()
  if (!saved) return
  // A structure drawn here is now saved; make it available in the list.
  if (builder.structureSource.value === 'new') structures.refreshList()
  if (wasNew) router.replace(`/questions/${saved.id}`)
}

const isLoading = computed(() => builder.loadStatus.value === 'loading')
const loadFailed = computed(() => builder.loadStatus.value === 'error')
</script>

<template>
  <section class="question-builder">
    <header class="question-builder__header">
      <div class="question-builder__title">
        <RouterLink class="question-builder__back" to="/questions">← All questions</RouterLink>
        <h1>{{ questionId ? 'Edit question' : 'New question' }}</h1>
        <p class="question-builder__subtitle">Turn a structure into a question, then share it.</p>
      </div>
    </header>

    <UiStatus v-if="isLoading" tone="loading">Loading question…</UiStatus>
    <div v-else-if="loadFailed" class="question-builder__error">
      <UiStatus tone="error">
        {{
          builder.notFound.value
            ? builder.loadError.value
            : `Could not load the question. ${builder.loadError.value}`
        }}
      </UiStatus>
      <UiButton
        v-if="!builder.notFound.value && questionId"
        @click="builder.loadQuestion(questionId)"
      >
        Try again
      </UiButton>
      <RouterLink to="/questions">Back to all questions</RouterLink>
    </div>

    <div
      v-else
      class="question-builder__layout"
      :class="{ 'question-builder__layout--wide': builder.structureSource.value === 'new' }"
    >
      <QuestionForm
        class="question-builder__form"
        :builder="builder"
        :structures="structures.summaries.value"
        :structures-status="structures.listStatus.value"
        :structures-error="structures.listError.value"
        @submit="save"
        @retry-structures="structures.refreshList"
      />

      <aside class="question-builder__aside">
        <section
          v-if="builder.structureSource.value === 'existing'"
          class="question-builder__preview"
          aria-labelledby="qb-preview"
        >
          <h2 id="qb-preview" class="question-builder__preview-heading">Structure preview</h2>
          <StructurePreview
            :structure="preview"
            :status="builder.draft.value.structureId ? previewStatus : 'success'"
            :error="structures.loadError.value"
            empty-text="Choose a structure to preview it here."
          />
        </section>
        <ShareQuestionPanel
          :share="builder.share.value"
          :status="builder.shareStatus.value"
          :error="builder.shareError.value"
          :can-share="builder.canShare.value"
          :is-saved="builder.isSaved.value"
          @share="builder.requestShare"
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.question-builder {
  display: grid;
  gap: var(--spacing-large);
}

.question-builder__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-medium);
}

.question-builder__title {
  display: grid;
  gap: 4px;
}

.question-builder__back {
  justify-self: start;
  font-size: var(--fonts-label);
}

.question-builder__error {
  display: grid;
  justify-items: start;
  gap: var(--spacing-medium);
}

.question-builder__subtitle {
  color: var(--colors-muted);
}

.question-builder__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: var(--spacing-large);
  align-items: start;
}

.question-builder__layout--wide {
  grid-template-columns: minmax(0, 1fr);
}

.question-builder__aside {
  position: sticky;
  top: var(--spacing-large);
  display: grid;
  gap: var(--spacing-large);
}

.question-builder__layout--wide .question-builder__aside {
  position: static;
}

.question-builder__preview {
  display: grid;
  gap: var(--spacing-medium);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

@media (max-width: 900px) {
  .question-builder__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .question-builder__aside {
    position: static;
  }
}

@media (max-width: 700px) {
  .question-builder {
    gap: var(--spacing-medium);
  }

  .question-builder__preview {
    padding: var(--spacing-medium);
  }
}
</style>
