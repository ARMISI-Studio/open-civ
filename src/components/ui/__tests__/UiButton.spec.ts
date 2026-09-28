import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UiButton from '../atoms/UiButton.vue'

describe('UiButton', () => {
  it('renders a native button that defaults to type="button"', () => {
    const wrapper = mount(UiButton, { slots: { default: 'Save' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Save')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['ui-button', 'ui-button--secondary', 'ui-button--medium']),
    )
  })

  it('allows an explicit submit type that submits its form', async () => {
    const onSubmit = vi.fn<(e: Event) => void>((e) => e.preventDefault())
    const wrapper = mount(
      {
        components: { UiButton },
        template: '<form @submit="onSubmit"><UiButton type="submit">Go</UiButton></form>',
        methods: { onSubmit },
      },
      { attachTo: document.body },
    )
    expect(wrapper.get('button').attributes('type')).toBe('submit')
    ;(wrapper.get('button').element as HTMLButtonElement).click()
    expect(onSubmit).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('applies variant and size modifier classes', () => {
    const wrapper = mount(UiButton, { props: { variant: 'danger', size: 'small' } })
    expect(wrapper.classes()).toContain('ui-button--danger')
    expect(wrapper.classes()).toContain('ui-button--small')
  })

  it('disables the native button and blocks clicks when disabled', async () => {
    const onClick = vi.fn<() => void>()
    const wrapper = mount(UiButton, { props: { disabled: true }, attrs: { onClick } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    ;(wrapper.element as HTMLButtonElement).click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('blocks repeat activation while loading and keeps the text label', () => {
    const onClick = vi.fn<() => void>()
    const wrapper = mount(UiButton, {
      props: { loading: true },
      attrs: { onClick },
      slots: { default: 'Saving…', icon: '★' },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.ui-button__spinner').exists()).toBe(true)
    expect(wrapper.find('.ui-button__icon').exists()).toBe(false)
    expect(wrapper.get('.ui-button__label').text()).toBe('Saving…')
    ;(wrapper.element as HTMLButtonElement).click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders the optional icon slot and passes native attributes, classes, and listeners through', async () => {
    const onClick = vi.fn<() => void>()
    const wrapper = mount(UiButton, {
      attrs: { class: 'parent-class', 'aria-label': 'Add node', title: 'Add', onClick },
      slots: { default: 'Node', icon: '⊙' },
    })
    expect(wrapper.get('.ui-button__icon').text()).toBe('⊙')
    expect(wrapper.classes()).toContain('parent-class')
    expect(wrapper.attributes('aria-label')).toBe('Add node')
    expect(wrapper.attributes('title')).toBe('Add')
    await wrapper.trigger('click')
    expect(onClick).toHaveBeenCalledOnce()
  })
})
