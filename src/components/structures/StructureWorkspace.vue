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
import StructureResults from './StructureResults.vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import type { StructureEditor } from '@/composables/useStructureEditor'
import { UNITS } from '@/domain/structures'
import { type AnalysisResult, analyzeStructure, maxDisplacement } from '@/domain/analysis/frame2d'

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

// --- Load analysis ---------------------------------------------------------------------------
// Results update live while the structure is edited.
const showResults = ref(false)

const analysis = computed<AnalysisResult | null>(() => {
  if (!showResults.value) return null
  // The name doesn't matter for analysis; any other problem does.
  if (e.issues.value.some((i) => i.field !== 'name')) {
    return { status: 'invalid', message: 'Fix the problems listed above to see results.' }
  }
  return analyzeStructure(e.structure.value)
})
const solved = computed(() => (analysis.value?.status === 'solved' ? analysis.value : null))
const largestDisplacement = computed(() =>
  solved.value ? maxDisplacement(e.structure.value, solved.value) : 0,
)

/** Exaggerate displacements so the largest one is drawn at about a tenth of the structure's size. */
const deflectionScale = computed(() => {
  const nodes = e.structure.value.nodes
  if (!solved.value || largestDisplacement.value === 0 || nodes.length === 0) return 0
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1)
  const raw = (0.1 * size) / largestDisplacement.value
  // Round to two significant figures so the stated factor is exact.
  const magnitude = 10 ** Math.floor(Math.log10(raw) - 1)
  return Math.round(raw / magnitude) * magnitude
})

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
        :analysis="solved"
        :deflection-scale="deflectionScale"
        @canvas-click="e.canvasClick"
        @element-click="e.elementClick"
        @node-drag="onDrag"
        @drag-end="e.endEdit"
      />
      <div class="structure-workspace__footer">
        <span role="status" class="structure-workspace__hint">{{ hint }}</span>
        <span class="structure-workspace__footer-end">
          <span>Units: {{ UNITS.length }}, {{ UNITS.force }}</span>
          <UiButton size="small" :aria-pressed="showResults" @click="showResults = !showResults">
            {{ showResults ? 'Hide results' : 'Show results' }}
          </UiButton>
        </span>
      </div>
      <StructureIssues
        class="structure-workspace__issues"
        :issues="e.issues.value"
        @select="e.select"
      />
      <StructureResults
        v-if="analysis"
        :structure="e.structure.value"
        :result="analysis"
        :max-displacement="largestDisplacement"
        :deflection-scale="deflectionScale"
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

.structure-workspace__footer {
  align-items: center;
}

.structure-workspace__footer-end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-medium);
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
