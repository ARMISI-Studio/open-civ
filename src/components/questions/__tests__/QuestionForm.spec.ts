import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import QuestionForm from '../QuestionForm.vue'
import { useQuestionBuilder } from '@/composables/useQuestionBuilder'

function mountForm() {
  const builder = useQuestionBuilder()
  const wrapper = mount(QuestionForm, {
    props: {
      builder,
      structures: [{ id: 'str_simplebeam', name: 'Simply supported beam', updatedAt: '' }],
      structuresStatus: 'success',
      structuresError: null,
    },
    attachTo: document.body,
  })
  return { builder, wrapper }
}

describe('QuestionForm', () => {
  it('renders a native form that emits submit', async () => {
    const { wrapper } = mountForm()
    expect(wrapper.element.tagName).toBe('FORM')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
    wrapper.unmount()
  })

  it('shows field errors, linked to their controls, after a failed save', async () => {
    const { builder, wrapper } = mountForm()
    await builder.save()
    await flushPromises()
    const title = wrapper.get('input[maxlength="120"]')
    expect(title.attributes('aria-invalid')).toBe('true')
    const describedby = title.attributes('aria-describedby')!
    expect(document.getElementById(describedby)?.textContent).toContain('Enter a title.')
    expect(wrapper.text()).toContain('Enter the question prompt.')
    expect(wrapper.text()).toContain('Choose a structure for this question.')
    expect(wrapper.text()).toContain('Mark the correct option.')
    expect(wrapper.text()).toMatch(/Fix 6 problems before saving/)
    wrapper.unmount()
  })

  it('edits options through the options editor', async () => {
    const { builder, wrapper } = mountForm()
    await wrapper.get('input[aria-label="Option 1"]').setValue('0 kN')
    await wrapper.get('input[aria-label="Option 2 is correct"]').setValue(true)
    expect(builder.draft.value.options[0]!.text).toBe('0 kN')
    expect(builder.draft.value.options[1]!.correct).toBe(true)
    const add = wrapper.findAll('button').find((b) => b.text().includes('Add option'))!
    await add.trigger('click')
    expect(builder.draft.value.options).toHaveLength(3)
    await wrapper.get('button[aria-label="Remove option 3"]').trigger('click')
    expect(builder.draft.value.options).toHaveLength(2)
    wrapper.unmount()
  })

  it('switches to drawing a new structure', async () => {
    const { builder, wrapper } = mountForm()
    const radios = wrapper.findAll('input[type="radio"]')
    await radios[1]!.setValue(true)
    expect(builder.structureSource.value).toBe('new')
    expect(wrapper.find('.structure-workspace').exists()).toBe(true)
    expect(wrapper.find('[role="group"][aria-label="Drawing tools"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
