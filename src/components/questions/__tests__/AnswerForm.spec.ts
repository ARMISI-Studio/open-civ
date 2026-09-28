import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnswerForm from '../AnswerForm.vue'
import type { AnswerQuestionState } from '@/composables/useAnswerQuestion'
import { computed, ref } from 'vue'
import type { AnswerResult, SharedQuestion } from '@/domain/answers'
import { validateAnswer } from '@/domain/answers'
import type { RequestStatus } from '@/composables/useStructures'

const question: SharedQuestion = {
  shareId: 'ABCD2345',
  title: 'Reaction',
  prompt: 'Find it',
  answerType: 'multipleChoice',
  options: [
    { id: 'opt_a', text: '0 kN' },
    { id: 'opt_b', text: '5 kN' },
  ],
  structure: null,
}

/** A minimal stand-in for useAnswerQuestion so the form can be tested in isolation. */
function fakeState() {
  const selectedOptionId = ref<string | null>(null)
  const submitStatus = ref<RequestStatus>('idle')
  const result = ref<AnswerResult | null>(null)
  const attempted = ref(false)
  const state = {
    question: ref(question),
    selectedOptionId,
    attempted,
    submitStatus,
    submitError: ref<string | null>(null),
    result,
    isSubmitted: computed(() => result.value !== null),
    isSubmitting: computed(() => submitStatus.value === 'loading'),
    validationError: computed(() => validateAnswer(question, selectedOptionId.value)),
    select: (id: string) => (selectedOptionId.value = id),
  }
  return state as unknown as AnswerQuestionState & typeof state
}

describe('AnswerForm', () => {
  it('renders options as full-width radio rows and disables submit until one is chosen', async () => {
    const state = fakeState()
    const w = mount(AnswerForm, { props: { state } })
    const radios = w.findAll('input[type="radio"]')
    expect(radios).toHaveLength(2)
    expect(w.findAll('label.answer-form__option').map((l) => l.text())).toEqual(['0 kN', '5 kN'])
    const submit = w.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Choose an answer to submit.')

    await radios[1]!.setValue(true)
    expect(state.selectedOptionId.value).toBe('opt_b')
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(w.get('.answer-form__option--selected').text()).toBe('5 kN')
    await w.get('form').trigger('submit')
    expect(w.emitted('submit')).toHaveLength(1)
  })

  it('locks the options and shows a spinner while submitting', async () => {
    const state = fakeState()
    state.selectedOptionId.value = 'opt_a'
    state.submitStatus.value = 'loading'
    const w = mount(AnswerForm, { props: { state } })
    expect(w.get('fieldset').attributes('disabled')).toBeDefined()
    const submit = w.get('button[type="submit"]')
    expect(submit.text()).toContain('Submitting…')
    expect(submit.attributes('aria-busy')).toBe('true')
    expect(submit.attributes('disabled')).toBeDefined()
  })

  it('shows the result, marks the correct answer, and removes the submit button', () => {
    const state = fakeState()
    state.selectedOptionId.value = 'opt_a'
    state.result.value = {
      answerId: 'ans_1',
      correct: false,
      correctOptionId: 'opt_b',
      explanation: 'Half of 10 kN.',
      submittedAt: '',
    }
    const w = mount(AnswerForm, { props: { state } })
    expect(w.find('button[type="submit"]').exists()).toBe(false)
    expect(w.get('fieldset').attributes('disabled')).toBeDefined()
    expect(w.get('.answer-form__option--incorrect').text()).toContain('✗ Your answer')
    expect(w.get('.answer-form__option--correct').text()).toContain('✓ Correct answer')
    expect(w.get('[role="status"]').text()).toContain('Not quite.')
    expect(w.text()).toContain('Half of 10 kN.')
  })

  it('shows submit errors and validation messages', () => {
    const state = fakeState()
    state.attempted.value = true
    state.submitStatus.value = 'error'
    state.submitError.value = 'Answers are closed.'
    const w = mount(AnswerForm, { props: { state } })
    const alerts = w.findAll('[role="alert"]').map((a) => a.text())
    expect(alerts.some((t) => t.includes('Choose an answer.'))).toBe(true)
    expect(
      alerts.some((t) => t.includes('Could not submit your answer. Answers are closed.')),
    ).toBe(true)
    expect(w.get('fieldset').attributes('aria-invalid')).toBe('true')
  })
})
