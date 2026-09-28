<script setup lang="ts">
import { onMounted } from 'vue'
import ListPage from '@/layouts/ListPage.vue'
import ItemList from '@/components/lists/ItemList.vue'
import ItemCard from '@/components/lists/ItemCard.vue'
import ShareCodeForm from '@/components/questions/ShareCodeForm.vue'
import { listSharedQuestions } from '@/api/answers'
import { useResourceList } from '@/composables/useResourceList'
import { formatDate } from '@/domain/format'

const shared = useResourceList(listSharedQuestions)
onMounted(() => shared.refresh())
</script>

<template>
  <ListPage title="Answers" description="Answer questions that have been shared.">
    <ShareCodeForm />

    <section class="answers-list__section" aria-labelledby="answers-list-heading">
      <h2 id="answers-list-heading">Shared questions</h2>
      <ItemList
        label="Shared questions"
        :items="shared.items.value"
        :item-key="(q) => q.shareId"
        :status="shared.status.value"
        :error="shared.error.value"
        loading-text="Loading shared questions…"
        empty-text="No questions have been shared yet."
        @retry="shared.refresh"
      >
        <template #default="{ item }">
          <ItemCard :to="`/answers/${item.shareId}`" :title="item.title">
            {{ item.prompt }}
            <template #meta>
              <span v-if="item.structureName">{{ item.structureName }}</span>
              <span>Shared {{ formatDate(item.sharedAt) }}</span>
            </template>
          </ItemCard>
        </template>
      </ItemList>
    </section>
  </ListPage>
</template>

<style scoped>
.answers-list__section {
  display: grid;
  gap: var(--spacing-medium);
}
</style>
