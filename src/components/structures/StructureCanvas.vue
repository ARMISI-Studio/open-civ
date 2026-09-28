<script setup lang="ts">
/**
 * Renders a structure model as SVG. It never owns data: interactions are emitted as events
 * in world coordinates (metres, y up) and the parent updates the model.
 */
import { computed, ref, useId } from 'vue'
import {
  type ElementRef,
  type StructureDraft,
  type StructureIssue,
  type StructureLoad,
  type SupportType,
  UNITS,
  describeElement,
  elementKey,
  formatNumber,
  loadMagnitude,
  memberLength,
} from '@/domain/structures'
import type { EditorTool } from '@/composables/useStructureEditor'

const props = withDefaults(
  defineProps<{
    structure: StructureDraft
    selection?: ElementRef | null
    tool?: EditorTool
    pendingMemberStart?: string | null
    issues?: StructureIssue[]
    readonly?: boolean
    /** Accessible description of the drawing. */
    label?: string
  }>(),
  {
    selection: null,
    tool: 'select',
    pendingMemberStart: null,
    issues: () => [],
    readonly: false,
    label: undefined,
  },
)

const emit = defineEmits<{
  'canvas-click': [x: number, y: number]
  'element-click': [ref: ElementRef]
  'node-drag': [id: string, x: number, y: number, dragId: string]
  'drag-end': []
}>()

/** SVG user units per metre. */
const SCALE = 60
const PADDING = 1
const LOAD_ARROW = 70

const uid = useId()
const gridId = `${uid}-grid`
const arrowId = `${uid}-arrow`
const svg = ref<SVGSVGElement | null>(null)

const nodesById = computed(() => new Map(props.structure.nodes.map((n) => [n.id, n])))

/** Distance (m) from a node to the far end of its load arrow, including the label. */
const LOAD_REACH = (10 + LOAD_ARROW + 40) / SCALE

const bounds = computed(() => {
  const xs = props.structure.nodes.map((n) => n.x)
  const ys = props.structure.nodes.map((n) => n.y)
  // Keep load arrows and their labels inside the drawing.
  for (const load of props.structure.loads) {
    const node = nodesById.value.get(load.nodeId)
    const magnitude = loadMagnitude(load)
    if (!node) continue
    const ux = magnitude === 0 ? 0 : load.fx / magnitude
    const uy = magnitude === 0 ? -1 : load.fy / magnitude
    xs.push(node.x - ux * LOAD_REACH)
    ys.push(node.y - uy * LOAD_REACH)
  }
  // Editing keeps a comfortable minimum area; previews fit the structure.
  const base = props.readonly
    ? { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    : { minX: -1, maxX: 9, minY: -2, maxY: 4 }
  return {
    minX: Math.min(base.minX, ...xs) - (props.readonly ? PADDING : 0),
    maxX: Math.max(base.maxX, ...xs) + (props.readonly ? PADDING : 0),
    minY: Math.min(base.minY, ...ys) - (props.readonly ? PADDING : 0),
    maxY: Math.max(base.maxY, ...ys) + (props.readonly ? PADDING : 0),
  }
})

const viewBox = computed(() => {
  const b = bounds.value
  return {
    x: b.minX * SCALE,
    y: -b.maxY * SCALE,
    width: (b.maxX - b.minX) * SCALE,
    height: (b.maxY - b.minY) * SCALE,
  }
})

const sx = (x: number) => x * SCALE
const sy = (y: number) => -y * SCALE

const issuesByKey = computed(() => {
  const map = new Map<string, string[]>()
  for (const issue of props.issues) {
    if (!issue.element) continue
    const key = elementKey(issue.element)
    map.set(key, [...(map.get(key) ?? []), issue.message])
  }
  return map
})

function isSelected(ref: ElementRef) {
  return props.selection?.kind === ref.kind && props.selection.id === ref.id
}

function isInvalid(ref: ElementRef) {
  return issuesByKey.value.has(elementKey(ref))
}

function elementLabel(ref: ElementRef) {
  const base = describeElement(props.structure, ref)
  switch (ref.kind) {
    case 'node': {
      const n = nodesById.value.get(ref.id)
      return n ? `${base} at (${formatNumber(n.x)}, ${formatNumber(n.y)}) ${UNITS.length}` : base
    }
    case 'member': {
      const m = props.structure.members.find((x) => x.id === ref.id)
      const length = m ? memberLength(props.structure, m) : null
      return length === null ? base : `${base}, ${formatNumber(length)} ${UNITS.length}`
    }
    case 'load': {
      const l = props.structure.loads.find((x) => x.id === ref.id)
      return l ? `${base}, ${formatNumber(loadMagnitude(l))} ${UNITS.force}` : base
    }
    default:
      return base
  }
}

/** A rectangle around a segment, so thin or axis-aligned lines still have a real hit area. */
function hitPolygon(x1: number, y1: number, x2: number, y2: number, half = 10) {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1
  const nx = (-(y2 - y1) / length) * half
  const ny = ((x2 - x1) / length) * half
  return [
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
  ]
    .map((p) => p.join(','))
    .join(' ')
}

const members = computed(() =>
  props.structure.members.flatMap((m) => {
    const a = nodesById.value.get(m.startNodeId)
    const b = nodesById.value.get(m.endNodeId)
    if (!a || !b) return []
    const ref: ElementRef = { kind: 'member', id: m.id }
    return [{ ref, member: m, x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y) }]
  }),
)

