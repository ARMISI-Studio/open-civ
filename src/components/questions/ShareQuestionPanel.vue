<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiStatus from '@/components/ui/atoms/UiStatus.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import type { QuestionShare } from '@/domain/questions'
import type { RequestStatus } from '@/composables/useStructures'

const props = defineProps<{
  share: QuestionShare | null
  status: RequestStatus
  error: string | null
  /** False while the question has unsaved changes or was never saved. */
  canShare: boolean
  isSaved: boolean
}>()

const emit = defineEmits<{ share: [] }>()

const copyStatus = ref<'idle' | 'copied' | 'failed'>('idle')

async function copy() {
  if (!props.share) return
  try {
    await navigator.clipboard.writeText(props.share.url)
    copyStatus.value = 'copied'
  } catch {
    copyStatus.value = 'failed'
  }
}
</script>

<template>
  <section class="share-panel" aria-labelledby="share-panel-heading">
    <h2 id="share-panel-heading" class="share-panel__heading">Share</h2>

    <template v-if="share">
      <UiStatus tone="success"> Shared. Anyone with this link can answer the question. </UiStatus>
      <UiField
        v-slot="{ id, describedby }"
        label="Share link"
        :hint="`Share code: ${share.shareId}`"
      >
        <div class="share-panel__row">
          <UiInput
            :id="id"
            class="share-panel__link"
            readonly
            :model-value="share.url"
            :aria-describedby="describedby"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <UiButton class="share-panel__copy" @click="copy">
            <template #icon>⧉</template>
            Copy link
          </UiButton>
        </div>
      </UiField>
      <p v-if="copyStatus !== 'idle'" class="share-panel__copy-status" role="status">
        {{
          copyStatus === 'copied' ? 'Link copied.' : 'Couldn’t copy. Select the link and copy it.'
        }}
      </p>
      <a class="share-panel__open" :href="share.url" target="_blank" rel="noopener">
        Open the answer page ↗
      </a>
    </template>

    <template v-else>
      <p class="share-panel__text">
        {{
          isSaved
            ? 'Create a link that people can use to answer this question.'
            : 'Save the question first, then create a share link.'
        }}
      </p>
      <UiStatus v-if="status === 'error'" tone="error">
        Could not create a share link. {{ error }}
      </UiStatus>
      <div>
        <UiButton
          variant="primary"
          :disabled="!canShare"
          :loading="status === 'loading'"
          @click="emit('share')"
        >
          <template #icon>↗</template>
          {{
            status === 'loading'
              ? 'Creating link…'
              : status === 'error'
                ? 'Try again'
                : 'Create share link'
          }}
        </UiButton>
      </div>
      <p v-if="isSaved && !canShare" class="share-panel__text">Save your changes before sharing.</p>
    </template>
  </section>
</template>

<style scoped>
.share-panel {
  display: grid;
  gap: var(--spacing-medium);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.share-panel__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-small);
}

.share-panel__link {
  flex: 1 1 220px;
  width: auto;
  min-width: 0;
}

.share-panel__text,
.share-panel__copy-status {
  color: var(--colors-muted);
  font-size: var(--fonts-label);
}

.share-panel__open {
  justify-self: start;
  font-size: var(--fonts-label);
}
</style>
