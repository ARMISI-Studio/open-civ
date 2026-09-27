import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/setup'
import { ApiError, API_BASE_URL, apiRequest, errorMessage } from '../client'
import {
  createStructure,
  deleteStructure,
  getStructure,
  listStructures,
  saveStructure,
  updateStructure,
} from '../structures'
import { useStructures } from '@/composables/useStructures'
import type { StructureDraft } from '@/domain/structures'

function draft(name = 'Truss'): StructureDraft {
  return {
    name: `  ${name}  `,
    description: '',
    nodes: [
      { id: 'n1', label: 'A', x: 0, y: 0 },
      { id: 'n2', label: 'B', x: 4, y: 0 },
    ],
    members: [{ id: 'm1', startNodeId: 'n1', endNodeId: 'n2', label: '' }],
    supports: [{ id: 's1', nodeId: 'n1', type: 'fixed' }],
    loads: [],
  }
}

describe('structures API module', () => {
  it('lists the saved structures', async () => {
    const list = await listStructures()
    expect(list.map((s) => s.name)).toContain('Simply supported beam')
  })

  it('creates, reads, updates, and deletes a structure through the API', async () => {
    const created = await createStructure(draft())
    expect(created.id).toMatch(/^str_/)
    expect(created.name).toBe('Truss')
    expect(created.members[0]).toEqual({ id: 'm1', startNodeId: 'n1', endNodeId: 'n2' })

    const loaded = await getStructure(created.id)
    expect(loaded).toEqual(created)

    const updated = await updateStructure(created.id, { ...loaded, name: 'Renamed' })
    expect(updated.name).toBe('Renamed')
    expect((await listStructures())[0]?.name).toBe('Renamed')

    await deleteStructure(created.id)
    await expect(getStructure(created.id)).rejects.toMatchObject({ status: 404, code: 'not_found' })
  })

  it('saveStructure creates without an id and updates with one', async () => {
    const created = await saveStructure(draft())
    const updated = await saveStructure({ ...created, description: 'More' })
    expect(updated.id).toBe(created.id)
    expect(updated.description).toBe('More')
  })

  it('surfaces validation errors from the API with field messages', async () => {
    const invalid = { ...draft(), name: '' }
    const error = await createStructure(invalid).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 'validation_failed' })
    expect((error as ApiError).fields.name).toBe('Enter a name for the structure.')
  })

  it('maps network failures and unknown errors to readable messages', async () => {
    server.use(http.get(`${API_BASE_URL}/structures`, () => HttpResponse.error()))
    const error = await listStructures().catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'network_error' })
    expect(errorMessage(error)).toMatch(/Could not reach the server/)
    expect(errorMessage(new Error('x'))).toBe('Something went wrong. Please try again.')

    server.use(http.get(`${API_BASE_URL}/boom`, () => new HttpResponse('oops', { status: 500 })))
    await expect(apiRequest('/boom')).rejects.toMatchObject({
      status: 500,
      message: 'The server returned an error (500).',
    })
  })
})

describe('useStructures', () => {
  it('loads the list with visible status', async () => {
    const s = useStructures()
    const pending = s.refreshList()
    expect(s.listStatus.value).toBe('loading')
    await pending
    expect(s.listStatus.value).toBe('success')
    expect(s.summaries.value.length).toBeGreaterThan(0)
  })

  it('reports a list error', async () => {
    server.use(
      http.get(`${API_BASE_URL}/structures`, () =>
        HttpResponse.json(
          { error: { code: 'down', message: 'Service unavailable.' } },
          { status: 503 },
        ),
      ),
    )
    const s = useStructures()
    await s.refreshList()
    expect(s.listStatus.value).toBe('error')
    expect(s.listError.value).toBe('Service unavailable.')
  })

  it('reports not-found when loading a missing structure', async () => {
    const s = useStructures()
    expect(await s.load('str_missing')).toBeNull()
    expect(s.notFound.value).toBe(true)
    expect(s.loadError.value).toMatch(/doesn’t exist/)
  })

  it('saves, adds the result to the list, and exposes field errors on failure', async () => {
    const s = useStructures()
    const saved = await s.save(draft('Portal'))
    expect(saved?.name).toBe('Portal')
    expect(s.saveStatus.value).toBe('success')
    expect(s.summaries.value[0]?.name).toBe('Portal')

    expect(await s.save({ ...draft(), name: '' })).toBeNull()
    expect(s.saveStatus.value).toBe('error')
    expect(s.saveFieldErrors.value.name).toBeTruthy()
  })

  it('refuses to delete a structure used by a question', async () => {
    server.use(
      http.delete(`${API_BASE_URL}/structures/:id`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'conflict',
              message: 'This structure is used by a question and can’t be deleted.',
            },
          },
          { status: 409 },
        ),
      ),
    )
    const s = useStructures()
    expect(await s.remove('str_simplebeam')).toBe(false)
    expect(s.deleteError.value).toMatch(/used by a question/)
  })
})
