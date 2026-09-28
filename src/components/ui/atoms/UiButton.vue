<script setup lang="ts">
export type UiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type UiButtonSize = 'medium' | 'small'

withDefaults(
  defineProps<{
    variant?: UiButtonVariant
    size?: UiButtonSize
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    /** Shows a spinner and blocks repeat activation while keeping the text label. */
    loading?: boolean
  }>(),
  { variant: 'secondary', size: 'medium', type: 'button', disabled: false, loading: false },
)
</script>

<template>
  <button
    :type="type"
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`, { 'ui-button--loading': loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="ui-button__spinner" aria-hidden="true" />
    <span v-else-if="$slots.icon" class="ui-button__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <span class="ui-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-small);
  min-height: var(--shape-controlHeight);
  padding: 0 var(--control-padding-inline);
  border: var(--border-width) solid var(--colors-inputBorder);
  border-radius: var(--shape-controlRadius);
  background: var(--colors-surface);
  color: var(--colors-text);
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.ui-button:hover {
  background: var(--colors-selection);
}

.ui-button:disabled {
  opacity: var(--control-disabled-opacity);
  cursor: not-allowed;
}

.ui-button--loading:disabled {
  cursor: progress;
}

.ui-button--primary {
  background: var(--colors-primary);
  border-color: var(--colors-primary);
  color: var(--colors-onPrimary);
}

.ui-button--primary:hover {
  background: var(--colors-primaryHover);
  border-color: var(--colors-primaryHover);
}

.ui-button--ghost {
  background: transparent;
  border-color: transparent;
}

.ui-button--ghost:hover {
  background: var(--colors-selection);
}

.ui-button--danger {
  border-color: var(--colors-error);
  color: var(--colors-error);
}

.ui-button--danger:hover {
  background: var(--colors-surface);
  box-shadow: inset 0 0 0 1px var(--colors-error);
}

.ui-button--small {
  padding: 0 var(--spacing-small);
  font-size: var(--fonts-label);
}

.ui-button__icon {
  display: inline-flex;
  font-size: 1.1em;
  line-height: 1;
}

.ui-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ui-button-spin 700ms linear infinite;
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-button__spinner {
    animation-duration: 2s;
  }
}
</style>