const supports = computed(() =>
  props.structure.supports.flatMap((s) => {
    const n = nodesById.value.get(s.nodeId)
    if (!n) return []
    return [
      { ref: { kind: 'support', id: s.id } as ElementRef, type: s.type, x: sx(n.x), y: sy(n.y) },
    ]
  }),
)

const SUPPORT_PATHS: Record<SupportType, string> = {
  pin: 'M0 8 L-13 30 H13 Z M-20 34 H20',
  roller: 'M0 8 L-13 26 H13 Z M-20 40 H20',
  fixed: 'M-20 10 H20 M-16 10 l-8 10 M-6 10 l-8 10 M4 10 l-8 10 M14 10 l-8 10',
}

function loadGeometry(load: StructureLoad) {
  const n = nodesById.value.get(load.nodeId)
  const magnitude = loadMagnitude(load)
  if (!n) return null
  // Direction in SVG space (y down). Zero-force loads are drawn pointing down.
  const ux = magnitude === 0 ? 0 : load.fx / magnitude
  const uy = magnitude === 0 ? 1 : -load.fy / magnitude
  const tipX = sx(n.x) - ux * 10
  const tipY = sy(n.y) - uy * 10
  const tailX = tipX - ux * LOAD_ARROW
  const tailY = tipY - uy * LOAD_ARROW
  return {
    tipX,
    tipY,
    tailX,
    tailY,
    textX: tailX - ux * 8 + (Math.abs(uy) > 0.5 ? 8 : 0),
    textY: tailY - uy * 8 + (Math.abs(ux) > 0.5 ? -8 : 4),
    text: `${formatNumber(magnitude)} ${UNITS.force}`,
  }
}

const loads = computed(() =>
  props.structure.loads.flatMap((l) => {
    const geometry = loadGeometry(l)
    return geometry ? [{ ref: { kind: 'load', id: l.id } as ElementRef, ...geometry }] : []
  }),
)

const nodes = computed(() =>
  props.structure.nodes.map((n) => ({
    ref: { kind: 'node', id: n.id } as ElementRef,
    node: n,
    x: sx(n.x),
    y: sy(n.y),
  })),
)

const isEmpty = computed(() => props.structure.nodes.length === 0)

// --- Pointer interaction -----------------------------------------------------------------

const pointer = ref<{ x: number; y: number } | null>(null)
let drag: {
  nodeId: string
  id: string
  pointerId: number
  startX: number
  startY: number
  moved: boolean
} | null = null
let suppressClick = false

function toWorld(event: MouseEvent): { x: number; y: number } | null {
  const ctm = svg.value?.getScreenCTM()
  if (!ctm) return null
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse())
  return { x: p.x / SCALE, y: -p.y / SCALE }
}

function onBackgroundClick(event: MouseEvent) {
  if (props.readonly) return
  const world = toWorld(event)
  if (world) emit('canvas-click', world.x, world.y)
}

function onElementClick(ref: ElementRef) {
  if (props.readonly) return
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('element-click', ref)
}

function onNodePointerDown(event: PointerEvent, nodeId: string) {
  if (props.readonly || props.tool !== 'select' || event.button !== 0) return
  drag = {
    nodeId,
    id: `${nodeId}-${event.timeStamp}`,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  }
}

function onPointerMove(event: PointerEvent) {
  if (props.readonly) return
  if (props.tool === 'member' && props.pendingMemberStart) pointer.value = toWorld(event)
  if (!drag) return
  if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4)
    return
  if (!drag.moved) {
    // Capture only once a drag starts, so a plain click still reaches the node.
    drag.moved = true
    svg.value?.setPointerCapture?.(drag.pointerId)
  }
  const world = toWorld(event)
  if (world) emit('node-drag', drag.nodeId, world.x, world.y, drag.id)
}

