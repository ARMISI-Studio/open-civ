<script setup lang="ts">
/** Read-only view of a structure with loading, empty, and error states. */
import StructureCanvas from './StructureCanvas.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import type { StructureDraft } from '@/domain/structures'
import type { RequestStatus } from '@/composables/useStructures'

withDefaults(
  defineProps<{
    structure: StructureDraft | null
    status?: RequestStatus
    error?: string | null
    emptyText?: string
  }>(),
  { status: 'success', error: null, emptyText: 'No structure selected yet.' },
)
</script>

<template>
  <figure class="structure-preview">
    <UiStatus v-if="status === 'loading'" tone="loading">Loading structure…</UiStatus>
    <UiStatus v-else-if="status === 'error'" tone="error">{{
      error ?? 'Could not load the structure.'
    }}</UiStatus>
    <template v-else-if="structure">
      <StructureCanvas class="structure-preview__canvas" :structure="structure" readonly />
      <figcaption class="structure-preview__caption">
        <strong>{{ structure.name }}</strong>
        <span v-if="structure.description" class="structure-preview__description">{{
          structure.description
        }}</span>
      </figcaption>
    </template>
    <p v-else class="structure-preview__empty">{{ emptyText }}</p>
  </figure>
</template>

<style scoped>
.structure-preview {
  display: grid;
  gap: var(--spacing-small);
  margin: 0;
}

.structure-preview__canvas {
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-controlRadius);
}

.structure-preview__caption {
  display: grid;
  gap: 2px;
}

.structure-preview__description,
.structure-preview__empty {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.structure-preview__empty {
  display: grid;
  place-items: center;
  min-height: 160px;
  border: var(--border-width) dashed var(--colors-border);
  border-radius: var(--shape-controlRadius);
}
</style>
