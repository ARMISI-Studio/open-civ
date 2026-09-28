<script setup lang="ts">
import UiButton from '@/components/ui/atoms/UiButton.vue'
import type { EditorTool } from '@/composables/useStructureEditor'

defineProps<{
  tool: EditorTool
  canUndo: boolean
  canRedo: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  'update:tool': [tool: EditorTool]
  undo: []
  redo: []
  delete: []
}>()

const TOOLS: { value: EditorTool; label: string; icon: string; hint: string }[] = [
  { value: 'select', label: 'Select', icon: '↖', hint: 'Select and drag elements' },
  { value: 'node', label: 'Node', icon: '⊙', hint: 'Click the grid to add a node' },
  { value: 'member', label: 'Member', icon: '╱', hint: 'Click two nodes to connect them' },
  { value: 'support', label: 'Support', icon: '△', hint: 'Click a node to add a support' },
  { value: 'load', label: 'Load', icon: '↓', hint: 'Click a node to add a load' },
]
</script>

<template>
  <div class="structure-toolbar" role="group" aria-label="Drawing tools">
    <UiButton
      v-for="t in TOOLS"
      :key="t.value"
      size="small"
      class="structure-toolbar__tool"
      :class="{ 'structure-toolbar__tool--active': tool === t.value }"
      :aria-pressed="tool === t.value"
      :title="t.hint"
      @click="emit('update:tool', t.value)"
    >
      <template #icon>{{ t.icon }}</template>
      {{ t.label }}
    </UiButton>
    <span class="structure-toolbar__divider" aria-hidden="true" />
    <UiButton
      size="small"
      variant="ghost"
      :disabled="!canUndo"
      title="Undo (Ctrl+Z)"
      @click="emit('undo')"
    >
      <template #icon>↶</template>
      Undo
    </UiButton>
    <UiButton
      size="small"
      variant="ghost"
      :disabled="!canRedo"
      title="Redo (Ctrl+Shift+Z)"
      @click="emit('redo')"
    >
      <template #icon>↷</template>
      Redo
    </UiButton>
    <UiButton
      size="small"
      variant="danger"
      :disabled="!canDelete"
      title="Delete the selected element (Delete)"
      @click="emit('delete')"
    >
      <template #icon>✕</template>
      Delete
    </UiButton>
  </div>
</template>

<style scoped>
.structure-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
}

.structure-toolbar__tool {
  justify-content: flex-start;
}

.structure-toolbar__tool--active {
  background: var(--colors-selection);
  border-color: var(--colors-primary);
  color: var(--colors-primary);
}

.structure-toolbar__divider {
  height: 1px;
  margin: 4px 0;
  background: var(--colors-border);
}

@media (max-width: 700px) {
  .structure-toolbar {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .structure-toolbar__tool {
    flex: 1 1 auto;
    justify-content: center;
  }

  .structure-toolbar__divider {
    display: none;
  }
}
</style>
