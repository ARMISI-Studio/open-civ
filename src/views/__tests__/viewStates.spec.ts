/**
 * Loading, empty, validation, and error states of each main view, rendered with the real
 * router and the MSW mock API (with some endpoints forced to fail).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/__tests__/setup'
import { API_BASE_URL } from '@/api/client'
import { resetDb } from '@/mocks/db'
import { routes } from '@/router/routes'
import App from '@/App.vue'

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

/** Waits until `text` is rendered somewhere in the app. */
async function see(text: string | RegExp) {
  await vi.waitFor(() => {
    const body = document.body.textContent ?? ''
    if (typeof text === 'string' ? !body.includes(text) : !text.test(body)) {
      throw new Error(`Not rendered yet: ${text}`)
    }
  })
}

/** Waits until an element matching `selector` is rendered. */
async function seeElement(selector: string) {
  await vi.waitFor(() => {
    if (!document.querySelector(selector)) throw new Error(`Not rendered yet: ${selector}`)
  })
}

function statusTexts(role: 'status' | 'alert') {
  return Array.from(document.querySelectorAll(`[role="${role}"]`)).map((el) => el.textContent ?? '')
}

describe('Structure Editor states', () => {
  it('shows a loading state, then the loaded structure', async () => {
    server.use(
      http.get(`${API_BASE_URL}/structures/:id`, async () => {
        await delay(30)
        return HttpResponse.json((await import('@/mocks/seed')).seedStructures()[0])
      }),
    )
    await mountAt('/structures/str_simplebeam')
    expect(statusTexts('status').some((t) => t.includes('Loading structure…'))).toBe(true)
    await seeElement('[aria-label^="Member A–B"]')
    expect(statusTexts('status').some((t) => t.includes('Loading structure…'))).toBe(false)
  })

  it('shows a not-found error for a missing structure', async () => {
    await mountAt('/structures/str_missing')
    await see('This structure doesn’t exist or was deleted.')
    expect(statusTexts('alert').join()).toContain('This structure doesn’t exist or was deleted.')
    expect(document.querySelector('svg.structure-canvas')).toBeNull()
  })

  it('shows an empty saved list and a list error with retry', async () => {
    resetDb({ structures: [], questions: [], shares: [], answers: [] })
    const { wrapper } = await mountAt('/structures')
    await see('No saved structures yet.')
    wrapper.unmount()

    server.use(
      http.get(`${API_BASE_URL}/structures`, () =>
        HttpResponse.json(
          { error: { code: 'down', message: 'Service unavailable.' } },
          { status: 503 },
        ),
      ),
    )
    await mountAt('/structures')
    await see('Service unavailable.')
    expect(document.body.textContent).toContain('Try again')
  })

  it('shows validation errors instead of calling the API', async () => {
    const onPost = vi.fn<() => void>()
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') onPost()
    })
    const { wrapper } = await mountAt('/structures')
    const save = wrapper.findAll('button').find((b) => b.text() === 'Save structure')!
    await save.trigger('click')
    await flushPromises()
    expect(statusTexts('alert').join()).toMatch(/Fix 2 problems before saving/)
    expect(document.body.textContent).toContain('Enter a name for the structure.')
    expect(onPost).not.toHaveBeenCalled()
    server.events.removeAllListeners()
  })

  it('shows save errors from the API', async () => {
    server.use(
      http.put(`${API_BASE_URL}/structures/:id`, () =>
        HttpResponse.json(
          { error: { code: 'down', message: 'Try again later.' } },
          { status: 500 },
        ),
      ),
    )
    const { wrapper } = await mountAt('/structures/str_simplebeam')
    await seeElement('[aria-label^="Member A–B"]')
    const save = wrapper.findAll('button').find((b) => b.text() === 'Save structure')!
    await save.trigger('click')
    await see('Could not save the structure. Try again later.')
    expect(statusTexts('alert').join()).toContain('Could not save the structure. Try again later.')
  })
})

describe('Question Builder states', () => {
  it('shows an empty state when there are no saved structures', async () => {
    resetDb({ structures: [], questions: [], shares: [], answers: [] })
    await mountAt('/questions/create')
    await see('No saved structures yet.')
    expect(document.body.textContent).toContain('Choose a structure to preview it here.')
  })

  it('shows a structure list error with retry', async () => {
    server.use(http.get(`${API_BASE_URL}/structures`, () => HttpResponse.error(), { once: true }))
    const { wrapper } = await mountAt('/questions/create')
    await see('Could not reach the server.')
    const retry = wrapper.findAll('button').find((b) => b.text() === 'Try again')!
    await retry.trigger('click')
    await vi.waitFor(() =>
      expect(document.body.textContent).not.toContain('Could not reach the server.'),
    )
  })

  it('shows save errors from the API next to the action', async () => {
    server.use(
      http.post(`${API_BASE_URL}/questions`, () =>
        HttpResponse.json(
          { error: { code: 'down', message: 'Saving is unavailable.' } },
          { status: 503 },
        ),
      ),
    )
    const { wrapper } = await mountAt('/questions/create')
    const inputs = wrapper.findAll('input')
    await inputs
      .find((i) => i.attributes('placeholder') === 'e.g. Find the support reaction')!
      .setValue('T')
    await wrapper.get('textarea').setValue('P')
    await wrapper.get('input[aria-label="Option 1"]').setValue('A')
    await wrapper.get('input[aria-label="Option 2"]').setValue('B')
    await wrapper.get('input[aria-label="Option 1 is correct"]').setValue(true)
    // Choose the structure through the component's model, as the select would.
    const list = wrapper.findComponent({ name: 'StructureList' })
    list.vm.$emit('update:modelValue', 'str_simplebeam')
    await wrapper.get('form.question-form').trigger('submit')
    await see('Could not save the question. Saving is unavailable.')
    expect(statusTexts('alert').join()).toContain(
      'Could not save the question. Saving is unavailable.',
    )
  })
})

describe('Answer Questions states', () => {
  it('shows loading, then a not-found error for an unknown share code', async () => {
    await mountAt('/questions/answer/ZZZZ9999')
    expect(statusTexts('status').some((t) => t.includes('Loading the shared question…'))).toBe(true)
    await see('This share link is invalid or the question is no longer shared.')
    expect(document.body.textContent).toContain('Enter a different code')
    expect(document.body.textContent).not.toContain('Try again')
  })

  it('offers a retry when loading fails for another reason', async () => {
    server.use(http.get(`${API_BASE_URL}/shared/:id`, () => HttpResponse.error()))
    await mountAt('/questions/answer/ABCD2345')
    await see('Could not load the question. Could not reach the server.')
    expect(document.body.textContent).toContain('Try again')
  })

  it('validates the share code field', async () => {
    const { wrapper, router } = await mountAt('/questions/answer')
    await wrapper.get('form').trigger('submit')
    await see('Enter a share code or link.')
    await wrapper.get('input').setValue('bad code!')
    await wrapper.get('form').trigger('submit')
    await see('That doesn’t look like a share code or link.')
    await wrapper.get('input').setValue('abcd2345')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/questions/answer/ABCD2345')
  })
})
