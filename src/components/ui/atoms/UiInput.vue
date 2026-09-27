<script setup lang="ts">
/**
 * Styled native input. Native attributes and listeners fall through to the <input> root.
 * Values stay strings (also for type="number"); forms convert and validate them.
 */
defineProps<{
  modelValue?: string
  invalid?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    class="ui-input"
    :class="{ 'ui-input--invalid': invalid }"
    :value="modelValue ?? ''"
    :aria-invalid="invalid || undefined"
    @input="onInput"
  />
</template>

<style scoped>
.ui-input {
  width: 100%;
  min-height: var(--shape-controlHeight);
  padding: var(--spacing-small) var(--control-padding-inline);
  border: var(--border-width) solid var(--colors-inputBorder);
  border-radius: var(--shape-controlRadius);
  background: var(--colors-surface);
  color: var(--colors-text);
  font-size: var(--fonts-body);
  transition: border-color var(--transition-fast);
}

.ui-input::placeholder {
  color: var(--colors-muted);
  opacity: 0.8;
}

.ui-input:disabled {
  opacity: var(--control-disabled-opacity);
  cursor: not-allowed;
}

.ui-input:read-only {
  background: var(--colors-background);
}

.ui-input--invalid {
  border-color: var(--colors-error);
  box-shadow: inset 0 0 0 1px var(--colors-error);
}
</style>
