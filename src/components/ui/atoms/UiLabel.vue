<script setup lang="ts">
defineProps<{ required?: boolean }>()
</script>

<template>
  <label class="ui-label">
    <slot />
    <template v-if="required">
      <span class="ui-label__required" aria-hidden="true">*</span>
      <span class="visually-hidden">(required)</span>
    </template>
  </label>
</template>

<style scoped>
.ui-label {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  color: var(--colors-text);
  font-size: var(--fonts-label);
  font-weight: 500;
}

.ui-label__required {
  color: var(--colors-error);
}
</style>
