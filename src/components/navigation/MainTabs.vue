<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { MAIN_TABS, findActiveTab } from './mainTabs'

const route = useRoute()

const activeTo = computed(() => findActiveTab(route.path)?.to)
</script>

<template>
  <nav class="main-tabs" aria-label="Main">
    <RouterLink
      v-for="tab in MAIN_TABS"
      :key="tab.to"
      :to="tab.to"
      class="main-tabs__tab"
      :class="{ 'main-tabs__tab--active': activeTo === tab.to }"
      :aria-current="activeTo === tab.to ? 'page' : undefined"
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.main-tabs {
  display: flex;
  gap: var(--spacing-small);
}

.main-tabs__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--shape-controlHeight);
  padding: 0 var(--spacing-small);
  border-bottom: 3px solid transparent;
  color: var(--colors-muted);
  font-size: var(--fonts-label);
  font-weight: 500;
  text-align: center;
  text-decoration: none;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.main-tabs__tab:hover {
  color: var(--colors-text);
}

.main-tabs__tab--active {
  border-bottom-color: var(--colors-primary);
  color: var(--colors-primary);
  font-weight: 600;
}

.main-tabs__tab--active:hover {
  color: var(--colors-primary);
}

@media (max-width: 700px) {
  .main-tabs {
    gap: 0;
  }

  .main-tabs__tab {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 4px;
    line-height: 1.2;
  }
}
</style>
