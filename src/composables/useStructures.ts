import { ref } from 'vue'
import * as structuresApi from '@/api/structures'
import { ApiError, errorMessage } from '@/api/client'
import type { Structure, StructureDraft, StructureSummary } from '@/domain/structures'

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

/** Saved-structure list plus load/save/delete requests, each with visible status and errors. */
export function useStructures() {
  const summaries = ref<StructureSummary[]>([])
  const listStatus = ref<RequestStatus>('idle')
  const listError = ref<string | null>(null)

  const loadStatus = ref<RequestStatus>('idle')
  const loadError = ref<string | null>(null)
  const notFound = ref(false)

  const saveStatus = ref<RequestStatus>('idle')
  const saveError = ref<string | null>(null)
  const saveFieldErrors = ref<Record<string, string>>({})

  const deleteStatus = ref<RequestStatus>('idle')
  const deleteError = ref<string | null>(null)

  async function refreshList() {
    listStatus.value = 'loading'
    listError.value = null
    try {
      summaries.value = await structuresApi.listStructures()
      listStatus.value = 'success'
    } catch (error) {
      listError.value = errorMessage(error)
      listStatus.value = 'error'
    }
  }

  async function load(id: string): Promise<Structure | null> {
    loadStatus.value = 'loading'
    loadError.value = null
    notFound.value = false
    try {
      const structure = await structuresApi.getStructure(id)
      loadStatus.value = 'success'
      return structure
    } catch (error) {
      notFound.value = error instanceof ApiError && error.status === 404
      loadError.value = notFound.value
        ? 'This structure doesn’t exist or was deleted.'
        : errorMessage(error)
      loadStatus.value = 'error'
      return null
    }
  }

  async function save(draft: StructureDraft): Promise<Structure | null> {
    saveStatus.value = 'loading'
    saveError.value = null
    saveFieldErrors.value = {}
    try {
      const saved = await structuresApi.saveStructure(draft)
      saveStatus.value = 'success'
      upsertSummary(saved)
      return saved
    } catch (error) {
      saveError.value = errorMessage(error)
      if (error instanceof ApiError) saveFieldErrors.value = error.fields
      saveStatus.value = 'error'
      return null
    }
  }

  async function remove(id: string): Promise<boolean> {
    deleteStatus.value = 'loading'
    deleteError.value = null
    try {
      await structuresApi.deleteStructure(id)
      summaries.value = summaries.value.filter((s) => s.id !== id)
      deleteStatus.value = 'success'
      return true
    } catch (error) {
      deleteError.value = errorMessage(error)
      deleteStatus.value = 'error'
      return false
    }
  }

  function upsertSummary(structure: Structure) {
    const summary: StructureSummary = {
      id: structure.id,
      name: structure.name,
      description: structure.description,
      updatedAt: new Date().toISOString(),
    }
    summaries.value = [summary, ...summaries.value.filter((s) => s.id !== structure.id)]
  }

  function resetSaveStatus() {
    saveStatus.value = 'idle'
    saveError.value = null
    saveFieldErrors.value = {}
  }

  return {
    summaries,
    listStatus,
    listError,
    loadStatus,
    loadError,
    notFound,
    saveStatus,
    saveError,
    saveFieldErrors,
    deleteStatus,
    deleteError,
    refreshList,
    load,
    save,
    remove,
    resetSaveStatus,
  }
}
