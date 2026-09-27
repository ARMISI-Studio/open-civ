/**
 * 2D structure domain model. Plain typed data: the canvas only renders it, and saving,
 * loading, validation, and edits all operate on these objects.
 *
 * Units: coordinates in metres (x to the right, y up), forces in kilonewtons.
 */

export const UNITS = { length: 'm', force: 'kN' } as const

/** Editing grid: new and dragged nodes snap to this step (m). */
export const GRID_STEP = 0.5

export type SupportType = 'pin' | 'roller' | 'fixed'

export const SUPPORT_TYPES: {
  value: SupportType
  label: string
  icon: string
  description: string
}[] = [
  {
    value: 'pin',
    label: 'Pin',
    icon: '△',
    description: 'Restrains horizontal and vertical movement',
  },
  { value: 'roller', label: 'Roller', icon: '◯', description: 'Restrains vertical movement only' },
  { value: 'fixed', label: 'Fixed', icon: '▮', description: 'Restrains movement and rotation' },
]

export interface StructureNode {
  id: string
  label: string
  x: number
  y: number
}

export interface StructureMember {
  id: string
  startNodeId: string
  endNodeId: string
  label?: string
}

export interface StructureSupport {
  id: string
  nodeId: string
  type: SupportType
}

/** Point load applied at a node, as force components in kN. */
export interface StructureLoad {
  id: string
  nodeId: string
  fx: number
  fy: number
}

export interface Structure {
  id: string
  name: string
  description?: string
  nodes: StructureNode[]
  members: StructureMember[]
  supports: StructureSupport[]
  loads: StructureLoad[]
  metadata?: Record<string, unknown>
}

/** A structure being edited; `id` is absent until the API has created it. */
export type StructureDraft = Omit<Structure, 'id'> & { id?: string }

export interface StructureSummary {
  id: string
  name: string
  description?: string
  updatedAt: string
}

export type ElementKind = 'node' | 'member' | 'support' | 'load'

export interface ElementRef {
  kind: ElementKind
  id: string
}

export interface StructureIssue {
  message: string
  element?: ElementRef
  field?: 'name'
}

export const NAME_MAX_LENGTH = 80

export function createEmptyStructure(): StructureDraft {
  return { name: '', description: '', nodes: [], members: [], supports: [], loads: [] }
}

/** Deep copy. Structures are plain JSON data; this also unwraps reactive proxies. */
export function cloneStructure<T extends StructureDraft>(structure: T): T {
  return JSON.parse(JSON.stringify(structure)) as T
}

export function elementKey(ref: ElementRef): string {
  return `${ref.kind}:${ref.id}`
}

export function snapToGrid(value: number, step = GRID_STEP): number {
  const snapped = Math.round(value / step) * step
  // Avoid -0 and floating-point noise such as 2.5000000000000004.
  return Number(snapped.toFixed(6)) + 0
}

export function findNode(structure: StructureDraft, id: string): StructureNode | undefined {
  return structure.nodes.find((n) => n.id === id)
}

