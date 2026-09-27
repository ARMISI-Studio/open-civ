import { delay, http, HttpResponse, type RequestHandler } from 'msw'
import { API_BASE_URL, type ApiErrorBody } from '@/api/client'
import type { StructureDto, StructureInputDto, StructureSummaryDto } from '@/api/types'
import { validateStructure } from '@/domain/structures'
import { getDb, newId, now, persist } from './db'

const api = (path: string) => `${API_BASE_URL}${path}`

/** Simulated network latency so loading states are visible in the running app. */
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 300

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, fields } }, { status })
}

const notFound = (what: string) => errorResponse(404, 'not_found', `${what} not found.`)

function validateStructureInput(body: StructureInputDto) {
  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.members)) {
    return errorResponse(400, 'bad_request', 'The structure data is malformed.')
  }
  const issues = validateStructure({
    ...body,
    supports: body.supports ?? [],
    loads: body.loads ?? [],
  })
  if (issues.length > 0) {
    const fields: Record<string, string> = {}
    for (const issue of issues) fields[issue.field ?? 'structure'] ??= issue.message
    return errorResponse(422, 'validation_failed', 'The structure has problems.', fields)
  }
  return null
}

const structureHandlers: RequestHandler[] = [
  http.get(api('/structures'), async () => {
    await delay(LATENCY_MS)
    const summaries: StructureSummaryDto[] = [...getDb().structures]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ id, name, description, updatedAt }) => ({ id, name, description, updatedAt }))
    return HttpResponse.json(summaries)
  }),

  http.post<never, StructureInputDto>(api('/structures'), async ({ request }) => {
    await delay(LATENCY_MS)
    const body = await request.json()
    const invalid = validateStructureInput(body)
    if (invalid) return invalid
    const timestamp = now()
    const structure: StructureDto = {
      ...body,
      id: newId('str'),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    getDb().structures.push(structure)
    persist()
    return HttpResponse.json(structure, { status: 201 })
  }),

  http.get<{ id: string }>(api('/structures/:id'), async ({ params }) => {
    await delay(LATENCY_MS)
    const structure = getDb().structures.find((s) => s.id === params.id)
    return structure ? HttpResponse.json(structure) : notFound('Structure')
  }),

  http.put<{ id: string }, StructureInputDto>(
    api('/structures/:id'),
    async ({ params, request }) => {
      await delay(LATENCY_MS)
      const db = getDb()
      const index = db.structures.findIndex((s) => s.id === params.id)
      if (index === -1) return notFound('Structure')
      const body = await request.json()
      const invalid = validateStructureInput(body)
      if (invalid) return invalid
      const structure: StructureDto = {
        ...body,
        id: params.id,
        createdAt: db.structures[index]!.createdAt,
        updatedAt: now(),
      }
      db.structures[index] = structure
      persist()
      return HttpResponse.json(structure)
    },
  ),

  http.delete<{ id: string }>(api('/structures/:id'), async ({ params }) => {
    await delay(LATENCY_MS)
    const db = getDb()
    if (!db.structures.some((s) => s.id === params.id)) return notFound('Structure')
    if (db.questions.some((q) => q.structureId === params.id)) {
      return errorResponse(
        409,
        'conflict',
        'This structure is used by a question and can’t be deleted.',
      )
    }
    db.structures = db.structures.filter((s) => s.id !== params.id)
    persist()
    return new HttpResponse(null, { status: 204 })
  }),
]

export const handlers: RequestHandler[] = [...structureHandlers]
