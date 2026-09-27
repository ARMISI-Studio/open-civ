/** Question domain model and the validation rules the builder form enforces. */

export type AnswerType = 'multipleChoice' | 'shortAnswer'

export const ANSWER_TYPES: {
  value: AnswerType
  label: string
  description: string
  disabled?: boolean
}[] = [
  {
    value: 'multipleChoice',
    label: 'Multiple choice',
    description: 'Respondents pick one option.',
  },
  {
    value: 'shortAnswer',
    label: 'Short answer',
    description: 'Not available yet: needs grading rules from the backend.',
    disabled: true,
  },
]

export interface QuestionOption {
  id: string
  text: string
  correct: boolean
}

/** Share result returned by the API. The frontend never creates share ids itself. */
export interface QuestionShare {
  shareId: string
  url: string
  createdAt: string
}

export interface Question {
  id: string
  title: string
  prompt: string
  structureId?: string
  answerType: AnswerType
  options?: QuestionOption[]
  explanation?: string
  share?: QuestionShare
}

/** An option while editing. `key` is a local list key; `id` exists once the API has saved it. */
export interface QuestionOptionDraft {
  key: string
  id?: string
  text: string
  correct: boolean
}

export interface QuestionDraft {
  id?: string
  title: string
  prompt: string
  structureId: string | null
  answerType: AnswerType
  options: QuestionOptionDraft[]
  explanation: string
}

export const QUESTION_LIMITS = {
  title: 120,
  prompt: 1000,
  explanation: 2000,
  option: 200,
  minOptions: 2,
  maxOptions: 6,
} as const

export interface QuestionErrors {
  title?: string
  prompt?: string
  structure?: string
  answerType?: string
  options?: string
  explanation?: string
  /** Messages for individual options, keyed by option key. */
  optionText: Record<string, string>
}

let localKey = 0
export function newOptionDraft(text = '', correct = false): QuestionOptionDraft {
  localKey += 1
  return { key: `option-${localKey}`, text, correct }
}

export function createEmptyQuestion(): QuestionDraft {
  return {
    title: '',
    prompt: '',
    structureId: null,
    answerType: 'multipleChoice',
    options: [newOptionDraft(), newOptionDraft()],
    explanation: '',
  }
}

export function questionToDraft(question: Question): QuestionDraft {
  return {
    id: question.id,
    title: question.title,
    prompt: question.prompt,
    structureId: question.structureId ?? null,
    answerType: question.answerType,
    options: (question.options ?? []).map((o) => ({
      ...newOptionDraft(o.text, o.correct),
      id: o.id,
    })),
    explanation: question.explanation ?? '',
  }
}

/**
 * Checks a question draft. `requireStructure` is false when a new structure is being drawn
 * alongside the question (it is validated by the structure editor instead).
 */
export function validateQuestion(
  draft: QuestionDraft,
  { requireStructure = true }: { requireStructure?: boolean } = {},
): QuestionErrors {
  const errors: QuestionErrors = { optionText: {} }
  const title = draft.title.trim()
  if (!title) errors.title = 'Enter a title.'
  else if (title.length > QUESTION_LIMITS.title)
    errors.title = `Use at most ${QUESTION_LIMITS.title} characters.`

  const prompt = draft.prompt.trim()
  if (!prompt) errors.prompt = 'Enter the question prompt.'
  else if (prompt.length > QUESTION_LIMITS.prompt)
    errors.prompt = `Use at most ${QUESTION_LIMITS.prompt} characters.`

  if (requireStructure && !draft.structureId)
    errors.structure = 'Choose a structure for this question.'

  if (draft.answerType !== 'multipleChoice') {
    errors.answerType = 'Only multiple choice questions are available.'
  } else {
    const options = draft.options
    if (options.length < QUESTION_LIMITS.minOptions) {
      errors.options = `Add at least ${QUESTION_LIMITS.minOptions} options.`
    } else if (options.length > QUESTION_LIMITS.maxOptions) {
      errors.options = `Use at most ${QUESTION_LIMITS.maxOptions} options.`
    }
    const seen = new Map<string, string>()
    for (const option of options) {
      const text = option.text.trim()
      if (!text) {
        errors.optionText[option.key] = 'Enter the option text.'
      } else if (text.length > QUESTION_LIMITS.option) {
        errors.optionText[option.key] = `Use at most ${QUESTION_LIMITS.option} characters.`
      } else if (seen.has(text.toLowerCase())) {
        errors.optionText[option.key] = 'This option repeats another one.'
      } else {
        seen.set(text.toLowerCase(), option.key)
      }
    }
    const correct = options.filter((o) => o.correct).length
    if (!errors.options) {
      if (correct === 0) errors.options = 'Mark the correct option.'
      else if (correct > 1) errors.options = 'Mark only one correct option.'
    }
  }

  if (draft.explanation.trim().length > QUESTION_LIMITS.explanation)
    errors.explanation = `Use at most ${QUESTION_LIMITS.explanation} characters.`

  return errors
}

export function hasQuestionErrors(errors: QuestionErrors): boolean {
  const { optionText, ...rest } = errors
  return Object.values(rest).some(Boolean) || Object.keys(optionText).length > 0
}

export function countQuestionErrors(errors: QuestionErrors): number {
  const { optionText, ...rest } = errors
  return Object.values(rest).filter(Boolean).length + Object.keys(optionText).length
}
