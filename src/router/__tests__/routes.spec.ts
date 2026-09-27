import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { DEFAULT_ROUTE, routes } from '../routes'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('routes', () => {
  it('redirects the root route to the Structure Editor', async () => {
    const router = makeRouter()
    await router.push('/')
    expect(DEFAULT_ROUTE).toBe('/structures')
    expect(router.currentRoute.value.path).toBe('/structures')
    expect(router.currentRoute.value.name).toBe('structures')
  })

  it.each([
    ['/structures', 'structures'],
    ['/structures/abc', 'structure-edit'],
    ['/questions/create', 'question-create'],
    ['/questions/answer', 'question-answer'],
    ['/questions/answer/SHARE1', 'question-answer-shared'],
  ])('resolves %s directly to %s', async (path, name) => {
    const router = makeRouter()
    await router.push(path)
    expect(router.currentRoute.value.name).toBe(name)
  })

  it('passes route params as props for bookmarkable detail routes', () => {
    const router = makeRouter()
    const structure = router.resolve('/structures/abc')
    const shared = router.resolve('/questions/answer/SHARE1')
    expect(structure.params).toEqual({ structureId: 'abc' })
    expect(shared.params).toEqual({ shareId: 'SHARE1' })
    expect(structure.matched[0]?.props.default).toBe(true)
    expect(shared.matched[0]?.props.default).toBe(true)
  })

  it('shows the not-found route for unknown paths', async () => {
    const router = makeRouter()
    await router.push('/does/not/exist')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
