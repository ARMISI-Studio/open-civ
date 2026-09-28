import { ref, shallowRef } from 'vue'
import { errorMessage } from '@/api/client'
import type { RequestStatus } from './useStructures'

/** Loads a list from the API with visible loading, empty, and error states. */
export function useResourceList<T>(fetchList: () => Promise<T[]>) {
  const items = shallowRef<T[]>([])
  const status = ref<RequestStatus>('idle')
  const error = ref<string | null>(null)

  async function refresh() {
    status.value = 'loading'
    error.value = null
    try {
      items.value = await fetchList()
      status.value = 'success'
    } catch (e) {
      error.value = errorMessage(e)
      status.value = 'error'
    }
  }

  return { items, status, error, refresh }
}
