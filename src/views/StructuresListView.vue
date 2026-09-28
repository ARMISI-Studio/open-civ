<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ListPage from '@/layouts/ListPage.vue'
import ItemList from '@/components/lists/ItemList.vue'
import ItemCard from '@/components/lists/ItemCard.vue'
import UiButton from '@/components/ui/atoms/UiButton.vue'
import { useStructures } from '@/composables/useStructures'
import { formatDate } from '@/domain/format'

const router = useRouter()
const structures = useStructures()
onMounted(() => structures.refreshList())
</script>

<template>
  <ListPage title="Structures" description="2D structures you can use in questions.">
    <template #actions>
      <UiButton variant="primary" @click="router.push('/structures/new')">
        <template #icon>＋</template>
        New structure
      </UiButton>
    </template>

    <ItemList
      label="Saved structures"
      :items="structures.summaries.value"
      :item-key="(s) => s.id"
      :status="structures.listStatus.value"
      :error="structures.listError.value"
      loading-text="Loading structures…"
      empty-text="No structures yet. Create one to get started."
      @retry="structures.refreshList"
    >
      <template #default="{ item }">
        <ItemCard :to="`/structures/${item.id}`" :title="item.name">
          <template v-if="item.description">{{ item.description }}</template>
          <template #meta>Updated {{ formatDate(item.updatedAt) }}</template>
        </ItemCard>
      </template>
    </ItemList>
  </ListPage>
</template>