export function memberLength(structure: StructureDraft, member: StructureMember): number | null {
  const a = findNode(structure, member.startNodeId)
  const b = findNode(structure, member.endNodeId)
  if (!a || !b) return null
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function loadMagnitude(load: StructureLoad): number {
  return Math.hypot(load.fx, load.fy)
}

export function formatNumber(value: number, digits = 2): string {
  return String(Number(value.toFixed(digits)))
}

/** Labels A…Z, then AA, AB, … — the first one not already used. */
export function nextNodeLabel(nodes: StructureNode[]): string {
  const used = new Set(nodes.map((n) => n.label))
  for (let i = 0; ; i++) {
    const label = indexToLabel(i)
    if (!used.has(label)) return label
  }
}

function indexToLabel(index: number): string {
  let label = ''
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

/** Next element id with the given prefix (`n1`, `m3`, …), unique within the structure. */
export function nextElementId(prefix: string, existing: { id: string }[]): string {
  let max = 0
  for (const { id } of existing) {
    const match = id.startsWith(prefix) ? /^\d+$/.exec(id.slice(prefix.length)) : null
    if (match) max = Math.max(max, Number(match[0]))
  }
  return `${prefix}${max + 1}`
}

export function describeElement(structure: StructureDraft, ref: ElementRef): string {
  const nodeLabel = (id: string) => findNode(structure, id)?.label ?? '?'
  switch (ref.kind) {
    case 'node':
      return `Node ${nodeLabel(ref.id)}`
    case 'member': {
      const m = structure.members.find((x) => x.id === ref.id)
      return m ? `Member ${nodeLabel(m.startNodeId)}–${nodeLabel(m.endNodeId)}` : 'Member'
    }
    case 'support': {
      const s = structure.supports.find((x) => x.id === ref.id)
      const type = SUPPORT_TYPES.find((t) => t.value === s?.type)?.label ?? 'Support'
      return s ? `${type} support at ${nodeLabel(s.nodeId)}` : 'Support'
    }
    case 'load': {
      const l = structure.loads.find((x) => x.id === ref.id)
      return l ? `Load at ${nodeLabel(l.nodeId)}` : 'Load'
    }
  }
}

/**
 * Checks a structure before it is saved. Returns every problem found; an empty list means valid.
 * Structural stability is not checked (there is no solver).
 */
export function validateStructure(structure: StructureDraft): StructureIssue[] {
  const issues: StructureIssue[] = []
  const name = structure.name.trim()
  if (!name) issues.push({ field: 'name', message: 'Enter a name for the structure.' })
  else if (name.length > NAME_MAX_LENGTH)
    issues.push({
      field: 'name',
      message: `Use at most ${NAME_MAX_LENGTH} characters for the name.`,
    })

  const nodeIds = new Set(structure.nodes.map((n) => n.id))
  const labels = new Map<string, number>()
  const positions = new Map<string, string>()
  for (const node of structure.nodes) {
    const ref: ElementRef = { kind: 'node', id: node.id }
    const label = node.label.trim()
    if (!label) issues.push({ element: ref, message: 'A node has no label.' })
    else labels.set(label, (labels.get(label) ?? 0) + 1)
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      issues.push({ element: ref, message: `Node ${label || '?'} has an invalid position.` })
      continue
    }
    const key = `${formatNumber(node.x, 6)},${formatNumber(node.y, 6)}`
    const other = positions.get(key)
    if (other !== undefined) {
      issues.push({ element: ref, message: `Node ${label} is on top of node ${other}.` })
    } else {
      positions.set(key, label)
    }
  }
  for (const [label, count] of labels) {
    if (count > 1) {
      const node = structure.nodes.find((n) => n.label.trim() === label)!
      issues.push({
        element: { kind: 'node', id: node.id },
        message: `The label ${label} is used by ${count} nodes.`,
      })
    }
  }

  if (structure.members.length === 0) {
    issues.push({ message: 'Add at least one member.' })
  }
  const connected = new Set<string>()
  const pairs = new Set<string>()
  for (const member of structure.members) {
    const ref: ElementRef = { kind: 'member', id: member.id }
    if (!nodeIds.has(member.startNodeId) || !nodeIds.has(member.endNodeId)) {
      issues.push({ element: ref, message: 'A member is missing one of its nodes.' })
      continue
    }
    connected.add(member.startNodeId).add(member.endNodeId)
    const description = describeElement(structure, ref)
    if (member.startNodeId === member.endNodeId || memberLength(structure, member) === 0) {
      issues.push({ element: ref, message: `${description} has zero length.` })
    }
    const pair = [member.startNodeId, member.endNodeId].sort().join('|')
    if (pairs.has(pair)) issues.push({ element: ref, message: `${description} is a duplicate.` })
    pairs.add(pair)
  }
  for (const node of structure.nodes) {
    if (!connected.has(node.id) && structure.members.length > 0) {
      issues.push({
        element: { kind: 'node', id: node.id },
        message: `Node ${node.label || '?'} is not connected to any member.`,
      })
    }
  }

  const supported = new Set<string>()
  for (const support of structure.supports) {
    const ref: ElementRef = { kind: 'support', id: support.id }
    if (!nodeIds.has(support.nodeId)) {
      issues.push({ element: ref, message: 'A support is attached to a missing node.' })
      continue
    }
    if (!SUPPORT_TYPES.some((t) => t.value === support.type)) {
      issues.push({
        element: ref,
        message: `${describeElement(structure, ref)} has an unknown type.`,
      })
    }
    if (supported.has(support.nodeId)) {
      issues.push({
        element: ref,
        message: `Node ${findNode(structure, support.nodeId)?.label} has more than one support.`,
      })
    }
    supported.add(support.nodeId)
  }

  for (const load of structure.loads) {
    const ref: ElementRef = { kind: 'load', id: load.id }
    if (!nodeIds.has(load.nodeId)) {
      issues.push({ element: ref, message: 'A load is applied to a missing node.' })
      continue
    }
    if (!Number.isFinite(load.fx) || !Number.isFinite(load.fy)) {
      issues.push({
        element: ref,
        message: `${describeElement(structure, ref)} has an invalid force.`,
      })
    } else if (loadMagnitude(load) === 0) {
      issues.push({ element: ref, message: `${describeElement(structure, ref)} has zero force.` })
    }
  }

  return issues
}
