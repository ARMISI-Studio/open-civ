import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MainTabs from '../MainTabs.vue'
import { findActiveTab } from '../mainTabs'
import { routes } from '@/router/routes'

async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  const wrapper = mount(MainTabs, { global: { plugins: [router] } })
  return { wrapper, router }
}

function activeLabels(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  return wrapper.findAll('[aria-current="page"]').map((link) => link.text())
}

describe('MainTabs', () => {
  it('renders the three main tabs as links to their list routes', async () => {
    const { wrapper } = await mountAt('/structures')
    const links = wrapper.findAll('a')
    expect(links.map((l) => l.text())).toEqual(['Structures', 'Questions', 'Answers'])
    expect(links.map((l) => l.attributes('href'))).toEqual([
      '/structures',
      '/questions',
      '/answers',
    ])
  })

  it.each([
    ['/structures', 'Structures'],
    ['/structures/new', 'Structures'],
    ['/structures/abc', 'Structures'],
    ['/questions', 'Questions'],
    ['/questions/new', 'Questions'],
    ['/questions/q_1', 'Questions'],
    ['/answers', 'Answers'],
    ['/answers/SHARE1', 'Answers'],
  ])('marks exactly one tab active on %s', async (path, label) => {
    const { wrapper } = await mountAt(path)
    expect(activeLabels(wrapper)).toEqual([label])
    expect(wrapper.find('.main-tabs__tab--active').text()).toBe(label)
  })

  it('updates the active tab after navigation', async () => {
    const { wrapper, router } = await mountAt('/structures')
    await router.push('/answers')
    await wrapper.vm.$nextTick()
    expect(activeLabels(wrapper)).toEqual(['Answers'])
  })

  it('marks no tab active on unknown routes', async () => {
    const { wrapper } = await mountAt('/nowhere')
    expect(activeLabels(wrapper)).toEqual([])
    expect(findActiveTab('/structuresX')).toBeUndefined()
  })
})
