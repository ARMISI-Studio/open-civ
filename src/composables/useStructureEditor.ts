import { computed, ref, shallowRef } from 'vue'
import {
  type ElementRef,
  type StructureDraft,
  type StructureLoad,
  type StructureMember,
  type StructureNode,
  type StructureSupport,
  type SupportType,
  cloneStructure,
  createEmptyStructure,
  elementKey,
  nextElementId,
  nextNodeLabel,
  snapToGrid,
  validateStructure,
} from '@/domain/structures'

export type EditorTool = 'select' | 'node' | 'member' | 'support' | 'load'

export const DEFAULT_LOAD: Pick<StructureLoad, 'fx' | 'fy'> = { fx: 0, fy: -10 }

const HISTORY_LIMIT = 100

/**
 * Editing state for one structure. Every change goes through `change()`, which records an undo
 * snapshot; consecutive edits with the same `coalesce` key (typing in one field, one drag)
 * share a single undo step.
 */
export function useStructureEditor(initial: StructureDraft = createEmptyStructure()) {
  const structure = ref<StructureDraft>(cloneStructure(initial))
  const selection = ref<ElementRef | null>(null)
  const tool = ref<EditorTool>('select')
  /** First node picked with the member tool, waiting for the second. */
  const pendingMemberStart = ref<string | null>(null)

  const past = shallowRef<StructureDraft[]>([])
  const future = shallowRef<StructureDraft[]>([])
  let lastCoalesceKey: string | null = null
  const savedSnapshot = ref(JSON.stringify(structure.value))

  const issues = computed(() => validateStructure(structure.value))
  const invalidKeys = computed(
    () => new Set(issues.value.flatMap((i) => (i.element ? [elementKey(i.element)] : []))),
  )
  const isValid = computed(() => issues.value.length === 0)
  const isDirty = computed(() => JSON.stringify(structure.value) !== savedSnapshot.value)
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  const selectedNode = computed(() =>
    selection.value?.kind === 'node' ? find(structure.value.nodes, selection.value.id) : undefined,
  )
  const selectedMember = computed(() =>
    selection.value?.kind === 'member'
      ? find(structure.value.members, selection.value.id)
      : undefined,
  )
  const selectedSupport = computed(() =>
    selection.value?.kind === 'support'
      ? find(structure.value.supports, selection.value.id)
      : undefined,
  )
  const selectedLoad = computed(() =>
    selection.value?.kind === 'load' ? find(structure.value.loads, selection.value.id) : undefined,
  )

  function find<T extends { id: string }>(list: T[], id: string): T | undefined {
    return list.find((x) => x.id === id)
  }

  function change(mutate: (draft: StructureDraft) => void, coalesce?: string) {
    if (!coalesce || coalesce !== lastCoalesceKey) {
      past.value = [...past.value, cloneStructure(structure.value)].slice(-HISTORY_LIMIT)
    }
    future.value = []
    lastCoalesceKey = coalesce ?? null
    mutate(structure.value)
  }

  /** Ends the current coalesced edit so the next change starts a new undo step. */
  function endEdit() {
    lastCoalesceKey = null
  }

  function undo() {
    const previous = past.value[past.value.length - 1]
    if (!previous) return
    past.value = past.value.slice(0, -1)
    future.value = [...future.value, cloneStructure(structure.value)]
    structure.value = previous
    lastCoalesceKey = null
    pruneSelection()
  }

  function redo() {
    const next = future.value[future.value.length - 1]
    if (!next) return
    future.value = future.value.slice(0, -1)
    past.value = [...past.value, cloneStructure(structure.value)]
    structure.value = next
    lastCoalesceKey = null
    pruneSelection()
  }

  function pruneSelection() {
    if (selection.value && !elementExists(selection.value)) selection.value = null
    if (pendingMemberStart.value && !find(structure.value.nodes, pendingMemberStart.value)) {
      pendingMemberStart.value = null
    }
  }

  function elementExists(ref: ElementRef): boolean {
    const s = structure.value
    const list = { node: s.nodes, member: s.members, support: s.supports, load: s.loads }[ref.kind]
    return list.some((x) => x.id === ref.id)
  }

  /** Replaces the whole structure (after loading or saving) and clears history. */
  function load(next: StructureDraft) {
    structure.value = cloneStructure(next)
    savedSnapshot.value = JSON.stringify(structure.value)
    past.value = []
    future.value = []
    lastCoalesceKey = null
    selection.value = null
    pendingMemberStart.value = null
  }

  function markSaved(saved: StructureDraft) {
    // Keep history so the user can still undo after saving.
    structure.value = cloneStructure(saved)
    savedSnapshot.value = JSON.stringify(structure.value)
    lastCoalesceKey = null
  }

  function select(ref: ElementRef | null) {
    selection.value = ref && elementExists(ref) ? ref : null
  }

  function setTool(next: EditorTool) {
    tool.value = next
    pendingMemberStart.value = null
  }

  function cancel() {
    if (pendingMemberStart.value) pendingMemberStart.value = null
    else selection.value = null
  }

  function nodeAt(x: number, y: number): StructureNode | undefined {
    return structure.value.nodes.find((n) => n.x === x && n.y === y)
  }

  function addNode(x: number, y: number): StructureNode {
    const sx = snapToGrid(x)
    const sy = snapToGrid(y)
    const existing = nodeAt(sx, sy)
    if (existing) return existing
    const node: StructureNode = {
      id: nextElementId('n', structure.value.nodes),
      label: nextNodeLabel(structure.value.nodes),
      x: sx,
      y: sy,
    }
    change((s) => s.nodes.push(node))
    return node
  }

  function addMember(startNodeId: string, endNodeId: string): StructureMember | null {
    if (startNodeId === endNodeId) return null
    const s = structure.value
    if (!find(s.nodes, startNodeId) || !find(s.nodes, endNodeId)) return null
    const duplicate = s.members.find(
      (m) =>
        (m.startNodeId === startNodeId && m.endNodeId === endNodeId) ||
        (m.startNodeId === endNodeId && m.endNodeId === startNodeId),
    )
    if (duplicate) return duplicate
    const member: StructureMember = { id: nextElementId('m', s.members), startNodeId, endNodeId }
    change((draft) => draft.members.push(member))
    return member
  }

  function addSupport(nodeId: string, type: SupportType = 'pin'): StructureSupport | null {
    const s = structure.value
    if (!find(s.nodes, nodeId)) return null
    const existing = s.supports.find((x) => x.nodeId === nodeId)
    if (existing) return existing
    const support: StructureSupport = { id: nextElementId('s', s.supports), nodeId, type }
    change((draft) => draft.supports.push(support))
    return support
  }

  function addLoad(nodeId: string, force = DEFAULT_LOAD): StructureLoad | null {
    const s = structure.value
    if (!find(s.nodes, nodeId)) return null
    const load: StructureLoad = { id: nextElementId('l', s.loads), nodeId, ...force }
    change((draft) => draft.loads.push(load))
    return load
  }

  /** Canvas background click at world coordinates (m). */
  function canvasClick(x: number, y: number) {
    switch (tool.value) {
      case 'node': {
        const node = addNode(x, y)
        selection.value = { kind: 'node', id: node.id }
        break
      }
      case 'member': {
        // Clicking empty space with the member tool creates a node there and uses it.
        const node = addNode(x, y)
        pickNodeForMember(node.id)
        break
      }
      default:
        if (pendingMemberStart.value) pendingMemberStart.value = null
        else selection.value = null
    }
  }

  function pickNodeForMember(nodeId: string) {
    const start = pendingMemberStart.value
    if (!start) {
      pendingMemberStart.value = nodeId
      return
    }
    if (start === nodeId) {
      pendingMemberStart.value = null
      return
    }
    const member = addMember(start, nodeId)
    // Chain: the end node becomes the start of the next member.
    pendingMemberStart.value = nodeId
    if (member) selection.value = { kind: 'member', id: member.id }
  }

  /** Click on an existing element; what happens depends on the active tool. */
  function elementClick(ref: ElementRef) {
    const nodeId = ref.kind === 'node' ? ref.id : null
    switch (tool.value) {
      case 'member':
        if (nodeId) pickNodeForMember(nodeId)
        else select(ref)
        break
      case 'support':
        if (nodeId) {
          const support = addSupport(nodeId)
          if (support) selection.value = { kind: 'support', id: support.id }
        } else select(ref)
        break
      case 'load':
        if (nodeId) {
          const load = addLoad(nodeId)
          if (load) selection.value = { kind: 'load', id: load.id }
        } else select(ref)
        break
      default:
        select(ref)
    }
  }

  function moveNode(id: string, x: number, y: number, coalesce?: string) {
    const node = find(structure.value.nodes, id)
    if (!node) return
    const sx = snapToGrid(x)
    const sy = snapToGrid(y)
    if (node.x === sx && node.y === sy) return
    change((s) => {
      const target = find(s.nodes, id)!
      target.x = sx
      target.y = sy
    }, coalesce)
  }

  function updateNode(id: string, patch: Partial<Omit<StructureNode, 'id'>>, coalesce?: string) {
    if (!find(structure.value.nodes, id)) return
    change((s) => Object.assign(find(s.nodes, id)!, patch), coalesce)
  }

  function updateMember(id: string, patch: Pick<StructureMember, 'label'>, coalesce?: string) {
    if (!find(structure.value.members, id)) return
    change((s) => Object.assign(find(s.members, id)!, patch), coalesce)
  }

  function updateSupport(id: string, patch: Pick<StructureSupport, 'type'>) {
    if (!find(structure.value.supports, id)) return
    change((s) => Object.assign(find(s.supports, id)!, patch))
  }

  function updateLoad(
    id: string,
    patch: Partial<Pick<StructureLoad, 'fx' | 'fy'>>,
    coalesce?: string,
  ) {
    if (!find(structure.value.loads, id)) return
    change((s) => Object.assign(find(s.loads, id)!, patch), coalesce)
  }

  function updateDetails(
    patch: Partial<Pick<StructureDraft, 'name' | 'description'>>,
    coalesce?: string,
  ) {
    change((s) => Object.assign(s, patch), coalesce)
  }

  /** Deletes an element; deleting a node also removes its members, supports, and loads. */
  function remove(ref: ElementRef) {
    if (!elementExists(ref)) return
    change((s) => {
      switch (ref.kind) {
        case 'node':
          s.nodes = s.nodes.filter((n) => n.id !== ref.id)
          s.members = s.members.filter((m) => m.startNodeId !== ref.id && m.endNodeId !== ref.id)
          s.supports = s.supports.filter((x) => x.nodeId !== ref.id)
          s.loads = s.loads.filter((x) => x.nodeId !== ref.id)
          break
        case 'member':
          s.members = s.members.filter((m) => m.id !== ref.id)
          break
        case 'support':
          s.supports = s.supports.filter((x) => x.id !== ref.id)
          break
        case 'load':
          s.loads = s.loads.filter((x) => x.id !== ref.id)
          break
      }
    })
    pruneSelection()
  }

  function deleteSelected() {
    if (selection.value) remove(selection.value)
  }

  return {
    structure,
    selection,
    tool,
    pendingMemberStart,
    issues,
    invalidKeys,
    isValid,
    isDirty,
    canUndo,
    canRedo,
    selectedNode,
    selectedMember,
    selectedSupport,
    selectedLoad,
    load,
    markSaved,
    select,
    setTool,
    cancel,
    canvasClick,
    elementClick,
    addNode,
    addMember,
    addSupport,
    addLoad,
    moveNode,
    updateNode,
    updateMember,
    updateSupport,
    updateLoad,
    updateDetails,
    remove,
    deleteSelected,
    undo,
    redo,
    endEdit,
  }
}

export type StructureEditor = ReturnType<typeof useStructureEditor>
