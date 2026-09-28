import type { Question, QuestionDraft, QuestionShare, QuestionSummary } from '@/domain/questions'
import { apiRequest } from './client'
import type { QuestionDto, QuestionInputDto, QuestionShareDto, QuestionSummaryDto } from './types'

function toShare(dto: QuestionShareDto): QuestionShare {
  return { shareId: dto.shareId, url: dto.url, createdAt: dto.createdAt }
}

export function toQuestion(dto: QuestionDto): Question {
  return {
    id: dto.id,
    title: dto.title,
    prompt: dto.prompt,
    structureId: dto.structureId,
    answerType: dto.answerType,
    options: dto.options?.map((o) => ({ id: o.id, text: o.text, correct: o.correct })),
    explanation: dto.explanation,
    share: dto.share ? toShare(dto.share) : undefined,
  }
}

export function toQuestionInput(draft: QuestionDraft): QuestionInputDto {
  return {
    title: draft.title.trim(),
    prompt: draft.prompt.trim(),
    structureId: draft.structureId ?? undefined,
    answerType: draft.answerType,
    options: draft.options.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      text: o.text.trim(),
      correct: o.correct,
    })),
    explanation: draft.explanation.trim() || undefined,
  }
}

export async function listQuestions(): Promise<QuestionSummary[]> {
  return (await apiRequest<QuestionSummaryDto[]>('/questions')).map((q) => ({
    id: q.id,
    title: q.title,
    structureId: q.structureId,
    structureName: q.structureName,
    share: q.share ? toShare(q.share) : undefined,
    updatedAt: q.updatedAt,
  }))
}

export async function getQuestion(id: string): Promise<Question> {
  return toQuestion(await apiRequest<QuestionDto>(`/questions/${encodeURIComponent(id)}`))
}

export async function createQuestion(draft: QuestionDraft): Promise<Question> {
  return toQuestion(
    await apiRequest<QuestionDto>('/questions', { method: 'POST', body: toQuestionInput(draft) }),
  )
}

export async function updateQuestion(id: string, draft: QuestionDraft): Promise<Question> {
  return toQuestion(
    await apiRequest<QuestionDto>(`/questions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: toQuestionInput(draft),
    }),
  )
}

/** Creates the question when it has no id yet, otherwise updates it. */
export function saveQuestion(draft: QuestionDraft): Promise<Question> {
  return draft.id ? updateQuestion(draft.id, draft) : createQuestion(draft)
}

/** Asks the API for a share link. Sharing an already shared question returns the same link. */
export async function shareQuestion(id: string): Promise<QuestionShare> {
  return toShare(
    await apiRequest<QuestionShareDto>(`/questions/${encodeURIComponent(id)}/share`, {
      method: 'POST',
    }),
  )
}
