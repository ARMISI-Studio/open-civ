<script setup lang="ts">
import type { ElementRef, StructureIssue } from '@/domain/structures'

defineProps<{ issues: StructureIssue[] }>()
const emit = defineEmits<{ select: [ref: ElementRef] }>()
</script>

<template>
  <section class="structure-issues" aria-labelledby="structure-issues-heading">
    <h2 id="structure-issues-heading" class="structure-issues__heading">
      <template v-if="issues.length">
        <span class="structure-issues__icon" aria-hidden="true">!</span>
        {{ issues.length }} {{ issues.length === 1 ? 'problem' : 'problems' }} to fix before saving
      </template>
      <template v-else>
        <span class="structure-issues__icon structure-issues__icon--ok" aria-hidden="true">✓</span>
        No problems found
      </template>
    </h2>
    <ul v-if="issues.length" class="structure-issues__list">
      <li v-for="(issue, index) in issues" :key="index" class="structure-issues__item">
        <button
          v-if="issue.element"
          type="button"
          class="structure-issues__link"
          @click="emit('select', issue.element)"
        >
          {{ issue.message }}
        </button>
        <span v-else>{{ issue.message }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.structure-issues {
  display: grid;
  gap: var(--spacing-small);
  font-size: var(--fonts-label);
}

.structure-issues__heading {
  display: flex;
  align-items: center;
  gap: var(--spacing-small);
  font-size: var(--fonts-label);
}

.structure-issues__icon {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--colors-error);
  color: var(--colors-onPrimary);
  font-size: 12px;
}

.structure-issues__icon--ok {
  background: var(--colors-success);
}

.structure-issues__list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: var(--spacing-large);
  color: var(--colors-error);
}

.structure-issues__link {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: start;
  text-decoration: underline;
  cursor: pointer;
}
</style>
