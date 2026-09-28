import type { AnswerResult, SharedQuestion } from '@/domain/answers'
import { apiRequest } from './client'
import { toStructure } from './structures'
import type { AnswerInputDto, AnswerResultDto, SharedQuestionDto } from './types'

export function toSharedQuestion(dto: SharedQuestionDto): SharedQuestion {
  return {
    shareId: dto.shareId,
    title: dto.title,
    prompt: dto.prompt,
    answerType: dto.answerType,
    options: dto.options.map((o) => ({ id: o.id, text: o.text })),
    structure: dto.structure ? toStructure(dto.structure) : null,
  }
}

function toAnswerResult(dto: AnswerResultDto): AnswerResult {
  return {
    answerId: dto.answerId,
    correct: dto.correct,
    correctOptionId: dto.correctOptionId,
    explanation: dto.explanation,
    submittedAt: dto.submittedAt,
  }
}

export async function getSharedQuestion(shareId: string): Promise<SharedQuestion> {
  return toSharedQuestion(
    await apiRequest<SharedQuestionDto>(`/shared/${encodeURIComponent(shareId)}`),
  )
}

export async function submitAnswer(shareId: string, optionId: string): Promise<AnswerResult> {
  const body: AnswerInputDto = { optionId }
  return toAnswerResult(
    await apiRequest<AnswerResultDto>(`/shared/${encodeURIComponent(shareId)}/answers`, {
      method: 'POST',
      body,
    }),
  )
}