function onPointerUp(event: PointerEvent) {
  if (!drag) return
  if (drag.moved) {
    suppressClick = true
    emit('drag-end')
    // The click that follows a drag lands on the node or the background; ignore it once.
    setTimeout(() => (suppressClick = false), 0)
  }
  drag = null
  if (svg.value?.hasPointerCapture?.(event.pointerId))
    svg.value.releasePointerCapture(event.pointerId)
}

const pendingLine = computed(() => {
  if (props.tool !== 'member' || !props.pendingMemberStart || !pointer.value) return null
  const start = nodesById.value.get(props.pendingMemberStart)
  if (!start) return null
  return { x1: sx(start.x), y1: sy(start.y), x2: sx(pointer.value.x), y2: sy(pointer.value.y) }
})

function onElementKeydown(event: KeyboardEvent, ref: ElementRef) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onElementClick(ref)
  }
}

function onBackgroundClickGuarded(event: MouseEvent) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  onBackgroundClick(event)
}

defineExpose({ svg, SCALE })
</script>

<template>
  <svg
    ref="svg"
    class="structure-canvas"
    :class="[`structure-canvas--tool-${tool}`, { 'structure-canvas--readonly': readonly }]"
    :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
    role="group"
    :tabindex="readonly ? undefined : 0"
    :aria-label="
      label ?? (readonly ? `Diagram of ${structure.name || 'the structure'}` : 'Structure drawing')
    "
    :data-scale="SCALE"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="pointer = null"
  >
    <defs>
      <pattern
        :id="gridId"
        :width="SCALE"
        :height="SCALE"
        patternUnits="userSpaceOnUse"
        x="0"
        y="0"
      >
        <path class="structure-canvas__grid-line" :d="`M ${SCALE} 0 L 0 0 0 ${SCALE}`" />
      </pattern>
      <marker
        :id="arrowId"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path class="structure-canvas__arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
      </marker>
    </defs>

    <rect
      class="structure-canvas__background"
      :x="viewBox.x"
      :y="viewBox.y"
      :width="viewBox.width"
      :height="viewBox.height"
      :fill="`url(#${gridId})`"
      data-testid="canvas-background"
      @click="onBackgroundClickGuarded"
    />
    <g class="structure-canvas__axes" aria-hidden="true">
      <line :x1="viewBox.x" y1="0" :x2="viewBox.x + viewBox.width" y2="0" />
      <line x1="0" :y1="viewBox.y" x2="0" :y2="viewBox.y + viewBox.height" />
    </g>

    <text
      v-if="isEmpty && !readonly"
      class="structure-canvas__empty"
      :x="viewBox.x + viewBox.width / 2"
      :y="viewBox.y + viewBox.height / 2"
      text-anchor="middle"
    >
      Choose the Node tool and click the grid to start
    </text>

    <g
      v-for="m in members"
      :key="m.ref.id"
      class="structure-canvas__member"
      :class="{
        'structure-canvas__member--selected': isSelected(m.ref),
        'structure-canvas__member--invalid': isInvalid(m.ref),
      }"
      :role="readonly ? undefined : 'button'"
      :tabindex="readonly ? undefined : 0"
      :aria-label="elementLabel(m.ref)"
      :aria-pressed="readonly ? undefined : isSelected(m.ref)"
      data-kind="member"
      :data-id="m.ref.id"
      @click.stop="onElementClick(m.ref)"
      @keydown="onElementKeydown($event, m.ref)"
    >
      <polygon class="structure-canvas__hit" :points="hitPolygon(m.x1, m.y1, m.x2, m.y2)" />
      <line class="structure-canvas__member-line" :x1="m.x1" :y1="m.y1" :x2="m.x2" :y2="m.y2" />
      <template v-if="isSelected(m.ref)">
        <rect class="structure-canvas__handle" :x="m.x1 - 5" :y="m.y1 - 5" width="10" height="10" />
        <rect class="structure-canvas__handle" :x="m.x2 - 5" :y="m.y2 - 5" width="10" height="10" />
      </template>
      <text
        v-if="m.member.label"
        class="structure-canvas__member-label"
        :x="(m.x1 + m.x2) / 2"
        :y="(m.y1 + m.y2) / 2 - 10"
        text-anchor="middle"
      >
        {{ m.member.label }}
      </text>
      <g
        v-if="isInvalid(m.ref)"
        class="structure-canvas__marker"
        :transform="`translate(${(m.x1 + m.x2) / 2} ${(m.y1 + m.y2) / 2 + 18})`"
      >
        <title>{{ issuesByKey.get(`member:${m.ref.id}`)?.join(' ') }}</title>
        <circle r="9" />
        <text y="4" text-anchor="middle">!</text>
      </g>
    </g>

    <line v-if="pendingLine" class="structure-canvas__pending" v-bind="pendingLine" />

    <g
      v-for="s in supports"
      :key="s.ref.id"
      class="structure-canvas__support"
      :class="{
        'structure-canvas__support--selected': isSelected(s.ref),
        'structure-canvas__support--invalid': isInvalid(s.ref),
      }"
      :transform="`translate(${s.x} ${s.y})`"
      :role="readonly ? undefined : 'button'"
      :tabindex="readonly ? undefined : 0"
      :aria-label="elementLabel(s.ref)"
      :aria-pressed="readonly ? undefined : isSelected(s.ref)"
      data-kind="support"
      :data-id="s.ref.id"
      :data-type="s.type"
      @click.stop="onElementClick(s.ref)"
      @keydown="onElementKeydown($event, s.ref)"
    >
      <rect class="structure-canvas__hit-area" x="-22" y="6" width="44" height="38" />
      <path class="structure-canvas__support-shape" :d="SUPPORT_PATHS[s.type]" />
      <template v-if="s.type === 'roller'">
        <circle class="structure-canvas__support-shape" cx="-7" cy="32" r="5" />
        <circle class="structure-canvas__support-shape" cx="7" cy="32" r="5" />
      </template>
    </g>

    <g
      v-for="l in loads"
      :key="l.ref.id"
      class="structure-canvas__load"
      :class="{
        'structure-canvas__load--selected': isSelected(l.ref),
        'structure-canvas__load--invalid': isInvalid(l.ref),
      }"
      :role="readonly ? undefined : 'button'"
      :tabindex="readonly ? undefined : 0"
      :aria-label="elementLabel(l.ref)"
      :aria-pressed="readonly ? undefined : isSelected(l.ref)"
      data-kind="load"
      :data-id="l.ref.id"
      @click.stop="onElementClick(l.ref)"
      @keydown="onElementKeydown($event, l.ref)"
    >
      <polygon
        class="structure-canvas__hit"
        :points="hitPolygon(l.tailX, l.tailY, l.tipX, l.tipY)"
      />
      <line
        class="structure-canvas__load-line"
        :x1="l.tailX"
        :y1="l.tailY"
        :x2="l.tipX"
        :y2="l.tipY"
        :marker-end="`url(#${arrowId})`"
      />
      <text class="structure-canvas__load-label" :x="l.textX" :y="l.textY" text-anchor="middle">
        {{ l.text }}
      </text>
    </g>

    <g
      v-for="n in nodes"
      :key="n.ref.id"
      class="structure-canvas__node"
      :class="{
        'structure-canvas__node--selected': isSelected(n.ref),
        'structure-canvas__node--invalid': isInvalid(n.ref),
        'structure-canvas__node--pending': pendingMemberStart === n.ref.id,
      }"
      :transform="`translate(${n.x} ${n.y})`"
      :role="readonly ? undefined : 'button'"
      :tabindex="readonly ? undefined : 0"
      :aria-label="elementLabel(n.ref)"
      :aria-pressed="readonly ? undefined : isSelected(n.ref)"
      data-kind="node"
      :data-id="n.ref.id"
      :data-label="n.node.label"
      @click.stop="onElementClick(n.ref)"
      @pointerdown="onNodePointerDown($event, n.ref.id)"
      @keydown="onElementKeydown($event, n.ref)"
    >
      <circle class="structure-canvas__hit-area" r="16" />
      <circle
        v-if="isSelected(n.ref) || pendingMemberStart === n.ref.id"
        class="structure-canvas__node-ring"
        r="12"
      />
      <circle class="structure-canvas__node-dot" r="6" />
      <text class="structure-canvas__node-label" x="-12" y="-14" text-anchor="end">
        {{ n.node.label }}
      </text>
      <g v-if="isInvalid(n.ref)" class="structure-canvas__marker" transform="translate(16 -18)">
        <title>{{ issuesByKey.get(`node:${n.ref.id}`)?.join(' ') }}</title>
        <circle r="9" />
        <text y="4" text-anchor="middle">!</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.structure-canvas {
  display: block;
  width: 100%;
  height: auto;
  min-height: 240px;
  max-height: 70vh;
  background: var(--colors-surface);
  touch-action: none;
  user-select: none;
  font-family: var(--fonts-family);
}

