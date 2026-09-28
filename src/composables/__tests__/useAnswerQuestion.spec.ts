import { describe, it, expect, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/__tests__/setup'
import { API_BASE_URL } from '@/api/client'
import { useQuestionBuilder } from '../useQuestionBuilder'
import { useAnswerQuestion } from '../useAnswerQuestion'
import { getDb } from '@/mocks/db'

/** Creates and shares a question through the API, as the builder does. */
async function shareQuestion() {
  const b = useQuestionBuilder()
  b.update({
    title: 'Reaction at A',
    prompt: 'What is the vertical reaction at A?',
    structureId: 'str_simplebeam',
    explanation: 'Half of 10 kN.',
  })
  b.setOptionText(b.draft.value.options[0]!.key, '0 kN')
  b.setOptionText(b.draft.value.options[1]!.key, '5 kN')
  b.setCorrectOption(b.draft.value.options[1]!.key)
  await b.save()
  const share = await b.requestShare()
  return share!.shareId
}

/** Waits until the initial load (started by the composable itself) has finished. */
async function loaded(a: ReturnType<typeof useAnswerQuestion>) {
  await vi.waitFor(() => expect(a.loadStatus.value).not.toBe('loading'))
}

describe('useAnswerQuestion', () => {
  it('loads the shared question with its structure and without correct flags', async () => {
    const shareId = await shareQuestion()
    const a = useAnswerQuestion(shareId)
    expect(a.loadStatus.value).toBe('loading')
    await loaded(a)
    expect(a.loadStatus.value).toBe('success')
    expect(a.question.value?.title).toBe('Reaction at A')
    expect(a.question.value?.structure?.name).toBe('Simply supported beam')
    expect(a.question.value?.options.map((o) => o.text)).toEqual(['0 kN', '5 kN'])
    expect(a.question.value?.options[0]).not.toHaveProperty('correct')
  })

  it('reports an unknown share code as not found', async () => {
    const a = useAnswerQuestion('NOPE1234')
    await loaded(a)
    expect(a.loadStatus.value).toBe('error')
    expect(a.notFound.value).toBe(true)
    expect(a.loadError.value).toMatch(/invalid or the question is no longer shared/)
  })

  it('reports other load failures and can retry', async () => {
    const shareId = await shareQuestion()
    server.use(
      http.get(`${API_BASE_URL}/shared/:shareId`, () => HttpResponse.error(), { once: true }),
    )
    const a = useAnswerQuestion(shareId)
    await loaded(a)
    expect(a.loadStatus.value).toBe('error')
    expect(a.notFound.value).toBe(false)
    expect(a.loadError.value).toMatch(/Could not reach the server/)
    await a.load()
    expect(a.loadStatus.value).toBe('success')
  })

  it('keeps submit disabled until an answer is chosen', async () => {
    const a = useAnswerQuestion(await shareQuestion())
    await loaded(a)
    expect(a.canSubmit.value).toBe(false)
    expect(a.validationError.value).toBe('Choose an answer.')
    expect(await a.submit()).toBeNull()
    expect(a.attempted.value).toBe(true)
    a.select(a.question.value!.options[0]!.id)
    expect(a.canSubmit.value).toBe(true)
    expect(a.validationError.value).toBeUndefined()
  })

  it('submits the answer through the API and shows the result', async () => {
    const a = useAnswerQuestion(await shareQuestion())
    await loaded(a)
    const [wrong, right] = a.question.value!.options
    a.select(wrong!.id)
    const pending = a.submit()
    expect(a.submitStatus.value).toBe('loading')
    expect(a.isSubmitting.value).toBe(true)
    expect(a.canSubmit.value).toBe(false)
    const result = await pending
    expect(a.submitStatus.value).toBe('success')
    expect(result).toMatchObject({
      correct: false,
      correctOptionId: right!.id,
      explanation: 'Half of 10 kN.',
    })
    expect(a.isSubmitted.value).toBe(true)
    expect(getDb().answers).toHaveLength(1)
    expect(getDb().answers[0]).toMatchObject({ optionId: wrong!.id, correct: false })
  })

  it('prevents duplicate submissions while sending and after the result', async () => {
    server.use(
      http.post(`${API_BASE_URL}/shared/:shareId/answers`, async ({ request }) => {
        await delay(20)
        const { optionId } = (await request.json()) as { optionId: string }
        return HttpResponse.json({
          answerId: 'ans_1',
          correct: true,
          correctOptionId: optionId,
          submittedAt: new Date().toISOString(),
        })
      }),
    )
    const a = useAnswerQuestion(await shareQuestion())
    await loaded(a)
    a.select(a.question.value!.options[1]!.id)
    const first = a.submit()
    const second = a.submit()
    expect(await second).toBeNull()
    expect((await first)?.correct).toBe(true)
    expect(await a.submit()).toBeNull()
    // The selection is locked after submitting.
    a.select(a.question.value!.options[0]!.id)
    expect(a.selectedOptionId.value).toBe(a.question.value!.options[1]!.id)
  })

  it('shows submit errors and allows another try', async () => {
    server.use(
      http.post(
        `${API_BASE_URL}/shared/:shareId/answers`,
        () =>
          HttpResponse.json(
            { error: { code: 'unavailable', message: 'Answers are closed for now.' } },
            { status: 503 },
          ),
        { once: true },
      ),
    )
    const a = useAnswerQuestion(await shareQuestion())
    await loaded(a)
    a.select(a.question.value!.options[1]!.id)
    expect(await a.submit()).toBeNull()
    expect(a.submitStatus.value).toBe('error')
    expect(a.submitError.value).toBe('Answers are closed for now.')
    expect(a.canSubmit.value).toBe(true)
    expect((await a.submit())?.correct).toBe(true)
  })

  it('reloads when the share id changes and resets the answer', async () => {
    const first = await shareQuestion()
    const id = ref<string | undefined>(first)
    const a = useAnswerQuestion(id)
    await loaded(a)
    a.select(a.question.value!.options[0]!.id)
    id.value = undefined
    await nextTick()
    expect(a.loadStatus.value).toBe('idle')
    expect(a.question.value).toBeNull()
    expect(a.selectedOptionId.value).toBeNull()
  })
})
