<script setup lang="ts">
/**
 * Numeric property field. Keeps the typed text locally and only reports valid numbers, so
 * partial input such as "-" or "1." never reaches the model.
 */
import { computed, ref, watch } from 'vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'

const props = defineProps<{
  label: string
  modelValue: number
  unit: string
  step?: number
}>()

const emit = defineEmits<{ commit: [value: number]; done: [] }>()

const text = ref(String(props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    if (Number(text.value) !== value || text.value.trim() === '') text.value = String(value)
  },
)

const error = computed(() => {
  if (text.value.trim() === '') return 'Enter a number.'
  return Number.isFinite(Number(text.value)) ? undefined : 'Enter a number.'
})

function onInput(value: string) {
  text.value = value
  const parsed = Number(value)
  if (value.trim() !== '' && Number.isFinite(parsed)) emit('commit', parsed)
}

function onBlur() {
  if (error.value) text.value = String(props.modelValue)
  emit('done')
}
</script>

<template>
  <UiField
    v-slot="{ id, describedby, invalid }"
    class="structure-number-field"
    :label="`${label} (${unit})`"
    :error="error"
  >
    <UiInput
      :id="id"
      :model-value="text"
      type="number"
      inputmode="decimal"
      :step="step ?? 'any'"
      :aria-describedby="describedby"
      :invalid="invalid"
      @update:model-value="onInput"
      @blur="onBlur"
    />
  </UiField>
</template>
