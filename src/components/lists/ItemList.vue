<script setup lang="ts" generic="T">
/**
 * A list of items loaded from the API, with loading, error (with retry), and empty states.
 * Each item is rendered through the default slot, usually as a link card.
 */
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import type { RequestStatus } from '@/composables/useStructures'

defineProps<{
  items: T[]
  itemKey: (item: T) => string
  status: RequestStatus
  error?: string | null
  /** Accessible name of the list. */
  label: string
  loadingText?: string
  emptyText: string
}>()

const emit = defineEmits<{ retry: [] }>()

defineSlots<{
  default(props: { item: T }): unknown
  empty?(): unknown
}>()
</script>

<template>
  <div class="item-list">
    <UiStatus v-if="status === 'loading' || status === 'idle'" tone="loading">
      {{ loadingText ?? 'Loading…' }}
    </UiStatus>
    <div v-else-if="status === 'error'" class="item-list__error">
      <UiStatus tone="error">{{ error ?? 'Could not load the list.' }}</UiStatus>
      <UiButton size="small" @click="emit('retry')">Try again</UiButton>
    </div>
    <div v-else-if="items.length === 0" class="item-list__empty">
      <slot name="empty">{{ emptyText }}</slot>
    </div>
    <ul v-else class="item-list__items" :aria-label="label">
      <li v-for="item in items" :key="itemKey(item)" class="item-list__item">
        <slot :item="item" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.item-list {
  display: grid;
  gap: var(--spacing-small);
}

.item-list__error {
  display: grid;
  justify-items: start;
  gap: var(--spacing-small);
}

.item-list__empty {
  display: grid;
  justify-items: center;
  gap: var(--spacing-medium);
  padding: var(--spacing-section) var(--spacing-large);
  border: var(--border-width) dashed var(--colors-border);
  border-radius: var(--shape-panelRadius);
  color: var(--colors-muted);
  text-align: center;
}

.item-list__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: var(--spacing-medium);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-list__item {
  display: grid;
  min-width: 0;
}
</style>
