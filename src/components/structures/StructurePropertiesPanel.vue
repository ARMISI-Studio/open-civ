<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiSelect from '@/components/ui/atoms/UiSelect.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import StructureNumberField from './StructureNumberField.vue'
import type { StructureEditor } from '@/composables/useStructureEditor'
import {
  SUPPORT_TYPES,
  UNITS,
  describeElement,
  findNode,
  formatNumber,
  loadMagnitude,
  memberLength,
  type SupportType,
} from '@/domain/structures'

const props = defineProps<{ editor: StructureEditor }>()

const e = props.editor
const structure = computed(() => e.structure.value)
const selection = computed(() => e.selection.value)

const heading = computed(() =>
  selection.value ? describeElement(structure.value, selection.value) : 'Nothing selected',
)

const nodeLabel = (id: string) => findNode(structure.value, id)?.label ?? '?'

const selectedIssues = computed(() =>
  selection.value
    ? e.issues.value.filter(
        (i) => i.element?.kind === selection.value!.kind && i.element.id === selection.value!.id,
      )
    : [],
)

// --- Node actions ------------------------------------------------------------------------
const connectTarget = ref<string | null>(null)
watch(selection, () => (connectTarget.value = null))

const connectOptions = computed(() => {
  const node = e.selectedNode.value
  if (!node) return []
  return structure.value.nodes
    .filter((n) => n.id !== node.id)
    .map((n) => {
      const exists = structure.value.members.some(
        (m) =>
          (m.startNodeId === node.id && m.endNodeId === n.id) ||
          (m.endNodeId === node.id && m.startNodeId === n.id),
      )
      return {
        value: n.id,
        label: `Node ${n.label}`,
        description: exists
          ? 'Already connected'
          : `(${formatNumber(n.x)}, ${formatNumber(n.y)}) ${UNITS.length}`,
        disabled: exists,
      }
    })
})

const nodeSupport = computed(() => {
  const node = e.selectedNode.value
  return node ? structure.value.supports.find((s) => s.nodeId === node.id) : undefined
})

function connect() {
  const node = e.selectedNode.value
  if (!node || !connectTarget.value) return
  const member = e.addMember(node.id, connectTarget.value)
  if (member) e.select({ kind: 'member', id: member.id })
}

function addSupportHere() {
  const node = e.selectedNode.value
  if (!node) return
  const support = e.addSupport(node.id)
  if (support) e.select({ kind: 'support', id: support.id })
}

function addLoadHere() {
  const node = e.selectedNode.value
  if (!node) return
  const load = e.addLoad(node.id)
  if (load) e.select({ kind: 'load', id: load.id })
}

// --- Add node without a pointer ---------------------------------------------------------------
const newX = ref('0')
const newY = ref('0')
const newNodeError = computed(() =>
  [newX.value, newY.value].every((v) => v.trim() !== '' && Number.isFinite(Number(v)))
    ? undefined
    : 'Enter numbers for x and y.',
)

function addNodeFromForm() {
  if (newNodeError.value) return
  const node = e.addNode(Number(newX.value), Number(newY.value))
  e.select({ kind: 'node', id: node.id })
}

const supportOptions = SUPPORT_TYPES.map((t) => ({ ...t }))
</script>

