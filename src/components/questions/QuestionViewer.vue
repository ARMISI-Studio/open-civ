<script setup lang="ts">
import StructurePreview from '@/components/structures/StructurePreview.vue'
import type { SharedQuestion } from '@/domain/answers'

defineProps<{ question: SharedQuestion }>()
</script>

<template>
  <article class="question-viewer" aria-labelledby="question-viewer-title">
    <header class="question-viewer__header">
      <p class="question-viewer__eyebrow">Shared question · {{ question.shareId }}</p>
      <h2 id="question-viewer-title" class="question-viewer__title">{{ question.title }}</h2>
      <p class="question-viewer__prompt">{{ question.prompt }}</p>
    </header>
    <StructurePreview
      class="question-viewer__structure"
      :structure="question.structure"
      empty-text="This question has no structure."
    />
  </article>
</template>

<style scoped>
.question-viewer {
  display: grid;
  gap: var(--spacing-large);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.question-viewer__header {
  display: grid;
  gap: var(--spacing-small);
}

.question-viewer__eyebrow {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.question-viewer__title {
  font-size: var(--fonts-heading);
}

.question-viewer__prompt {
  font-size: var(--fonts-section);
  white-space: pre-line;
}

@media (max-width: 700px) {
  .question-viewer {
    padding: var(--spacing-medium);
  }
}
</style>
