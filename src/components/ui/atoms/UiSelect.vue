<script setup lang="ts">
/**
 * Custom single-select built on the reka-ui Select primitive (combobox trigger + listbox panel).
 * reka-ui is private to this wrapper; callers only see UiSelectOption and v-model.
 */
import { computed, ref } from 'vue'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
  type AcceptableValue,
} from 'reka-ui'

export interface UiSelectOption {
  /** Stable, non-empty value. */
  value: string
  label: string
  description?: string
  /** Short decorative glyph shown before the label. */
  icon?: string
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    options: UiSelectOption[]
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
  }>(),
  { placeholder: 'Select an option', disabled: false, invalid: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

defineSlots<{
  /** Extra presentation for an option. The label stays the option's accessible name. */
  option?(props: { option: UiSelectOption; selected: boolean }): unknown
}>()

const open = ref(false)
const trigger = ref<InstanceType<typeof SelectTrigger> | null>(null)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const isEmpty = computed(() => props.options.length === 0)
const isUnknown = computed(() => props.modelValue !== null && !selected.value)
const isDisabled = computed(() => props.disabled || isEmpty.value)

function onValueChange(value: AcceptableValue | AcceptableValue[]) {
  if (typeof value === 'string' && value !== props.modelValue) emit('update:modelValue', value)
}

// Focus handling after the panel closes:
// - selection or Escape: reka returns focus to the trigger (default);
// - outside pointer: leave focus where the user clicked;
// - Tab / Shift+Tab: continue normal focus navigation from the trigger.
let closeReason: 'outside' | 'tab-forward' | 'tab-back' | null = null

function onPointerDownOutside() {
  closeReason = 'outside'
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  closeReason = event.shiftKey ? 'tab-back' : 'tab-forward'
  open.value = false
}

function onCloseAutoFocus(event: Event) {
  const reason = closeReason
  closeReason = null
  if (reason === 'outside') {
    event.preventDefault()
  } else if (reason === 'tab-forward' || reason === 'tab-back') {
    event.preventDefault()
    const el = trigger.value?.$el as HTMLElement | undefined
    if (el) focusAdjacent(el, reason === 'tab-forward' ? 1 : -1)
  }
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusAdjacent(from: HTMLElement, direction: 1 | -1) {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el === from || (el.getClientRects().length > 0 && !el.closest('.ui-select__panel')),
  )
  const index = candidates.indexOf(from)
  const next = candidates[index + direction]
  ;(next ?? from).focus()
}
</script>

<template>
  <SelectRoot
    v-model:open="open"
    :model-value="modelValue ?? undefined"
    :disabled="isDisabled"
    @update:model-value="onValueChange"
  >
    <SelectTrigger
      ref="trigger"
      v-bind="$attrs"
      class="ui-select"
      :class="{
        'ui-select--invalid': invalid,
        'ui-select--placeholder': !selected,
        'ui-select--unknown': isUnknown,
      }"
      :aria-invalid="invalid || undefined"
    >
      <SelectValue class="ui-select__value" :placeholder="placeholder">
        <template v-if="selected">
          <span v-if="selected.icon" class="ui-select__value-icon" aria-hidden="true">{{
            selected.icon
          }}</span>
          <span class="ui-select__value-label">{{ selected.label }}</span>
        </template>
        <span v-else-if="isEmpty" class="ui-select__value-label">No options available</span>
        <span v-else-if="isUnknown" class="ui-select__value-label"
          >Unavailable option ({{ modelValue }})</span
        >
        <span v-else class="ui-select__value-label">{{ placeholder }}</span>
      </SelectValue>
      <SelectIcon class="ui-select__chevron" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="ui-select__panel"
        position="popper"
        :side-offset="4"
        :collision-padding="8"
        :body-lock="false"
        :disable-outside-pointer-events="false"
        @pointer-down-outside="onPointerDownOutside"
        @close-auto-focus="onCloseAutoFocus"
        @keydown="onPanelKeydown"
      >
        <SelectViewport class="ui-select__viewport">
          <SelectItem
            v-for="option in options"
            :key="option.value"
            class="ui-select__option"
            :value="option.value"
            :disabled="option.disabled"
            :text-value="option.label"
          >
            <span class="ui-select__check" aria-hidden="true">
              <SelectItemIndicator>✓</SelectItemIndicator>
            </span>
            <span v-if="option.icon" class="ui-select__option-icon" aria-hidden="true">{{
              option.icon
            }}</span>
            <span class="ui-select__option-body">
              <SelectItemText class="ui-select__option-label">{{ option.label }}</SelectItemText>
              <slot name="option" :option="option" :selected="option.value === modelValue">
                <span v-if="option.description" class="ui-select__option-description">{{
                  option.description
                }}</span>
              </slot>
            </span>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.ui-select {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-small);
  width: 100%;
  min-height: var(--shape-controlHeight);
  padding: var(--spacing-small) var(--spacing-small) var(--spacing-small)
    var(--control-padding-inline);
  border: var(--border-width) solid var(--colors-inputBorder);
  border-radius: var(--shape-controlRadius);
  background: var(--colors-surface);
  color: var(--colors-text);
  font-size: var(--fonts-body);
  text-align: start;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.ui-select:hover {
  border-color: var(--colors-text);
}

.ui-select[data-state='open'] {
  border-color: var(--colors-primary);
}

.ui-select:disabled {
  opacity: var(--control-disabled-opacity);
  cursor: not-allowed;
}

.ui-select--placeholder {
  color: var(--colors-muted);
}

.ui-select--invalid,
.ui-select--unknown {
  border-color: var(--colors-error);
  box-shadow: inset 0 0 0 1px var(--colors-error);
}

.ui-select__value {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-small);
  min-width: 0;
}

.ui-select__value-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select__chevron {
  display: inline-flex;
  flex: none;
  color: var(--colors-muted);
  transition: transform var(--transition-fast);
}

.ui-select[data-state='open'] .ui-select__chevron {
  transform: rotate(180deg);
}
</style>

<!-- The panel is teleported to <body>; style it globally through theme tokens. -->
<style>
.ui-select__panel {
  z-index: var(--layer-dropdown);
  min-width: var(--reka-select-trigger-width);
  max-width: min(420px, calc(100vw - 16px));
  max-height: min(320px, var(--reka-select-content-available-height));
  overflow: hidden;
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-controlRadius);
  background: var(--colors-surface);
  box-shadow: var(--shadow-floating);
  color: var(--colors-text);
  font-family: var(--fonts-family);
  font-size: var(--fonts-body);
}

.ui-select__viewport {
  padding: 4px;
}

.ui-select__option {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-small);
  min-height: var(--shape-controlHeight);
  padding: var(--spacing-small);
  border-radius: calc(var(--shape-controlRadius) - 2px);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.ui-select__option[data-highlighted] {
  background: var(--colors-selection);
  box-shadow: inset 0 0 0 2px var(--colors-primary);
}

.ui-select__option[data-state='checked'] {
  color: var(--colors-primary);
  font-weight: 600;
}

.ui-select__option[data-disabled] {
  opacity: var(--control-disabled-opacity);
  cursor: not-allowed;
}

.ui-select__check {
  display: inline-flex;
  justify-content: center;
  flex: none;
  width: 1em;
  color: var(--colors-primary);
}

.ui-select__option-icon {
  flex: none;
  width: 1.25em;
  text-align: center;
}

.ui-select__option-body {
  display: grid;
  min-width: 0;
}

.ui-select__option-description {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
  font-weight: 400;
}
</style>
