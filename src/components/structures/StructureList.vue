<script setup lang="ts">
/** Picks one saved structure from the API list, with loading, empty, and error states. */
import { computed } from 'vue'
import UiSelect from '@/components/ui/atoms/UiSelect.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import type { StructureSummary } from '@/domain/structures'
import type { RequestStatus } from '@/composables/useStructures'

const props = withDefaults(
  defineProps<{
    structures: StructureSummary[]
    status: RequestStatus
    error?: string | null
    label?: string
    placeholder?: string
    fieldError?: string
    required?: boolean
  }>(),
  {
    error: null,
    label: 'Saved structures',
    placeholder: 'Choose a saved structure',
    fieldError: undefined,
    required: false,
  },
)

const model = defineModel<string | null>({ required: true })
const emit = defineEmits<{ retry: [] }>()

const options = computed(() =>
  props.structures.map((s) => ({
    value: s.id,
    label: s.name,
    description: s.description || undefined,
  })),
)

const hint = computed(() => {
  if (props.status === 'loading') return 'Loading saved structures…'
  if (props.status === 'success' && props.structures.length === 0) return 'No saved structures yet.'
  return undefined
})
</script>

<template>
  <div class="structure-list">
    <UiField
      v-slot="{ id, describedby, invalid }"
      :label="label"
      :hint="hint"
      :error="status === 'error' ? (error ?? 'Could not load saved structures.') : fieldError"
      :required="required"
    >
      <UiSelect
        :id="id"
        v-model="model"
        :options="options"
        :placeholder="status === 'loading' ? 'Loading…' : placeholder"
        :disabled="status === 'loading'"
        :aria-describedby="describedby"
        :aria-busy="status === 'loading' || undefined"
        :invalid="invalid"
      />
    </UiField>
    <UiButton
      v-if="status === 'error'"
      size="small"
      class="structure-list__retry"
      @click="emit('retry')"
    >
      Try again
    </UiButton>
  </div>
</template>

<style scoped>
.structure-list {
  display: grid;
  gap: var(--spacing-small);
  align-content: start;
}

.structure-list__retry {
  justify-self: start;
}
</style>