.structure-canvas--readonly {
  min-height: 160px;
  touch-action: auto;
}

.structure-canvas--tool-node,
.structure-canvas--tool-member {
  cursor: crosshair;
}

.structure-canvas__background {
  cursor: inherit;
}

.structure-canvas__grid-line {
  fill: none;
  stroke: var(--colors-border);
  stroke-width: 1;
}

.structure-canvas__axes {
  stroke: var(--colors-border);
  stroke-width: 2;
  pointer-events: none;
}

.structure-canvas__empty {
  fill: var(--colors-muted);
  font-size: 18px;
  pointer-events: none;
}

.structure-canvas__hit {
  fill: transparent;
}

.structure-canvas__hit-area {
  fill: transparent;
}

.structure-canvas__member {
  cursor: pointer;
  outline: none;
}

.structure-canvas__member-line {
  stroke: var(--colors-text);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke var(--transition-fast);
}

.structure-canvas__member--selected .structure-canvas__member-line {
  stroke: var(--colors-primary);
  stroke-width: 5;
}

.structure-canvas__member--invalid .structure-canvas__member-line {
  stroke: var(--colors-error);
  stroke-dasharray: 10 6;
}

.structure-canvas__member-label {
  pointer-events: none;
  fill: var(--colors-muted);
  font-size: 14px;
}

