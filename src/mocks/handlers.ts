import { delay, http, HttpResponse, type RequestHandler } from 'msw'
import { API_BASE_URL, type ApiErrorBody } from '@/api/client'
import type {
  AnswerInputDto,
  AnswerResultDto,
  QuestionDto,
  QuestionInputDto,
  QuestionShareDto,
  QuestionSummaryDto,
  SharedQuestionDto,
  SharedQuestionSummaryDto,
  StructureDto,
  StructureInputDto,
  StructureSummaryDto,
} from '@/api/types'
import { validateStructure } from '@/domain/structures'
import { newOptionDraft, validateQuestion } from '@/domain/questions'
import { type MockDb, getDb, newId, newShareId, now, persist } from './db'
import { resolveConfig, simulate } from './simulation'

const api = (path: string) => `${API_BASE_URL}${path}`

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
    const summaries: StructureSummaryDto[] = [...getDb().structures]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ id, name, description, updatedAt }) => ({ id, name, description, updatedAt }))
    return HttpResponse.json(summaries)
  }),

  http.post<never, StructureInputDto>(api('/structures'), async ({ request }) => {
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
    const structure = getDb().structures.find((s) => s.id === params.id)
    return structure ? HttpResponse.json(structure) : notFound('Structure')
  }),

  http.put<{ id: string }, StructureInputDto>(
    api('/structures/:id'),
    async ({ params, request }) => {
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

// --- Questions and sharing -------------------------------------------------------------------

type StoredQuestion = MockDb['questions'][number]

/** Public link for a share id. The route is decided here, on the "server". */
function shareUrl(request: Request, shareId: string) {
  return `${new URL(request.url).origin}/answers/${shareId}`
}

function toQuestionDto(question: StoredQuestion, request: Request): QuestionDto {
  const share = getDb().shares.find((s) => s.questionId === question.id)
  return {
    ...question,
    share: share
      ? {
          shareId: share.shareId,
          url: shareUrl(request, share.shareId),
          createdAt: share.createdAt,
        }
      : undefined,
  }
}

function validateQuestionInput(body: QuestionInputDto) {
  if (!body || typeof body.title !== 'string' || typeof body.prompt !== 'string') {
    return errorResponse(400, 'bad_request', 'The question data is malformed.')
  }
  const options = (body.options ?? []).map((o) => ({ ...newOptionDraft(o.text, o.correct) }))
  const errors = validateQuestion({
    title: body.title,
    prompt: body.prompt,
    structureId: body.structureId ?? null,
    answerType: body.answerType,
    options,
    explanation: body.explanation ?? '',
  })
  const fields: Record<string, string> = {}
  for (const key of ['title', 'prompt', 'answerType', 'options', 'explanation'] as const) {
    if (errors[key]) fields[key] = errors[key]!
  }
  if (errors.structure) fields.structureId = errors.structure
  if (Object.keys(errors.optionText).length) fields.options ??= 'Every option needs unique text.'
  if (body.structureId && !getDb().structures.some((s) => s.id === body.structureId)) {
    fields.structureId = 'The chosen structure no longer exists.'
  }
  return Object.keys(fields).length
    ? errorResponse(422, 'validation_failed', 'The question has problems.', fields)
    : null
}

function storedOptions(body: QuestionInputDto, previous: StoredQuestion['options'] = []) {
  const known = new Set(previous.map((o) => o.id))
  return (body.options ?? []).map((o) => ({
    id: o.id && known.has(o.id) ? o.id : newId('opt'),
    text: o.text,
    correct: o.correct,
  }))
}

const questionHandlers: RequestHandler[] = [
  http.get(api('/questions'), async ({ request }) => {
    const db = getDb()
    const summaries: QuestionSummaryDto[] = [...db.questions]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((q) => ({
        id: q.id,
        title: q.title,
        structureId: q.structureId,
        structureName: db.structures.find((s) => s.id === q.structureId)?.name,
        share: toQuestionDto(q, request).share,
        updatedAt: q.updatedAt,
      }))
    return HttpResponse.json(summaries)
  }),

  http.post<never, QuestionInputDto>(api('/questions'), async ({ request }) => {
    const body = await request.json()
    const invalid = validateQuestionInput(body)
    if (invalid) return invalid
    const timestamp = now()
    const question: StoredQuestion = {
      id: newId('q'),
      title: body.title,
      prompt: body.prompt,
      structureId: body.structureId,
      answerType: body.answerType,
      options: storedOptions(body),
      explanation: body.explanation,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    getDb().questions.push(question)
    persist()
    return HttpResponse.json(toQuestionDto(question, request), { status: 201 })
  }),

  http.get<{ id: string }>(api('/questions/:id'), async ({ params, request }) => {
    const question = getDb().questions.find((q) => q.id === params.id)
    return question ? HttpResponse.json(toQuestionDto(question, request)) : notFound('Question')
  }),

  http.put<{ id: string }, QuestionInputDto>(api('/questions/:id'), async ({ params, request }) => {
    const db = getDb()
    const index = db.questions.findIndex((q) => q.id === params.id)
    if (index === -1) return notFound('Question')
    const body = await request.json()
    const invalid = validateQuestionInput(body)
    if (invalid) return invalid
    const previous = db.questions[index]!
    const question: StoredQuestion = {
      ...previous,
      title: body.title,
      prompt: body.prompt,
      structureId: body.structureId,
      answerType: body.answerType,
      options: storedOptions(body, previous.options),
      explanation: body.explanation,
      updatedAt: now(),
    }
    db.questions[index] = question
    persist()
    return HttpResponse.json(toQuestionDto(question, request))
  }),

  http.post<{ id: string }>(api('/questions/:id/share'), async ({ params, request }) => {
    const db = getDb()
    const question = db.questions.find((q) => q.id === params.id)
    if (!question) return notFound('Question')
    if (question.structureId && !db.structures.some((s) => s.id === question.structureId)) {
      return errorResponse(409, 'conflict', 'The structure for this question no longer exists.')
    }
    let share = db.shares.find((s) => s.questionId === question.id)
    if (!share) {
      share = { shareId: newShareId(), questionId: question.id, createdAt: now() }
      db.shares.push(share)
      persist()
    }
    const dto: QuestionShareDto = {
      shareId: share.shareId,
      url: shareUrl(request, share.shareId),
      createdAt: share.createdAt,
    }
    return HttpResponse.json(dto, { status: 201 })
  }),
]

// --- Shared questions and answers -----------------------------------------------------------

function findShared(shareId: string) {
  const db = getDb()
  const share = db.shares.find((s) => s.shareId === shareId.toUpperCase())
  const question = share && db.questions.find((q) => q.id === share.questionId)
  return share && question ? { share, question } : null
}

const shareNotFound = () =>
  errorResponse(404, 'not_found', 'This share link is invalid or the question is no longer shared.')

const answerHandlers: RequestHandler[] = [
  // No accounts yet: every currently shared question is available to answer.
  http.get(api('/shared'), async () => {
    const db = getDb()
    const summaries: SharedQuestionSummaryDto[] = [...db.shares]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .flatMap((share) => {
        const question = db.questions.find((q) => q.id === share.questionId)
        if (!question) return []
        return [
          {
            shareId: share.shareId,
            title: question.title,
            prompt: question.prompt,
            structureName: db.structures.find((s) => s.id === question.structureId)?.name,
            sharedAt: share.createdAt,
          },
        ]
      })
    return HttpResponse.json(summaries)
  }),

  http.get<{ shareId: string }>(api('/shared/:shareId'), async ({ params }) => {
    const found = findShared(params.shareId)
    if (!found) return shareNotFound()
    const { share, question } = found
    const structure = getDb().structures.find((s) => s.id === question.structureId) ?? null
    const dto: SharedQuestionDto = {
      shareId: share.shareId,
      title: question.title,
      prompt: question.prompt,
      answerType: question.answerType,
      options: (question.options ?? []).map(({ id, text }) => ({ id, text })),
      structure,
    }
    return HttpResponse.json(dto)
  }),

  http.post<{ shareId: string }, AnswerInputDto>(
    api('/shared/:shareId/answers'),
    async ({ params, request }) => {
      const found = findShared(params.shareId)
      if (!found) return shareNotFound()
      const body = await request.json()
      const options = found.question.options ?? []
      const chosen = options.find((o) => o.id === body?.optionId)
      if (!chosen) {
        return errorResponse(422, 'validation_failed', 'Choose one of the listed answers.', {
          optionId: 'Choose one of the listed answers.',
        })
      }
      const correctOption = options.find((o) => o.correct)!
      const result: AnswerResultDto = {
        answerId: newId('ans'),
        correct: chosen.correct,
        correctOptionId: correctOption.id,
        explanation: found.question.explanation,
        submittedAt: now(),
      }
      getDb().answers.push({
        answerId: result.answerId,
        shareId: found.share.shareId,
        optionId: chosen.id,
        correct: chosen.correct,
        submittedAt: result.submittedAt,
      })
      persist()
      return HttpResponse.json(result, { status: 201 })
    },
  ),
]

/**
 * Runs first for every API request: waits and sometimes fails, as set in ./simulation.ts.
 * Returning nothing hands the request on to the real mock handler.
 */
const simulation = resolveConfig()
const apiBasePath = new URL(API_BASE_URL, 'http://localhost').pathname.replace(/\/$/, '')
const simulationHandler = http.all(api('/*'), async ({ request }) => {
  const path = new URL(request.url).pathname.slice(apiBasePath.length)
  const outcome = simulate(simulation, request.method, path)
  await delay(outcome.delayMs)
  if (outcome.failStatus !== null) {
    return errorResponse(
      outcome.failStatus,
      'simulated_failure',
      'The server is not responding right now. Please try again.',
    )
  }
})

export const handlers: RequestHandler[] = [
  simulationHandler,
  ...structureHandlers,
  ...questionHandlers,
  ...answerHandlers,
]
