<script setup lang="ts">
/** Page frame for a tab's list: title, short description, and the main "new" action. */
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <section class="list-page">
    <header class="list-page__header">
      <div class="list-page__title">
        <h1>{{ title }}</h1>
        <p v-if="description" class="list-page__description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="list-page__actions"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.list-page {
  display: grid;
  gap: var(--spacing-large);
}

.list-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-medium);
}

.list-page__title {
  display: grid;
  gap: 4px;
}

.list-page__description {
  color: var(--colors-muted);
}

.list-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-small);
}

@media (max-width: 700px) {
  .list-page {
    gap: var(--spacing-medium);
  }

  .list-page__actions,
  .list-page__actions > * {
    flex: 1 1 auto;
  }
}
</style>
