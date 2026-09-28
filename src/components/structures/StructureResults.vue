<script setup lang="ts">
/** Tables of analysis results. The numbers come from src/domain/analysis/frame2d.ts. */
import { computed } from 'vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import { SUPPORT_RESTRAINTS, type AnalysisResult } from '@/domain/analysis/frame2d'
import {
  SUPPORT_TYPES,
  UNITS,
  describeElement,
  findNode,
  formatNumber,
  type StructureDraft,
} from '@/domain/structures'

const props = defineProps<{
  structure: StructureDraft
  result: AnalysisResult
  /** Largest displacement, m. */
  maxDisplacement: number
  /** How much the drawn deflected shape is exaggerated. */
  deflectionScale: number
}>()

const MOMENT = `${UNITS.force}·${UNITS.length}`
const nodeLabel = (id: string) => findNode(props.structure, id)?.label ?? '?'
const force = (value: number) => formatNumber(value)

const solved = computed(() => (props.result.status === 'solved' ? props.result : null))

const reactions = computed(() =>
  (solved.value?.reactions ?? []).map((r) => {
    const support = props.structure.supports.find((s) => s.id === r.supportId)
    const [fixesX, fixesY, fixesRotation] = support
      ? SUPPORT_RESTRAINTS[support.type]
      : [false, false, false]
    return {
      id: r.supportId,
      name: `${nodeLabel(r.nodeId)} (${SUPPORT_TYPES.find((t) => t.value === support?.type)?.label ?? '?'})`,
      rx: fixesX ? force(r.rx) : '—',
      ry: fixesY ? force(r.ry) : '—',
      mz: fixesRotation ? force(r.mz) : '—',
    }
  }),
)

const members = computed(() =>
  (solved.value?.memberForces ?? []).flatMap((f) => {
    const member = props.structure.members.find((m) => m.id === f.memberId)
    if (!member) return []
    const name = describeElement(props.structure, { kind: 'member', id: member.id }).replace(
      /^Member /,
      '',
    )
    return [
      { key: `${f.memberId}:start`, name, end: nodeLabel(member.startNodeId), ...f.start },
      { key: `${f.memberId}:end`, name: '', end: nodeLabel(member.endNodeId), ...f.end },
    ]
  }),
)

const section = computed(() => solved.value?.section)
</script>

<template>
  <section class="structure-results" aria-labelledby="structure-results-heading">
    <h3 id="structure-results-heading" class="structure-results__heading">Results</h3>

    <UiStatus v-if="result.status !== 'solved'" tone="warning">{{ result.message }}</UiStatus>

    <template v-else>
      <p class="structure-results__summary">
        Largest displacement: <strong>{{ formatNumber(maxDisplacement * 1000) }} mm</strong>.
        <template v-if="deflectionScale > 0">
          The dashed deflected shape is drawn {{ formatNumber(deflectionScale, 0) }}× larger.
        </template>
      </p>

      <div class="structure-results__scroll">
        <table class="structure-results__table">
          <caption>
            Support reactions
          </caption>
          <thead>
            <tr>
              <th scope="col">Support</th>
              <th scope="col">Rx ({{ UNITS.force }})</th>
              <th scope="col">Ry ({{ UNITS.force }})</th>
              <th scope="col">M ({{ MOMENT }})</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reactions" :key="r.id">
              <th scope="row">{{ r.name }}</th>
              <td>{{ r.rx }}</td>
              <td>{{ r.ry }}</td>
              <td>{{ r.mz }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="structure-results__scroll">
        <table class="structure-results__table">
          <caption>
            Member end forces
          </caption>
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col" class="structure-results__text">At node</th>
              <th scope="col">N ({{ UNITS.force }})</th>
              <th scope="col">V ({{ UNITS.force }})</th>
              <th scope="col">M ({{ MOMENT }})</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.key">
              <th scope="row">{{ m.name }}</th>
              <td class="structure-results__text">{{ m.end }}</td>
              <td>{{ force(m.N) }}</td>
              <td>{{ force(m.V) }}</td>
              <td>{{ force(m.M) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <details class="structure-results__notes">
        <summary>How these are calculated</summary>
        <ul>
          <li>Linear-elastic 2D frame analysis (direct stiffness method). All joints are rigid.</li>
          <li>
            Every member is steel (E = {{ formatNumber(section!.E / 1e6, 0) }} GPa) with A =
            {{ formatNumber(section!.A * 1e4, 1) }} cm² and I =
            {{ formatNumber(section!.I * 1e8, 0) }} cm⁴. Displacements depend on these values.
          </li>
          <li>
            Reactions: Rx right, Ry up, and M counter-clockwise are positive. A dash means the
            support does not resist that direction.
          </li>
          <li>
            Member forces: N is positive in tension. M is positive when it causes tension on the
            member’s right-hand side, looking from its first node to its second (sagging, for a beam
            drawn left to right). V is positive when M increases along the member.
          </li>
        </ul>
      </details>
    </template>
  </section>
</template>

<style scoped>
.structure-results {
  display: grid;
  gap: var(--spacing-medium);
  padding: var(--spacing-medium);
  border-top: var(--border-width) solid var(--colors-border);
}

.structure-results__heading {
  font-size: var(--fonts-body);
}

.structure-results__summary {
  color: var(--colors-muted);
}

.structure-results__summary strong {
  color: var(--colors-text);
}

.structure-results__scroll {
  overflow-x: auto;
}

.structure-results__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fonts-label);
  font-variant-numeric: tabular-nums;
}

.structure-results__table caption {
  margin-bottom: var(--spacing-small);
  font-weight: 600;
  text-align: left;
}

.structure-results__table th,
.structure-results__table td {
  padding: 6px var(--spacing-small);
  border-bottom: var(--border-width) solid var(--colors-border);
  text-align: right;
  white-space: nowrap;
}

.structure-results__table th:first-child,
.structure-results__table .structure-results__text {
  text-align: left;
}

.structure-results__table thead th {
  color: var(--colors-muted);
  font-weight: 600;
}

.structure-results__notes {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.structure-results__notes summary {
  cursor: pointer;
  font-weight: 600;
}

.structure-results__notes ul {
  display: grid;
  gap: 4px;
  margin: var(--spacing-small) 0 0;
  padding-left: 1.2em;
}
</style>
