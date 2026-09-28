import type { AnswerType } from './questions'
import type { Structure } from './structures'

/** A question as a respondent sees it: no correct flags, structure included. */
export interface SharedQuestion {
  shareId: string
  title: string
  prompt: string
  answerType: AnswerType
  options: { id: string; text: string }[]
  structure: Structure | null
}

export interface AnswerResult {
  answerId: string
  correct: boolean
  correctOptionId: string
  explanation?: string
  submittedAt: string
}

/** Returns a message when the selection cannot be submitted, otherwise undefined. */
export function validateAnswer(
  question: SharedQuestion,
  optionId: string | null,
): string | undefined {
  if (!optionId) return 'Choose an answer.'
  if (!question.options.some((o) => o.id === optionId)) return 'Choose one of the listed answers.'
  return undefined
}

const SHARE_CODE = /^[A-Za-z0-9_-]{4,64}$/

/**
 * Accepts a bare share code or a full share link and returns the code, or null when the
 * input is neither.
 */
export function parseShareInput(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  let candidate = value
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    try {
      const url = new URL(value, 'http://placeholder.invalid')
      const segments = url.pathname.split('/').filter(Boolean)
      candidate = segments[segments.length - 1] ?? ''
    } catch {
      return null
    }
  }
  return SHARE_CODE.test(candidate) ? candidate.toUpperCase() : null
}
