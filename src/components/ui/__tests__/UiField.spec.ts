import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UiField from '../molecules/UiField.vue'
import UiInput from '../atoms/UiInput.vue'

function mountField(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(
    {
      components: { UiField, UiInput },
      props: ['label', 'hint', 'error', 'required'],
      template: `
        <UiField :label="label" :hint="hint" :error="error" :required="required">
          ${slots.label ? `<template #label>${slots.label}</template>` : ''}
          ${slots.hint ? `<template #hint>${slots.hint}</template>` : ''}
          ${slots.error ? `<template #error>${slots.error}</template>` : ''}
          <template #default="{ id, describedby, invalid }">
            <UiInput :id="id" :aria-describedby="describedby" :invalid="invalid" />
          </template>
        </UiField>`,
    },
    { props, attachTo: document.body },
  )
}

describe('UiField', () => {
  it('links the label to the control through a stable id', () => {
    const wrapper = mountField({ label: 'Span' })
    const input = wrapper.get('input')
    const label = wrapper.get('label')
    expect(input.attributes('id')).toBeTruthy()
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(label.text()).toBe('Span')
    // The accessible name resolves through the label.
    expect((input.element as HTMLInputElement).labels?.[0]?.textContent).toContain('Span')
    expect(input.attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('describes the control with hint and error ids and marks it invalid', () => {
    const wrapper = mountField({ label: 'Span', hint: 'In metres', error: 'Enter a span' })
    const input = wrapper.get('input')
    const hint = wrapper.get('.ui-field__hint')
    const error = wrapper.get('.ui-field__error')
    expect(input.attributes('aria-describedby')).toBe(
      `${hint.attributes('id')} ${error.attributes('id')}`,
    )
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(hint.text()).toBe('In metres')
    expect(error.text()).toContain('Enter a span')
    wrapper.unmount()
  })

  it('removes the error association when the error clears', async () => {
    const wrapper = mountField({ label: 'Span', error: 'Required' })
    await wrapper.setProps({ error: undefined })
    const input = wrapper.get('input')
    expect(wrapper.find('.ui-field__error').exists()).toBe(false)
    expect(input.attributes('aria-invalid')).toBeUndefined()
    expect(input.attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('lets label, hint, and error slots override their prop defaults', () => {
    const wrapper = mountField(
      { label: 'Plain', hint: 'plain hint', error: 'plain error', required: true },
      {
        label: '<span class="rich-label">Span <abbr>m</abbr></span>',
        hint: '<em class="rich-hint">rich hint</em>',
        error: '<strong class="rich-error">rich error</strong>',
      },
    )
    expect(wrapper.find('.rich-label').exists()).toBe(true)
    expect(wrapper.find('.rich-hint').exists()).toBe(true)
    expect(wrapper.find('.rich-error').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Plain')
    expect(wrapper.text()).not.toContain('plain hint')
    expect(wrapper.text()).not.toContain('plain error')
    expect(wrapper.find('.ui-label__required').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders a hint from the slot alone', () => {
    const wrapper = mountField({ label: 'Span' }, { hint: 'slot-only hint' })
    expect(wrapper.get('.ui-field__hint').text()).toBe('slot-only hint')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe(
      wrapper.get('.ui-field__hint').attributes('id'),
    )
    wrapper.unmount()
  })
})
