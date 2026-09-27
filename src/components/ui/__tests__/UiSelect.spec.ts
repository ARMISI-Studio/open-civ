import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import UiSelect, { type UiSelectOption } from '../atoms/UiSelect.vue'

const OPTIONS: UiSelectOption[] = [
  { value: 'pin', label: 'Pin', description: 'Restrains x and y', icon: '△' },
  { value: 'roller', label: 'Roller', description: 'Restrains y only' },
  { value: 'fixed', label: 'Fixed', disabled: true },
]

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function mountSelect(props: Partial<InstanceType<typeof UiSelect>['$props']> = {}) {
  wrapper = mount(UiSelect, {
    props: { modelValue: null, options: OPTIONS, ...props },
    attachTo: document.body,
  })
  return wrapper
}

async function openWithKeyboard(w: VueWrapper) {
  await w.get('[role="combobox"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  await nextTick()
}

function listbox() {
  return document.querySelector('[role="listbox"]')
}

function option(label: string) {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((el) =>
    el.textContent?.includes(label),
  )!
}

describe('UiSelect', () => {
  it('renders a combobox trigger with the placeholder when no value is selected', () => {
    const w = mountSelect({ placeholder: 'Choose support' })
    const trigger = w.get('[role="combobox"]')
    expect(trigger.element.tagName).toBe('BUTTON')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.text()).toContain('Choose support')
    expect(trigger.classes()).toContain('ui-select--placeholder')
  })

  it('shows the selected option label and icon', () => {
    const w = mountSelect({ modelValue: 'pin' })
    const trigger = w.get('[role="combobox"]')
    expect(trigger.text()).toContain('Pin')
    expect(trigger.text()).toContain('△')
    expect(trigger.classes()).not.toContain('ui-select--placeholder')
  })

  it('opens a teleported listbox with options, descriptions, and selected state', async () => {
    const w = mountSelect({ modelValue: 'roller' })
    await openWithKeyboard(w)
    expect(w.get('[role="combobox"]').attributes('aria-expanded')).toBe('true')
    expect(listbox()).not.toBeNull()
    expect(w.element.contains(listbox())).toBe(false)
    const roller = option('Roller')
    expect(roller.getAttribute('aria-selected')).toBe('true')
    expect(option('Pin').getAttribute('aria-selected')).toBe('false')
    expect(option('Pin').textContent).toContain('Restrains x and y')
  })

  it('emits update:modelValue when an option is chosen with the keyboard', async () => {
    const w = mountSelect()
    await openWithKeyboard(w)
    const roller = option('Roller')
    roller.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(w.emitted('update:modelValue')).toEqual([['roller']])
  })

  it('marks disabled options and never selects them', async () => {
    const w = mountSelect()
    await openWithKeyboard(w)
    const fixed = option('Fixed')
    expect(fixed.getAttribute('aria-disabled')).toBe('true')
    fixed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    fixed.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    await flushPromises()
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('treats an empty option list explicitly: disabled trigger, no silent selection', async () => {
    const w = mountSelect({ options: [] })
    const trigger = w.get('[role="combobox"]')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(trigger.text()).toContain('No options available')
    await openWithKeyboard(w)
    expect(listbox()).toBeNull()
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('shows an unknown selected value explicitly instead of picking the first option', () => {
    const w = mountSelect({ modelValue: 'hinge' })
    const trigger = w.get('[role="combobox"]')
    expect(trigger.text()).toContain('Unavailable option (hinge)')
    expect(trigger.classes()).toContain('ui-select--unknown')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('follows controlled value changes from the parent', async () => {
    const w = mountSelect({ modelValue: 'pin' })
    await w.setProps({ modelValue: 'roller' })
    expect(w.get('[role="combobox"]').text()).toContain('Roller')
    await w.setProps({ modelValue: null })
    expect(w.get('[role="combobox"]').text()).toContain('Select an option')
  })

  it('passes attributes and classes to the trigger and supports disabled and invalid', () => {
    const w = mountSelect({ disabled: true, invalid: true })
    const trigger = w.get('[role="combobox"]')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(trigger.attributes('aria-invalid')).toBe('true')
    const withAttrs = mount(UiSelect, {
      props: { modelValue: null, options: OPTIONS },
      attrs: { id: 'support-type', 'aria-describedby': 'hint', class: 'from-parent' },
    })
    const t2 = withAttrs.get('[role="combobox"]')
    expect(t2.attributes('id')).toBe('support-type')
    expect(t2.attributes('aria-describedby')).toBe('hint')
    expect(t2.classes()).toContain('from-parent')
    withAttrs.unmount()
  })

  it('keeps the option label as the accessible name when the option slot adds content', async () => {
    wrapper = mount(UiSelect, {
      props: { modelValue: null, options: OPTIONS },
      slots: {
        option:
          '<template #option="{ option }"><em class="extra">{{ option.value }}!</em></template>',
      },
      attachTo: document.body,
    })
    await openWithKeyboard(wrapper)
    const pin = option('Pin')
    expect(pin.querySelector('.extra')?.textContent).toBe('pin!')
    const labelledBy = pin.getAttribute('aria-labelledby')
    expect(labelledBy && document.getElementById(labelledBy)?.textContent).toBe('Pin')
  })
})
