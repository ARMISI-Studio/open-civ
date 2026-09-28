import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { DEFAULT_ROUTE, routes } from '../routes'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('routes', () => {
  it('redirects the root route to the Structures tab', async () => {
    const router = makeRouter()
    await router.push('/')
    expect(DEFAULT_ROUTE).toBe('/structures')
    expect(router.currentRoute.value.path).toBe('/structures')
    expect(router.currentRoute.value.name).toBe('structures')
  })

  it.each([
    ['/structures', 'structures'],
    ['/structures/new', 'structure-new'],
    ['/structures/abc', 'structure-edit'],
    ['/questions', 'questions'],
    ['/questions/new', 'question-new'],
    ['/questions/q_1', 'question-edit'],
    ['/answers', 'answers'],
    ['/answers/SHARE1', 'answer'],
  ])('resolves %s directly to %s', async (path, name) => {
    const router = makeRouter()
    await router.push(path)
    expect(router.currentRoute.value.name).toBe(name)
  })

  it('passes route params as props for bookmarkable detail routes', () => {
    const router = makeRouter()
    for (const [path, params] of [
      ['/structures/abc', { structureId: 'abc' }],
      ['/questions/q_1', { questionId: 'q_1' }],
      ['/answers/SHARE1', { shareId: 'SHARE1' }],
    ] as const) {
      const route = router.resolve(path)
      expect(route.params).toEqual(params)
      expect(route.matched[0]?.props.default).toBe(true)
    }
  })

  it.each([
    ['/questions/create', '/questions/new'],
    ['/questions/answer', '/answers'],
    ['/questions/answer/SHARE1', '/answers/SHARE1'],
  ])('redirects the earlier path %s to %s', async (from, to) => {
    const router = makeRouter()
    await router.push(from)
    expect(router.currentRoute.value.fullPath).toBe(to)
  })

  it('shows the not-found route for unknown paths', async () => {
    const router = makeRouter()
    await router.push('/does/not/exist')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
