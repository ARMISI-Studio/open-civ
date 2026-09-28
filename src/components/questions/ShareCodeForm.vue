<script setup lang="ts">
/** Opens a shared question from a share code or a pasted share link. */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import UiInput from '@/components/ui/atoms/UiInput.vue'
import UiField from '@/components/ui/molecules/UiField.vue'
import { parseShareInput } from '@/domain/answers'

const router = useRouter()
const codeInput = ref('')
const codeError = ref<string | undefined>()

function open() {
  const code = parseShareInput(codeInput.value)
  if (!code) {
    codeError.value = codeInput.value.trim()
      ? 'That doesn’t look like a share code or link.'
      : 'Enter a share code or link.'
    return
  }
  codeError.value = undefined
  router.push(`/answers/${code}`)
}
</script>

<template>
  <form class="share-code-form" novalidate @submit.prevent="open">
    <UiField
      v-slot="{ id, describedby, invalid }"
      class="share-code-form__field"
      label="Share code or link"
      hint="For example K7QM2XPA, or the full link you received."
      :error="codeError"
    >
      <UiInput
        :id="id"
        v-model="codeInput"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        :aria-describedby="describedby"
        :invalid="invalid"
      />
    </UiField>
    <UiButton type="submit" class="share-code-form__submit">Open question</UiButton>
  </form>
</template>

<style scoped>
.share-code-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--spacing-small) var(--spacing-medium);
  padding: var(--spacing-large);
  background: var(--colors-surface);
  border: var(--border-width) solid var(--colors-border);
  border-radius: var(--shape-panelRadius);
}

.share-code-form__field {
  flex: 1 1 260px;
}

/* Line the button up with the input, below the label. */
.share-code-form__submit {
  margin-top: calc(var(--fonts-label) * 1.5 + var(--spacing-small));
}

@media (max-width: 700px) {
  .share-code-form {
    padding: var(--spacing-medium);
  }

  .share-code-form__submit {
    flex: 1 1 100%;
    margin-top: 0;
  }
}
</style>
