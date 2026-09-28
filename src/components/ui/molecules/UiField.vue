<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'
import UiLabel from '../atoms/UiLabel.vue'

const props = defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
}>()

defineSlots<{
  default(props: { id: string; describedby: string | undefined; invalid: boolean }): unknown
  label?(): unknown
  hint?(): unknown
  error?(): unknown
}>()

const slots = useSlots()
const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`

const hasHint = computed(() => !!props.hint || !!slots.hint)
const hasError = computed(() => !!props.error || !!slots.error)
const describedby = computed(
  () =>
    [hasHint.value ? hintId : null, hasError.value ? errorId : null].filter(Boolean).join(' ') ||
    undefined,
)
</script>

<template>
  <div class="ui-field" :class="{ 'ui-field--invalid': hasError }">
    <UiLabel class="ui-field__label" :for="id" :required="required">
      <slot name="label">{{ label }}</slot>
    </UiLabel>
    <slot :id="id" :describedby="describedby" :invalid="hasError" />
    <p v-if="hasHint" :id="hintId" class="ui-field__hint">
      <slot name="hint">{{ hint }}</slot>
    </p>
    <p v-if="hasError" :id="errorId" class="ui-field__error">
      <span class="ui-field__error-icon" aria-hidden="true">!</span>
      <span
        ><slot name="error">{{ error }}</slot></span
      >
    </p>
  </div>
</template>

<style scoped>
.ui-field {
  display: grid;
  gap: var(--spacing-small);
  align-content: start;
  min-width: 0;
}

.ui-field__hint {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.ui-field__error {
  display: flex;
  gap: var(--spacing-small);
  align-items: baseline;
  color: var(--colors-error);
  font-size: var(--fonts-label);
}

.ui-field__error-icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--colors-error);
  color: var(--colors-onPrimary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
</style>
