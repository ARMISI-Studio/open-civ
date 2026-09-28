<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import StructureWorkspace from '@/components/structures/StructureWorkspace.vue'
import { useStructureEditor } from '@/composables/useStructureEditor'
import { useStructures } from '@/composables/useStructures'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { NAME_MAX_LENGTH, createEmptyStructure } from '@/domain/structures'

const props = defineProps<{ structureId?: string }>()

const router = useRouter()
const editor = useStructureEditor()
const api = useStructures()

useUnsavedChangesGuard(editor.isDirty)

/** Validation messages are shown after the first save attempt. */
const attemptedSave = ref(false)
const savedMessage = ref<string | null>(null)

const nameError = computed(() => {
  const local = attemptedSave.value
    ? editor.issues.value.find((i) => i.field === 'name')?.message
    : undefined
  return local ?? api.saveFieldErrors.value.name
})

async function loadRoute(id: string | undefined) {
  // Already showing it, e.g. right after the first save redirected to its URL.
  if (id && id === editor.structure.value.id) return
  savedMessage.value = null
  attemptedSave.value = false
  api.resetSaveStatus()
  if (!id) {
    editor.load(createEmptyStructure())
    return
  }
  editor.load(createEmptyStructure())
  const structure = await api.load(id)
  if (structure && props.structureId === id) editor.load(structure)
}

watch(() => props.structureId, loadRoute)
onMounted(() => loadRoute(props.structureId))

async function save() {
  attemptedSave.value = true
  savedMessage.value = null
  if (!editor.isValid.value) return
  const wasNew = !editor.structure.value.id
  const saved = await api.save(editor.structure.value)
  if (!saved) return
  editor.markSaved(saved)
  attemptedSave.value = false
  savedMessage.value = wasNew ? 'Structure created.' : 'Changes saved.'
  if (wasNew) router.replace(`/structures/${saved.id}`)
}

async function remove() {
  const id = editor.structure.value.id
  if (!id || !window.confirm(`Delete “${editor.structure.value.name}”? This can’t be undone.`))
    return
  if (await api.remove(id)) {
    editor.load(createEmptyStructure())
    router.push('/structures')
  }
}

const isLoading = computed(() => api.loadStatus.value === 'loading')
const showWorkspace = computed(
  () => !isLoading.value && !(props.structureId && api.loadStatus.value === 'error'),
)
const invalidCount = computed(() => editor.issues.value.length)

watch(
  () => editor.isDirty.value,
  (dirty) => {
    if (dirty) savedMessage.value = null
  },
)
</script>

<template>
  <section class="structure-editor">
    <header class="structure-editor__header">
      <div class="structure-editor__title">
        <RouterLink class="structure-editor__back" to="/structures">← All structures</RouterLink>
        <h1>{{ structureId ? 'Edit structure' : 'New structure' }}</h1>
        <p class="structure-editor__subtitle">Draw a 2D structure, then use it in questions.</p>
      </div>
      <div class="structure-editor__actions">
        <UiButton
          v-if="editor.structure.value.id"
          variant="danger"
          :loading="api.deleteStatus.value === 'loading'"
          @click="remove"
        >
          Delete structure
        </UiButton>
        <UiButton
          variant="primary"
          :loading="api.saveStatus.value === 'loading'"
          :disabled="!showWorkspace"
          @click="save"
        >
          {{ api.saveStatus.value === 'loading' ? 'Saving…' : 'Save structure' }}
        </UiButton>
      </div>
    </header>

    <div class="structure-editor__messages">
      <UiStatus v-if="isLoading" tone="loading">Loading structure…</UiStatus>
      <UiStatus v-else-if="api.loadStatus.value === 'error' && structureId" tone="error">
        {{ api.loadError.value }}
        <RouterLink to="/structures">Back to all structures</RouterLink>
      </UiStatus>
      <UiStatus v-if="savedMessage && !editor.isDirty.value" tone="success">{{
        savedMessage
      }}</UiStatus>
      <UiStatus v-if="api.saveStatus.value === 'error'" tone="error">
        Could not save the structure. {{ api.saveError.value }}
      </UiStatus>
      <UiStatus v-if="attemptedSave && invalidCount > 0" tone="error">
        Fix {{ invalidCount }} {{ invalidCount === 1 ? 'problem' : 'problems' }} before saving.
      </UiStatus>
      <UiStatus v-if="api.deleteStatus.value === 'error'" tone="error">
        {{ api.deleteError.value }}
      </UiStatus>
    </div>

    <template v-if="showWorkspace">
      <div class="structure-editor__details">
        <UiField
          v-slot="{ id, describedby, invalid }"
          label="Structure name"
          required
          :error="nameError"
        >
          <UiInput
            :id="id"
            :model-value="editor.structure.value.name"
            :maxlength="NAME_MAX_LENGTH"
            placeholder="e.g. Roof truss"
            autocomplete="off"
            :aria-describedby="describedby"
            :invalid="invalid"
            @update:model-value="editor.updateDetails({ name: $event }, 'name')"
            @blur="editor.endEdit()"
          />
        </UiField>
        <UiField v-slot="{ id, describedby }" label="Description" hint="Optional.">
          <UiInput
            :id="id"
            :model-value="editor.structure.value.description ?? ''"
            maxlength="200"
            autocomplete="off"
            :aria-describedby="describedby"
            @update:model-value="editor.updateDetails({ description: $event }, 'description')"
            @blur="editor.endEdit()"
          />
        </UiField>
      </div>

      <StructureWorkspace :editor="editor" />
    </template>
  </section>
</template>

<style scoped>
.structure-editor {
  display: grid;
  gap: var(--spacing-large);
}

.structure-editor__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-medium);
}

.structure-editor__title {
  display: grid;
  gap: 4px;
}

.structure-editor__back {
  justify-self: start;
  font-size: var(--fonts-label);
}

.structure-editor__subtitle {
  color: var(--colors-muted);
}

.structure-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-small);
}

.structure-editor__messages {
  display: grid;
  gap: var(--spacing-small);
}

.structure-editor__messages:empty {
  display: none;
}

.structure-editor__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-medium);
}

@media (max-width: 900px) {
  .structure-editor__details {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 700px) {
  .structure-editor {
    gap: var(--spacing-medium);
  }

  .structure-editor__actions {
    width: 100%;
  }

  .structure-editor__actions > * {
    flex: 1 1 auto;
  }
}
</style>
