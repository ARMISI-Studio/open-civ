<script setup lang="ts">
import MainTabs from '@/components/navigation/MainTabs.vue'
</script>

<template>
  <div class="app-layout">
    <header class="app-layout__header">
      <div class="app-layout__brand">
        <span class="app-layout__logo" aria-hidden="true">△</span>
        <span>Open Civ</span>
        <span class="app-layout__tagline">/ structural learning</span>
      </div>
      <MainTabs />
    </header>
    <main class="app-layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-layout__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-small) var(--spacing-large);
  padding: var(--spacing-small) var(--spacing-large) 0;
  background: var(--colors-surface);
  border-bottom: var(--border-width) solid var(--colors-border);
}

.app-layout__brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-small);
  font-weight: 700;
  padding-bottom: var(--spacing-small);
}

.app-layout__logo {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--shape-controlRadius);
  background: var(--colors-primary);
  color: var(--colors-onPrimary);
}

.app-layout__tagline {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
  font-weight: 400;
}

.app-layout__main {
  flex: 1;
  width: 100%;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--spacing-large);
}

@media (max-width: 700px) {
  .app-layout__header {
    padding: var(--spacing-small) var(--spacing-medium) 0;
  }

  .app-layout__header :deep(.main-tabs) {
    width: 100%;
  }

  .app-layout__main {
    padding: var(--spacing-medium);
  }
}
</style>
