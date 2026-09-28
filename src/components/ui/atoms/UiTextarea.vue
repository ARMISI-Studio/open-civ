<script setup lang="ts">
/** Styled native textarea with the same contract as UiInput. */
defineProps<{
  modelValue?: string
  invalid?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <textarea
    class="ui-textarea"
    :class="{ 'ui-textarea--invalid': invalid }"
    :value="modelValue ?? ''"
    :aria-invalid="invalid || undefined"
    @input="onInput"
  />
</template>

<style scoped>
.ui-textarea {
  display: block;
  width: 100%;
  min-height: calc(var(--shape-controlHeight) * 2);
  padding: var(--spacing-small) var(--control-padding-inline);
  border: var(--border-width) solid var(--colors-inputBorder);
  border-radius: var(--shape-controlRadius);
  background: var(--colors-surface);
  color: var(--colors-text);
  font-size: var(--fonts-body);
  line-height: var(--fonts-lineHeight);
  resize: vertical;
}

.ui-textarea::placeholder {
  color: var(--colors-muted);
  opacity: 0.8;
}

.ui-textarea:disabled {
  opacity: var(--control-disabled-opacity);
  cursor: not-allowed;
}

.ui-textarea--invalid {
  border-color: var(--colors-error);
  box-shadow: inset 0 0 0 1px var(--colors-error);
}
</style>
