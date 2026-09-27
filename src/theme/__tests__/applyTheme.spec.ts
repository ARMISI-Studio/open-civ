import { describe, it, expect, beforeEach } from 'vitest'
import defaultThemeJson from '../default.json'
import {
  THEME_STORAGE_KEY,
  ThemeValidationError,
  applyTheme,
  defaultTheme,
  loadSavedTheme,
  parseThemeJson,
  saveTheme,
  themeToCssVariables,
  validateTheme,
} from '../applyTheme'

function clone() {
  return structuredClone(defaultThemeJson) as Record<string, Record<string, unknown>>
}

describe('validateTheme', () => {
  it('accepts the default theme and returns a copy', () => {
    const result = validateTheme(defaultThemeJson)
    expect(result).toEqual(defaultThemeJson)
    expect(result).not.toBe(defaultThemeJson)
  })

  it.each([
    ['a non-object', [], 'Theme must be a JSON object.'],
    ['null', null, 'Theme must be a JSON object.'],
    [
      'a missing group',
      (() => {
        const t = clone()
        delete t.shape
        return t
      })(),
      'Use exactly the groups',
    ],
    [
      'an extra field',
      (() => {
        const t = clone()
        t.colors!.extra = '#000000'
        return t
      })(),
      'Missing or unexpected fields in colors.',
    ],
    [
      'a short hex color',
      (() => {
        const t = clone()
        t.colors!.primary = '#fff'
        return t
      })(),
      'colors.primary must be a six-digit hex color.',
    ],
    [
      'an unsupported font',
      (() => {
        const t = clone()
        t.fonts!.family = 'Comic Sans'
        return t
      })(),
      'Choose a supported font stack',
    ],
    [
      'spacing out of range',
      (() => {
        const t = clone()
        t.spacing!.small = 65
        return t
      })(),
      'spacing.small must be between 0 and 64.',
    ],
    [
      'a string number',
      (() => {
        const t = clone()
        t.shape!.controlHeight = '44'
        return t
      })(),
      'shape.controlHeight must be between 44 and 64.',
    ],
    [
      'a control height below 44px',
      (() => {
        const t = clone()
        t.shape!.controlHeight = 40
        return t
      })(),
      'shape.controlHeight must be between 44 and 64.',
    ],
  ])('rejects %s', (_name, value, message) => {
    expect(() => validateTheme(value)).toThrow(ThemeValidationError)
    expect(() => validateTheme(value)).toThrow(message)
  })
})

describe('themeToCssVariables', () => {
  it('maps groups to --group-key variables, adding px except for line height', () => {
    const vars = themeToCssVariables(defaultTheme)
    expect(vars['--colors-primary']).toBe('#2563eb')
    expect(vars['--spacing-medium']).toBe('16px')
    expect(vars['--fonts-family']).toBe('system-ui, sans-serif')
    expect(vars['--fonts-body']).toBe('16px')
    expect(vars['--fonts-lineHeight']).toBe('1.5')
    expect(vars['--shape-controlHeight']).toBe('44px')
    expect(Object.keys(vars)).toHaveLength(13 + 4 + 6 + 3)
  })

  it('applies variables to the document root', () => {
    applyTheme(defaultTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--colors-primary')).toBe('#2563eb')
    expect(style.getPropertyValue('--spacing-large')).toBe('24px')
  })
})

describe('theme import and persistence', () => {
  beforeEach(() => localStorage.clear())

  it('parses valid JSON into a theme', () => {
    const t = clone()
    t.colors!.primary = '#123456'
    const result = parseThemeJson(JSON.stringify(t))
    expect(result).toMatchObject({ ok: true, theme: { colors: { primary: '#123456' } } })
  })

  it('reports invalid JSON and invalid values without throwing', () => {
    expect(parseThemeJson('{nope')).toEqual({ ok: false, error: 'Theme is not valid JSON.' })
    const t = clone()
    t.colors!.primary = 'blue'
    expect(parseThemeJson(JSON.stringify(t))).toEqual({
      ok: false,
      error: 'colors.primary must be a six-digit hex color.',
    })
  })

  it('keeps the last valid theme when an import is invalid', () => {
    const custom = validateTheme({ ...clone(), colors: { ...clone().colors, primary: '#0000ff' } })
    let current = custom
    const result = parseThemeJson('{"colors": {}}')
    if (result.ok) current = result.theme
    expect(current).toBe(custom)
  })

  it('saves and restores a theme preference, falling back to defaults when corrupt', () => {
    const custom = validateTheme({ ...clone(), colors: { ...clone().colors, primary: '#0000ff' } })
    saveTheme(custom)
    expect(loadSavedTheme().colors.primary).toBe('#0000ff')
    localStorage.setItem(THEME_STORAGE_KEY, '{"broken": true}')
    expect(loadSavedTheme()).toEqual(defaultTheme)
    localStorage.clear()
    expect(loadSavedTheme()).toEqual(defaultTheme)
  })
})
