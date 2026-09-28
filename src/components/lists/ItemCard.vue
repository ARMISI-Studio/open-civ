<script setup lang="ts">
/** A clickable card in a list page. The whole card is one link. */
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{ to: RouteLocationRaw; title: string }>()
</script>

<template>
  <RouterLink :to="to" class="item-card">
    <span class="item-card__title">{{ title }}</span>
    <span v-if="$slots.default" class="item-card__body"><slot /></span>
    <span v-if="$slots.meta" class="item-card__meta"><slot name="meta" /></span>
  </RouterLink>
</template>

<style scoped>
.item-card {
  display: grid;
  align-content: start;
  gap: var(--spacing-small);
  height: 100%;
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
  color: var(--colors-text);
  text-decoration: none;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.item-card:hover {
  border-color: var(--colors-primary);
  background: var(--colors-selection);
}

.item-card__title {
  font-size: var(--fonts-section);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.item-card__body {
  color: var(--colors-muted);
  overflow-wrap: anywhere;
}

.item-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-small) var(--spacing-medium);
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

@media (max-width: 700px) {
  .item-card {
    padding: var(--spacing-medium);
  }
}
</style>