.structure-canvas__handle {
  fill: var(--colors-surface);
  stroke: var(--colors-primary);
  stroke-width: 2;
}

.structure-canvas__pending {
  stroke: var(--colors-primary);
  stroke-width: 3;
  stroke-dasharray: 8 6;
  pointer-events: none;
}

.structure-canvas__support {
  cursor: pointer;
  outline: none;
}

.structure-canvas__support-shape {
  fill: none;
  stroke: var(--colors-muted);
  stroke-width: 2.5;
  stroke-linejoin: round;
}

.structure-canvas__support--selected .structure-canvas__support-shape {
  stroke: var(--colors-primary);
  stroke-width: 3;
}

.structure-canvas__support--invalid .structure-canvas__support-shape {
  stroke: var(--colors-error);
}

.structure-canvas__load {
  cursor: pointer;
  outline: none;
}

.structure-canvas__load-line {
  stroke: var(--colors-warning);
  stroke-width: 3.5;
}

.structure-canvas__arrowhead {
  fill: var(--colors-warning);
}

.structure-canvas__load--selected .structure-canvas__load-line {
  stroke: var(--colors-primary);
  stroke-width: 4.5;
}

.structure-canvas__load--invalid .structure-canvas__load-line {
  stroke: var(--colors-error);
  stroke-dasharray: 8 5;
}

.structure-canvas__load-label {
  fill: var(--colors-warning);
  font-size: 15px;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--colors-surface);
  stroke-width: 4;
}

.structure-canvas__node {
  cursor: pointer;
  outline: none;
}

.structure-canvas--tool-select .structure-canvas__node {
  cursor: grab;
}

.structure-canvas__node-dot {
  fill: var(--colors-surface);
  stroke: var(--colors-text);
  stroke-width: 3;
}

.structure-canvas__node-ring {
  fill: var(--colors-selection);
  stroke: var(--colors-primary);
  stroke-width: 2;
}

.structure-canvas__node--selected .structure-canvas__node-dot,
.structure-canvas__node--pending .structure-canvas__node-dot {
  stroke: var(--colors-primary);
}

.structure-canvas__node--invalid .structure-canvas__node-dot {
  stroke: var(--colors-error);
}

.structure-canvas__node-label {
  fill: var(--colors-text);
  font-size: 16px;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--colors-surface);
  stroke-width: 4;
}

.structure-canvas__marker circle {
  fill: var(--colors-error);
}

.structure-canvas__marker text {
  fill: var(--colors-onPrimary);
  font-size: 13px;
  font-weight: 700;
}

.structure-canvas__node:focus-visible .structure-canvas__hit-area,
.structure-canvas__support:focus-visible .structure-canvas__hit-area {
  stroke: var(--colors-primary);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.structure-canvas__member:focus-visible .structure-canvas__hit,
.structure-canvas__load:focus-visible .structure-canvas__hit {
  stroke: var(--colors-primary);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}
</style>

<style scoped>
/* Previews are drawn smaller than the editor; enlarge text so it stays readable. */
.structure-canvas--readonly .structure-canvas__node-label {
  font-size: 24px;
}

.structure-canvas--readonly .structure-canvas__load-label {
  font-size: 22px;
}

.structure-canvas--readonly .structure-canvas__member-label {
  font-size: 20px;
}
</style>
