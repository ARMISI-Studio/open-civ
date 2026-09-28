import { describe, it, expect } from 'vitest'
import { parseShareInput, validateAnswer, type SharedQuestion } from '../answers'

const question: SharedQuestion = {
  shareId: 'ABCD2345',
  title: 'T',
  prompt: 'P',
  answerType: 'multipleChoice',
  options: [
    { id: 'opt_a', text: 'A' },
    { id: 'opt_b', text: 'B' },
  ],
  structure: null,
}

describe('validateAnswer', () => {
  it('requires a choice from the listed options', () => {
    expect(validateAnswer(question, null)).toBe('Choose an answer.')
    expect(validateAnswer(question, 'opt_x')).toBe('Choose one of the listed answers.')
    expect(validateAnswer(question, 'opt_b')).toBeUndefined()
  })
})

describe('parseShareInput', () => {
  it.each([
    ['ABCD2345', 'ABCD2345'],
    ['  abcd2345 ', 'ABCD2345'],
    ['http://localhost:5173/answers/K7QM2XPA', 'K7QM2XPA'],
    ['http://localhost:5173/questions/answer/K7QM2XPA', 'K7QM2XPA'],
    ['https://example.com/answers/K7QM2XPA/', 'K7QM2XPA'],
    ['/answers/K7QM2XPA', 'K7QM2XPA'],
  ])('reads %s as %s', (input, expected) => {
    expect(parseShareInput(input)).toBe(expected)
  })

  it.each(['', '   ', 'ab', 'not a code!', 'https://example.com/'])('rejects %j', (input) => {
    expect(parseShareInput(input)).toBeNull()
  })
})
