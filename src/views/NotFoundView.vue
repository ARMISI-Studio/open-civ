<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { DEFAULT_ROUTE } from '@/router/routes'
</script>

<template>
  <section class="not-found">
    <h1>Page not found</h1>
    <p class="not-found__text">This page doesn’t exist or the link is incomplete.</p>
    <RouterLink :to="DEFAULT_ROUTE">Go to Structures</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  gap: var(--spacing-medium);
  justify-items: start;
}

.not-found__text {
  color: var(--colors-muted);
}
</style>
