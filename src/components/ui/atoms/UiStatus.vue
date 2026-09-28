<script setup lang="ts">
/**
 * Compact feedback message placed near the action it reports on. The tone is conveyed by an
 * icon and a text label as well as color. Errors are announced assertively, others politely.
 */
import { computed } from 'vue'

export type UiStatusTone = 'info' | 'loading' | 'success' | 'warning' | 'error'

const props = withDefaults(defineProps<{ tone?: UiStatusTone }>(), { tone: 'info' })

const ICONS: Record<Exclude<UiStatusTone, 'loading'>, string> = {
  info: 'i',
  success: '✓',
  warning: '△',
  error: '!',
}

const LABELS: Record<UiStatusTone, string> = {
  info: 'Note:',
  loading: 'Working:',
  success: 'Success:',
  warning: 'Warning:',
  error: 'Error:',
}

const role = computed(() => (props.tone === 'error' ? 'alert' : 'status'))
</script>

<template>
  <p class="ui-status" :class="`ui-status--${tone}`" :role="role">
    <span v-if="tone === 'loading'" class="ui-status__spinner" aria-hidden="true" />
    <span v-else class="ui-status__icon" aria-hidden="true">{{ ICONS[tone] }}</span>
    <span class="visually-hidden">{{ LABELS[tone] }}</span>
    <span class="ui-status__text"><slot /></span>
  </p>
</template>

<style scoped>
.ui-status {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-small);
  padding: var(--spacing-small) var(--spacing-medium);
  border-left: 3px solid currentColor;
  background: var(--colors-surface);
  font-size: var(--fonts-label);
}

.ui-status--info,
.ui-status--loading {
  color: var(--colors-muted);
}

.ui-status--success {
  color: var(--colors-success);
}

.ui-status--warning {
  color: var(--colors-warning);
}

.ui-status--error {
  color: var(--colors-error);
}

.ui-status__icon {
  flex: none;
  font-weight: 700;
}

.ui-status__text {
  color: var(--colors-text);
}

.ui-status--success .ui-status__text,
.ui-status--warning .ui-status__text,
.ui-status--error .ui-status__text {
  color: inherit;
}

.ui-status__spinner {
  flex: none;
  align-self: center;
  width: 0.9em;
  height: 0.9em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ui-status-spin 700ms linear infinite;
}

@keyframes ui-status-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-status__spinner {
    animation-duration: 2s;
  }
}
</style>
