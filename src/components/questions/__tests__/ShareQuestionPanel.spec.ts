import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ShareQuestionPanel from '../ShareQuestionPanel.vue'

const share = {
  shareId: 'ABCD2345',
  url: 'http://localhost:3000/questions/answer/ABCD2345',
  createdAt: '2026-09-28T00:00:00.000Z',
}

describe('ShareQuestionPanel', () => {
  it('asks to save first when the question was never saved', () => {
    const w = mount(ShareQuestionPanel, {
      props: { share: null, status: 'idle', error: null, canShare: false, isSaved: false },
    })
    expect(w.text()).toContain('Save the question first')
    expect(w.get('button').attributes('disabled')).toBeDefined()
  })

  it('asks to save changes when the saved question is dirty', () => {
    const w = mount(ShareQuestionPanel, {
      props: { share: null, status: 'idle', error: null, canShare: false, isSaved: true },
    })
    expect(w.text()).toContain('Save your changes before sharing.')
  })

  it('emits share and shows a loading state', async () => {
    const w = mount(ShareQuestionPanel, {
      props: { share: null, status: 'idle', error: null, canShare: true, isSaved: true },
    })
    await w.get('button').trigger('click')
    expect(w.emitted('share')).toHaveLength(1)
    await w.setProps({ status: 'loading' })
    const button = w.get('button')
    expect(button.text()).toContain('Creating link…')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('shows a useful error and a retry action when sharing fails', () => {
    const w = mount(ShareQuestionPanel, {
      props: {
        share: null,
        status: 'error',
        error: 'Sharing is temporarily unavailable.',
        canShare: true,
        isSaved: true,
      },
    })
    const alert = w.get('[role="alert"]')
    expect(alert.text()).toContain(
      'Could not create a share link. Sharing is temporarily unavailable.',
    )
    expect(w.get('button').text()).toContain('Try again')
  })

  it('shows the link returned by the API, the share code, and copies the link', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const w = mount(ShareQuestionPanel, {
      props: { share, status: 'success', error: null, canShare: true, isSaved: true },
    })
    expect(w.get('[role="status"]').text()).toContain('Shared.')
    expect((w.get('input').element as HTMLInputElement).value).toBe(share.url)
    expect(w.get('input').attributes('readonly')).toBeDefined()
    expect(w.text()).toContain('Share code: ABCD2345')
    expect(w.get('a').attributes('href')).toBe(share.url)
    await w.get('button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(share.url)
    expect(w.text()).toContain('Link copied.')
  })

  it('tells the user when copying fails', async () => {
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const w = mount(ShareQuestionPanel, {
      props: { share, status: 'success', error: null, canShare: true, isSaved: true },
    })
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Couldn’t copy.')
  })
})