<template>
  <section class="structure-properties" aria-labelledby="structure-properties-heading">
    <p class="structure-properties__eyebrow">{{ selection ? 'Selected' : 'Properties' }}</p>
    <h2 id="structure-properties-heading" class="structure-properties__heading">{{ heading }}</h2>

    <ul v-if="selectedIssues.length" class="structure-properties__issues">
      <li v-for="issue in selectedIssues" :key="issue.message">
        <span aria-hidden="true">!</span> {{ issue.message }}
      </li>
    </ul>

    <!-- Node -->
    <template v-if="e.selectedNode.value">
      <UiField v-slot="{ id, describedby, invalid }" label="Label">
        <UiInput
          :id="id"
          :model-value="e.selectedNode.value.label"
          maxlength="4"
          :aria-describedby="describedby"
          :invalid="invalid"
          @update:model-value="
            e.updateNode(
              e.selectedNode.value!.id,
              { label: $event },
              `label:${e.selectedNode.value!.id}`,
            )
          "
          @blur="e.endEdit()"
        />
      </UiField>
      <div class="structure-properties__pair">
        <StructureNumberField
          label="x"
          :unit="UNITS.length"
          :model-value="e.selectedNode.value.x"
          :step="0.5"
          @commit="
            e.updateNode(e.selectedNode.value!.id, { x: $event }, `x:${e.selectedNode.value!.id}`)
          "
          @done="e.endEdit()"
        />
        <StructureNumberField
          label="y"
          :unit="UNITS.length"
          :model-value="e.selectedNode.value.y"
          :step="0.5"
          @commit="
            e.updateNode(e.selectedNode.value!.id, { y: $event }, `y:${e.selectedNode.value!.id}`)
          "
          @done="e.endEdit()"
        />
      </div>
      <UiField v-slot="{ id }" label="Connect to node">
        <div class="structure-properties__row">
          <UiSelect
            :id="id"
            v-model="connectTarget"
            class="structure-properties__grow"
            :options="connectOptions"
            placeholder="Choose a node"
          />
          <UiButton :disabled="!connectTarget" @click="connect">Add member</UiButton>
        </div>
      </UiField>
      <div class="structure-properties__row">
        <UiButton v-if="!nodeSupport" size="small" @click="addSupportHere">
          <template #icon>△</template>
          Add support
        </UiButton>
        <UiButton v-else size="small" @click="e.select({ kind: 'support', id: nodeSupport.id })">
          Edit support
        </UiButton>
        <UiButton size="small" @click="addLoadHere">
          <template #icon>↓</template>
          Add load
        </UiButton>
      </div>
    </template>

    <!-- Member -->
    <template v-else-if="e.selectedMember.value">
      <dl class="structure-properties__facts">
        <div>
          <dt>From</dt>
          <dd>Node {{ nodeLabel(e.selectedMember.value.startNodeId) }}</dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>Node {{ nodeLabel(e.selectedMember.value.endNodeId) }}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>
            {{ formatNumber(memberLength(structure, e.selectedMember.value) ?? 0) }}
            {{ UNITS.length }}
          </dd>
        </div>
      </dl>
      <UiField v-slot="{ id, describedby }" label="Label" hint="Optional, e.g. Beam AB.">
        <UiInput
          :id="id"
          :model-value="e.selectedMember.value.label ?? ''"
          maxlength="40"
          :aria-describedby="describedby"
          @update:model-value="
            e.updateMember(
              e.selectedMember.value!.id,
              { label: $event },
              `mlabel:${e.selectedMember.value!.id}`,
            )
          "
          @blur="e.endEdit()"
        />
      </UiField>
    </template>

    <!-- Support -->
    <template v-else-if="e.selectedSupport.value">
      <p class="structure-properties__text">
        At node {{ nodeLabel(e.selectedSupport.value.nodeId) }}
      </p>
      <UiField v-slot="{ id, describedby, invalid }" label="Support type">
        <UiSelect
          :id="id"
          :model-value="e.selectedSupport.value.type"
          :options="supportOptions"
          :aria-describedby="describedby"
          :invalid="invalid"
          @update:model-value="
            e.updateSupport(e.selectedSupport.value!.id, { type: $event as SupportType })
          "
        />
      </UiField>
    </template>

    <!-- Load -->
    <template v-else-if="e.selectedLoad.value">
      <p class="structure-properties__text">
        At node {{ nodeLabel(e.selectedLoad.value.nodeId) }} ·
        {{ formatNumber(loadMagnitude(e.selectedLoad.value)) }} {{ UNITS.force }}
      </p>
      <div class="structure-properties__pair">
        <StructureNumberField
          label="Fx"
          :unit="UNITS.force"
          :model-value="e.selectedLoad.value.fx"
          @commit="
            e.updateLoad(e.selectedLoad.value!.id, { fx: $event }, `fx:${e.selectedLoad.value!.id}`)
          "
          @done="e.endEdit()"
        />
        <StructureNumberField
          label="Fy"
          :unit="UNITS.force"
          :model-value="e.selectedLoad.value.fy"
          @commit="
            e.updateLoad(e.selectedLoad.value!.id, { fy: $event }, `fy:${e.selectedLoad.value!.id}`)
          "
          @done="e.endEdit()"
        />
      </div>
      <p class="structure-properties__hint">Positive Fx points right, positive Fy points up.</p>
    </template>

    <!-- Nothing selected -->
    <template v-else>
      <p class="structure-properties__hint">
        Select an element on the drawing to edit it, or add a node by coordinates.
      </p>
      <!-- Not a <form>: the workspace can sit inside the question form, and forms can't nest. -->
      <div
        class="structure-properties__add-node"
        role="group"
        aria-label="Add a node by coordinates"
        @keydown.enter.prevent="addNodeFromForm"
      >
        <div class="structure-properties__pair">
          <UiField v-slot="{ id }" :label="`New node x (${UNITS.length})`">
            <UiInput :id="id" v-model="newX" type="number" step="0.5" inputmode="decimal" />
          </UiField>
          <UiField v-slot="{ id }" :label="`New node y (${UNITS.length})`">
            <UiInput :id="id" v-model="newY" type="number" step="0.5" inputmode="decimal" />
          </UiField>
        </div>
        <p v-if="newNodeError" class="structure-properties__error">{{ newNodeError }}</p>
        <UiButton :disabled="!!newNodeError" @click="addNodeFromForm">
          <template #icon>⊙</template>
          Add node
        </UiButton>
      </div>
      <dl class="structure-properties__facts">
        <div>
          <dt>Nodes</dt>
          <dd>{{ structure.nodes.length }}</dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{{ structure.members.length }}</dd>
        </div>
        <div>
          <dt>Supports</dt>
          <dd>{{ structure.supports.length }}</dd>
        </div>
        <div>
          <dt>Loads</dt>
          <dd>{{ structure.loads.length }}</dd>
        </div>
      </dl>
    </template>

    <UiButton
      v-if="selection"
      variant="danger"
      class="structure-properties__delete"
      @click="e.deleteSelected()"
    >
      Delete {{ selection.kind }}
    </UiButton>
  </section>
</template>

<style scoped>
.structure-properties {
  display: grid;
  gap: var(--spacing-medium);
  align-content: start;
}

.structure-properties__eyebrow {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.structure-properties__heading {
  margin-top: calc(var(--spacing-small) * -1);
}

.structure-properties__issues {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--colors-error);
  font-size: var(--fonts-label);
}

.structure-properties__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-small);
}

.structure-properties__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-small);
}

.structure-properties__grow {
  flex: 1 1 140px;
  width: auto;
}

.structure-properties__add-node {
  display: grid;
  gap: var(--spacing-small);
}

.structure-properties__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: var(--spacing-small);
  margin: 0;
}

.structure-properties__facts div {
  display: grid;
}

.structure-properties__facts dt {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.structure-properties__facts dd {
  margin: 0;
  font-weight: 600;
}

.structure-properties__text,
.structure-properties__hint {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.structure-properties__error {
  color: var(--colors-error);
  font-size: var(--fonts-label);
}

.structure-properties__delete {
  justify-self: start;
}
</style>
