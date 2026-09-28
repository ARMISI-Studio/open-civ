import { describe, it, expect } from 'vitest'
import {
  type QuestionDraft,
  countQuestionErrors,
  createEmptyQuestion,
  hasQuestionErrors,
  newOptionDraft,
  questionToDraft,
  validateQuestion,
} from '../questions'

function valid(): QuestionDraft {
  return {
    title: 'Support reaction',
    prompt: 'What is the reaction at A?',
    structureId: 'str_simplebeam',
    answerType: 'multipleChoice',
    options: [newOptionDraft('0 kN'), newOptionDraft('5 kN', true), newOptionDraft('10 kN')],
    explanation: '',
  }
}

describe('validateQuestion', () => {
  it('accepts a complete multiple choice question', () => {
    const errors = validateQuestion(valid())
    expect(hasQuestionErrors(errors)).toBe(false)
    expect(countQuestionErrors(errors)).toBe(0)
  })

  it('requires title, prompt, and a structure', () => {
    const q = { ...valid(), title: ' ', prompt: '', structureId: null }
    const errors = validateQuestion(q)
    expect(errors.title).toBe('Enter a title.')
    expect(errors.prompt).toBe('Enter the question prompt.')
    expect(errors.structure).toBe('Choose a structure for this question.')
    expect(countQuestionErrors(errors)).toBe(3)
  })

  it('does not require a saved structure when a new one is drawn', () => {
    const q = { ...valid(), structureId: null }
    expect(validateQuestion(q, { requireStructure: false }).structure).toBeUndefined()
  })

  it('enforces length limits', () => {
    const q = {
      ...valid(),
      title: 'x'.repeat(121),
      prompt: 'x'.repeat(1001),
      explanation: 'x'.repeat(2001),
    }
    const errors = validateQuestion(q)
    expect(errors.title).toMatch(/at most 120/)
    expect(errors.prompt).toMatch(/at most 1000/)
    expect(errors.explanation).toMatch(/at most 2000/)
  })

  it('requires 2 to 6 options', () => {
    const q = valid()
    q.options = [newOptionDraft('only', true)]
    expect(validateQuestion(q).options).toBe('Add at least 2 options.')
    q.options = Array.from({ length: 7 }, (_, i) => newOptionDraft(`o${i}`, i === 0))
    expect(validateQuestion(q).options).toBe('Use at most 6 options.')
  })

  it('requires exactly one correct option', () => {
    const q = valid()
    q.options.forEach((o) => (o.correct = false))
    expect(validateQuestion(q).options).toBe('Mark the correct option.')
    q.options.forEach((o) => (o.correct = true))
    expect(validateQuestion(q).options).toBe('Mark only one correct option.')
  })

  it('flags blank and repeated option text per option', () => {
    const q = valid()
    q.options[0]!.text = ''
    q.options[2]!.text = ' 5 KN '
    const errors = validateQuestion(q)
    expect(errors.optionText[q.options[0]!.key]).toBe('Enter the option text.')
    expect(errors.optionText[q.options[2]!.key]).toBe('This option repeats another one.')
    expect(errors.optionText[q.options[1]!.key]).toBeUndefined()
    expect(countQuestionErrors(errors)).toBe(2)
  })

  it('rejects short answer until grading rules exist', () => {
    const q = { ...valid(), answerType: 'shortAnswer' as const }
    expect(validateQuestion(q).answerType).toBe('Only multiple choice questions are available.')
  })
})

describe('question drafts', () => {
  it('starts empty with two blank options and unique keys', () => {
    const q = createEmptyQuestion()
    expect(q.options).toHaveLength(2)
    expect(new Set(q.options.map((o) => o.key)).size).toBe(2)
    expect(q.answerType).toBe('multipleChoice')
  })

  it('converts a saved question back into a draft keeping option ids', () => {
    const draft = questionToDraft({
      id: 'q_1',
      title: 'T',
      prompt: 'P',
      structureId: 's',
      answerType: 'multipleChoice',
      options: [{ id: 'opt_1', text: 'A', correct: true }],
    })
    expect(draft).toMatchObject({ id: 'q_1', structureId: 's', explanation: '' })
    expect(draft.options[0]).toMatchObject({ id: 'opt_1', text: 'A', correct: true })
  })
})
