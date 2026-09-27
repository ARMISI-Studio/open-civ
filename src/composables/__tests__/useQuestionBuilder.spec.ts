import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/setup'
import { API_BASE_URL } from '@/api/client'
import { getStructure } from '@/api/structures'
import { getQuestion } from '@/api/questions'
import { useQuestionBuilder } from '../useQuestionBuilder'

function fillQuestion(b: ReturnType<typeof useQuestionBuilder>) {
  b.update({ title: 'Reaction at A', prompt: 'What is the vertical reaction at A?' })
  b.setOptionText(b.draft.value.options[0]!.key, '0 kN')
  b.setOptionText(b.draft.value.options[1]!.key, '5 kN upward')
  b.setCorrectOption(b.draft.value.options[1]!.key)
}

describe('useQuestionBuilder', () => {
  it('hides validation messages until the first save attempt, then blocks saving', async () => {
    const b = useQuestionBuilder()
    expect(b.errors.value.title).toBeUndefined()
    expect(await b.save()).toBeNull()
    expect(b.saveStatus.value).toBe('idle')
    expect(b.errors.value.title).toBe('Enter a title.')
    expect(b.errors.value.structure).toBe('Choose a structure for this question.')
    expect(b.errors.value.options).toBe('Mark the correct option.')
    expect(Object.keys(b.errors.value.optionText)).toHaveLength(2)
    expect(b.errorCount.value).toBe(6)
  })

  it('manages the option list within its limits', () => {
    const b = useQuestionBuilder()
    expect(b.canRemoveOption.value).toBe(false)
    b.removeOption(b.draft.value.options[0]!.key)
    expect(b.draft.value.options).toHaveLength(2)
    for (let i = 0; i < 6; i++) b.addOption()
    expect(b.draft.value.options).toHaveLength(6)
    expect(b.canAddOption.value).toBe(false)
    const key = b.draft.value.options[3]!.key
    b.setCorrectOption(key)
    expect(b.draft.value.options.filter((o) => o.correct).map((o) => o.key)).toEqual([key])
    b.removeOption(key)
    expect(b.draft.value.options).toHaveLength(5)
  })

  it('creates a question from an existing structure through the API', async () => {
    const b = useQuestionBuilder()
    fillQuestion(b)
    b.update({ structureId: 'str_simplebeam' })
    const pending = b.save()
    expect(b.saveStatus.value).toBe('loading')
    const question = await pending
    expect(b.saveStatus.value).toBe('success')
    expect(question?.id).toMatch(/^q_/)
    expect(b.isSaved.value).toBe(true)
    expect(b.isDirty.value).toBe(false)
    const stored = await getQuestion(question!.id)
    expect(stored).toMatchObject({ title: 'Reaction at A', structureId: 'str_simplebeam' })
    expect(stored.options?.map((o) => [o.text, o.correct])).toEqual([
      ['0 kN', false],
      ['5 kN upward', true],
    ])
    // Option ids now come from the API.
    expect(b.draft.value.options.every((o) => o.id?.startsWith('opt_'))).toBe(true)
  })

  it('creates a new structure with the question when drawing one', async () => {
    const b = useQuestionBuilder()
    fillQuestion(b)
    b.setStructureSource('new')
    expect(await b.save()).toBeNull()
    expect(b.newStructureInvalid.value).toBe(true)

    const s = b.newStructure
    s.updateDetails({ name: 'Two-node beam' })
    const a = s.addNode(0, 0)
    const c = s.addNode(4, 0)
    s.addMember(a.id, c.id)
    s.addSupport(a.id, 'fixed')
    const question = await b.save()
    expect(question?.structureId).toMatch(/^str_/)
    expect((await getStructure(question!.structureId!)).name).toBe('Two-node beam')
    expect(s.isDirty.value).toBe(false)

    // Editing and saving again updates the same structure and question.
    s.moveNode(c.id, 5, 0)
    expect(b.isDirty.value).toBe(true)
    const again = await b.save()
    expect(again?.id).toBe(question!.id)
    expect(again?.structureId).toBe(question!.structureId)
    expect((await getStructure(question!.structureId!)).nodes[1]).toMatchObject({ x: 5 })
  })

  it('shows API validation errors on the matching fields', async () => {
    server.use(
      http.post(`${API_BASE_URL}/questions`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_failed',
              message: 'The question has problems.',
              fields: { structureId: 'The chosen structure no longer exists.' },
            },
          },
          { status: 422 },
        ),
      ),
    )
    const b = useQuestionBuilder()
    fillQuestion(b)
    b.update({ structureId: 'str_simplebeam' })
    expect(await b.save()).toBeNull()
    expect(b.saveStatus.value).toBe('error')
    expect(b.saveError.value).toBe('The question has problems.')
    expect(b.errors.value.structure).toBe('The chosen structure no longer exists.')
    // Changing the field clears its server message.
    b.update({ structureId: 'str_cantilever' })
    expect(b.errors.value.structure).toBeUndefined()
  })

  it('requests a share link after saving and reports success', async () => {
    const b = useQuestionBuilder()
    expect(b.canShare.value).toBe(false)
    expect(await b.requestShare()).toBeNull()
    fillQuestion(b)
    b.update({ structureId: 'str_simplebeam' })
    await b.save()
    expect(b.canShare.value).toBe(true)
    const pending = b.requestShare()
    expect(b.shareStatus.value).toBe('loading')
    const share = await pending
    expect(b.shareStatus.value).toBe('success')
    expect(share?.shareId).toMatch(/^[A-Z2-9]{8}$/)
    expect(share?.url).toBe(`${window.location.origin}/questions/answer/${share!.shareId}`)
    // Sharing again returns the same link.
    expect((await b.requestShare())?.shareId).toBe(share!.shareId)
  })

  it('reports share failures with the API message and allows a retry', async () => {
    const b = useQuestionBuilder()
    fillQuestion(b)
    b.update({ structureId: 'str_simplebeam' })
    await b.save()
    server.use(
      http.post(
        `${API_BASE_URL}/questions/:id/share`,
        () =>
          HttpResponse.json(
            { error: { code: 'unavailable', message: 'Sharing is temporarily unavailable.' } },
            { status: 503 },
          ),
        { once: true },
      ),
    )
    expect(await b.requestShare()).toBeNull()
    expect(b.shareStatus.value).toBe('error')
    expect(b.shareError.value).toBe('Sharing is temporarily unavailable.')
    expect(b.share.value).toBeNull()
    expect(await b.requestShare()).not.toBeNull()
    expect(b.shareStatus.value).toBe('success')
  })

  it('blocks sharing while there are unsaved changes', async () => {
    const b = useQuestionBuilder()
    fillQuestion(b)
    b.update({ structureId: 'str_simplebeam' })
    await b.save()
    b.update({ title: 'Changed' })
    expect(b.isDirty.value).toBe(true)
    expect(b.canShare.value).toBe(false)
    expect(await b.requestShare()).toBeNull()
    await b.save()
    expect(b.canShare.value).toBe(true)
  })

  it('reset() starts a fresh question', async () => {
    const b = useQuestionBuilder()
    fillQuestion(b)
    b.update({ structureId: 'str_simplebeam' })
    await b.save()
    await b.requestShare()
    b.reset()
    expect(b.draft.value.title).toBe('')
    expect(b.isSaved.value).toBe(false)
    expect(b.share.value).toBeNull()
    expect(b.shareStatus.value).toBe('idle')
  })
})
