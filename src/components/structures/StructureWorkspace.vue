<script setup lang="ts">
/**
 * Tool strip + canvas + properties panel for one StructureEditor. Used by the Structure Editor
 * and, for new structures, inside the Question Builder.
 */
import { computed, onMounted, ref, watch } from 'vue'
import StructureCanvas from './StructureCanvas.vue'
import StructureToolbar from './StructureToolbar.vue'
import StructurePropertiesPanel from './StructurePropertiesPanel.vue'
import StructureIssues from './StructureIssues.vue'
import type { StructureEditor } from '@/composables/useStructureEditor'
import { UNITS } from '@/domain/structures'

const props = defineProps<{ editor: StructureEditor }>()
const e = props.editor

const TOOL_HINTS = {
  select: 'Click an element to select it. Drag nodes to move them.',
  node: 'Click the grid to add a node. Nodes snap to 0.5 m.',
  member: 'Click a start node, then an end node. Keep clicking to chain members. Esc to stop.',
  support: 'Click a node to add a support.',
  load: 'Click a node to add a 10 kN downward load.',
} as const

const hint = computed(() =>
  e.tool.value === 'member' && e.pendingMemberStart.value
    ? 'Now click the end node (or empty grid to create one). Esc to stop.'
    : TOOL_HINTS[e.tool.value],
)

function onDrag(id: string, x: number, y: number, dragId: string) {
  if (e.selection.value?.id !== id) e.select({ kind: 'node', id })
  e.moveNode(id, x, y, `drag:${dragId}`)
}

function isTextEntry(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el?.closest?.('input, textarea, select, [role="combobox"], [contenteditable="true"]')
}

function onKeydown(event: KeyboardEvent) {
  if (isTextEntry(event.target)) return
  const mod = event.ctrlKey || event.metaKey
  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) e.redo()
    else e.undo()
  } else if (mod && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    e.redo()
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    if (e.selection.value) {
      event.preventDefault()
      e.deleteSelected()
    }
  } else if (event.key === 'Escape') {
    e.cancel()
  } else if (e.selectedNode.value && event.key.startsWith('Arrow')) {
    event.preventDefault()
    const node = e.selectedNode.value
    const step = 0.5
    const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0
    const dy = event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0
    e.moveNode(node.id, node.x + dx, node.y + dy, `keys:${node.id}`)
  }
}

// Properties collapse on small screens; they open when something is selected.
const propertiesOpen = ref(true)
onMounted(() => {
  propertiesOpen.value = !window.matchMedia?.('(max-width: 700px)').matches
})
watch(
  () => e.selection.value,
  (selection) => {
    if (selection) propertiesOpen.value = true
  },
)
</script>

<template>
  <div class="structure-workspace" @keydown="onKeydown">
    <StructureToolbar
      class="structure-workspace__tools"
      :tool="e.tool.value"
      :can-undo="e.canUndo.value"
      :can-redo="e.canRedo.value"
      :can-delete="!!e.selection.value"
      @update:tool="e.setTool"
      @undo="e.undo"
      @redo="e.redo"
      @delete="e.deleteSelected"
    />

    <div class="structure-workspace__canvas-panel">
      <StructureCanvas
        :structure="e.structure.value"
        :selection="e.selection.value"
        :tool="e.tool.value"
        :pending-member-start="e.pendingMemberStart.value"
        :issues="e.issues.value"
        @canvas-click="e.canvasClick"
        @element-click="e.elementClick"
        @node-drag="onDrag"
        @drag-end="e.endEdit"
      />
      <div class="structure-workspace__footer">
        <span role="status" class="structure-workspace__hint">{{ hint }}</span>
        <span>Units: {{ UNITS.length }}, {{ UNITS.force }}</span>
      </div>
      <StructureIssues
        class="structure-workspace__issues"
        :issues="e.issues.value"
        @select="e.select"
      />
    </div>

    <details
      class="structure-workspace__properties"
      :open="propertiesOpen"
      @toggle="propertiesOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary class="structure-workspace__properties-summary">Properties</summary>
      <StructurePropertiesPanel :editor="editor" />
    </details>
  </div>
</template>

<style scoped>
.structure-workspace {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) var(--panel-properties-width);
  gap: var(--spacing-medium);
  align-items: start;
}

.structure-workspace__tools {
  padding: var(--spacing-small);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.structure-workspace__canvas-panel {
  display: grid;
  overflow: hidden;
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.structure-workspace__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--spacing-small);
  padding: var(--spacing-small) var(--spacing-medium);
  border-top: var(--border-width) solid var(--colors-border);
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.structure-workspace__issues {
  padding: var(--spacing-small) var(--spacing-medium) var(--spacing-medium);
  border-top: var(--border-width) solid var(--colors-border);
}

.structure-workspace__properties {
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.structure-workspace__properties-summary {
  display: none;
}

@media (max-width: 1000px) {
  .structure-workspace {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .structure-workspace__properties {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .structure-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .structure-workspace__properties {
    padding: var(--spacing-medium);
  }

  .structure-workspace__properties-summary {
    display: list-item;
    min-height: var(--shape-controlHeight);
    padding-top: 10px;
    font-weight: 600;
    cursor: pointer;
  }

  .structure-workspace__properties[open] .structure-workspace__properties-summary {
    margin-bottom: var(--spacing-medium);
  }
}
</style>
