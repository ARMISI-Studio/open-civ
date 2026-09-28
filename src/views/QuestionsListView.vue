<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ListPage from '@/layouts/ListPage.vue'
import ItemList from '@/components/lists/ItemList.vue'
import ItemCard from '@/components/lists/ItemCard.vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import { listQuestions } from '@/api/questions'
import { useResourceList } from '@/composables/useResourceList'
import { formatDate } from '@/domain/format'

const router = useRouter()
const questions = useResourceList(listQuestions)
onMounted(() => questions.refresh())
</script>

<template>
  <ListPage title="Questions" description="Questions built from your structures.">
    <template #actions>
      <UiButton variant="primary" @click="router.push('/questions/new')">
        <template #icon>＋</template>
        New question
      </UiButton>
    </template>

    <ItemList
      label="Your questions"
      :items="questions.items.value"
      :item-key="(q) => q.id"
      :status="questions.status.value"
      :error="questions.error.value"
      loading-text="Loading questions…"
      empty-text="No questions yet. Create one from a structure."
      @retry="questions.refresh"
    >
      <template #default="{ item }">
        <ItemCard :to="`/questions/${item.id}`" :title="item.title">
          <template v-if="item.structureName">Structure: {{ item.structureName }}</template>
          <template #meta>
            <span v-if="item.share" class="questions-list__shared">
              <span aria-hidden="true">✓</span> Shared · {{ item.share.shareId }}
            </span>
            <span v-else>Not shared</span>
            <span>Updated {{ formatDate(item.updatedAt) }}</span>
          </template>
        </ItemCard>
      </template>
    </ItemList>
  </ListPage>
</template>

<style scoped>
.questions-list__shared {
  color: var(--colors-success);
  font-weight: 600;
}
</style>
