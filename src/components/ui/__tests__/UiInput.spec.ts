import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UiInput from '../atoms/UiInput.vue'
import UiTextarea from '../atoms/UiTextarea.vue'
import UiLabel from '../atoms/UiLabel.vue'

describe('UiInput', () => {
  it('is a native input root that emits string values', async () => {
    const wrapper = mount(UiInput, { props: { modelValue: 'a' } })
    expect(wrapper.element.tagName).toBe('INPUT')
    expect((wrapper.element as HTMLInputElement).value).toBe('a')
    await wrapper.setValue('beam')
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['beam'])
  })

  it('keeps number input values as strings', async () => {
    const wrapper = mount(UiInput, { props: { modelValue: '1' }, attrs: { type: 'number' } })
    await wrapper.setValue('2.5')
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['2.5'])
  })

  it('works with v-model and reflects controlled changes', async () => {
    const wrapper = mount({
      components: { UiInput },
      setup: () => ({ text: ref('start') }),
      template: '<UiInput v-model="text" />',
    })
    const input = wrapper.get('input')
    await input.setValue('typed')
    expect((wrapper.vm as unknown as { text: string }).text).toBe('typed')
    ;(wrapper.vm as unknown as { text: string }).text = 'reset'
    await wrapper.vm.$nextTick()
    expect((input.element as HTMLInputElement).value).toBe('reset')
  })

  it('passes native attributes, classes, and listeners through to the input', async () => {
    const onBlur = vi.fn<() => void>()
    const onKeydown = vi.fn<() => void>()
    const wrapper = mount(UiInput, {
      attrs: {
        id: 'span',
        type: 'number',
        min: '1',
        placeholder: 'Span',
        readonly: true,
        maxlength: '5',
        autocomplete: 'off',
        class: 'from-parent',
        onBlur,
        onKeydown,
      },
    })
    const input = wrapper.element as HTMLInputElement
    expect(input.id).toBe('span')
    expect(input.type).toBe('number')
    expect(input.min).toBe('1')
    expect(input.placeholder).toBe('Span')
    expect(input.readOnly).toBe(true)
    expect(input.maxLength).toBe(5)
    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ui-input', 'from-parent']))
    await wrapper.trigger('blur')
    await wrapper.trigger('keydown', { key: 'Enter' })
    expect(onBlur).toHaveBeenCalledOnce()
    expect(onKeydown).toHaveBeenCalledOnce()
    expect(
      (mount(UiInput, { attrs: { disabled: true } }).element as HTMLInputElement).disabled,
    ).toBe(true)
  })

  it('marks invalid state with a class and aria-invalid', () => {
    const wrapper = mount(UiInput, { props: { invalid: true } })
    expect(wrapper.classes()).toContain('ui-input--invalid')
    expect(wrapper.attributes('aria-invalid')).toBe('true')
    const valid = mount(UiInput)
    expect(valid.attributes('aria-invalid')).toBeUndefined()
  })
})

describe('UiTextarea', () => {
  it('is a native textarea root with the same v-model contract', async () => {
    const wrapper = mount(UiTextarea, { props: { modelValue: '' }, attrs: { rows: '4' } })
    expect(wrapper.element.tagName).toBe('TEXTAREA')
    expect(wrapper.attributes('rows')).toBe('4')
    await wrapper.setValue('Explain')
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['Explain'])
  })
})

describe('UiLabel', () => {
  it('renders a native label with passthrough for and a required indicator', () => {
    const wrapper = mount(UiLabel, {
      props: { required: true },
      attrs: { for: 'name', class: 'x' },
      slots: { default: 'Name' },
    })
    expect(wrapper.element.tagName).toBe('LABEL')
    expect(wrapper.attributes('for')).toBe('name')
    expect(wrapper.classes()).toContain('x')
    expect(wrapper.find('.ui-label__required').exists()).toBe(true)
    expect(wrapper.text()).toContain('(required)')
    expect(
      mount(UiLabel, { slots: { default: 'Name' } })
        .find('.ui-label__required')
        .exists(),
    ).toBe(false)
  })
})
