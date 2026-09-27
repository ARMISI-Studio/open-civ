import defaultThemeJson from './default.json'
import { FONT_FAMILIES, NUMERIC_BOUNDS, type Theme } from './types'

export const THEME_STORAGE_KEY = 'open-civ-visual-theme-v1'

export class ThemeValidationError extends Error {
  override name = 'ThemeValidationError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates an unknown value against the default theme's shape and the playground's bounds.
 * Returns a deep copy; throws ThemeValidationError with a readable message otherwise.
 */
export function validateTheme(value: unknown): Theme {
  const reference: Record<string, Record<string, unknown>> = defaultThemeJson
  if (!isRecord(value)) throw new ThemeValidationError('Theme must be a JSON object.')
  if (Object.keys(value).length !== Object.keys(reference).length) {
    throw new ThemeValidationError('Use exactly the groups shown in the default theme.')
  }
  for (const [group, fields] of Object.entries(reference)) {
    const candidate = value[group]
    if (!isRecord(candidate) || Object.keys(candidate).length !== Object.keys(fields).length) {
      throw new ThemeValidationError(`Missing or unexpected fields in ${group}.`)
    }
    for (const key of Object.keys(fields)) {
      const v = candidate[key]
      if (group === 'colors') {
        if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) {
          throw new ThemeValidationError(`${group}.${key} must be a six-digit hex color.`)
        }
      } else if (key === 'family') {
        if (!FONT_FAMILIES.includes(v as (typeof FONT_FAMILIES)[number])) {
          throw new ThemeValidationError(
            `Choose a supported font stack: ${FONT_FAMILIES.join(' / ')}`,
          )
        }
      } else {
        const [min, max] = NUMERIC_BOUNDS[group === 'spacing' ? 'spacing' : key] ?? [0, 0]
        if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
          throw new ThemeValidationError(`${group}.${key} must be between ${min} and ${max}.`)
        }
      }
    }
  }
  return structuredClone(value) as unknown as Theme
}

export const defaultTheme: Theme = validateTheme(defaultThemeJson)

/** Maps a theme to CSS custom properties: `--colors-primary`, `--spacing-medium`, … */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const [group, fields] of Object.entries(theme)) {
    for (const [key, value] of Object.entries(fields as Record<string, string | number>)) {
      variables[`--${group}-${key}`] =
        typeof value === 'number' && key !== 'lineHeight' ? `${value}px` : String(value)
    }
  }
  return variables
}

/** Applies tokens at the document root so teleported panels share the same theme. */
export function applyTheme(theme: Theme, target: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(themeToCssVariables(theme))) {
    target.style.setProperty(name, value)
  }
}

export type ThemeImportResult = { ok: true; theme: Theme } | { ok: false; error: string }

/** Parses and validates imported JSON text. Callers keep their current theme when `ok` is false. */
export function parseThemeJson(text: string): ThemeImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Theme is not valid JSON.' }
  }
  try {
    return { ok: true, theme: validateTheme(parsed) }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Reads the saved theme preference, falling back to the default when missing or invalid. */
export function loadSavedTheme(storage: Storage | null = safeStorage()): Theme {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY)
    if (saved) {
      const result = parseThemeJson(saved)
      if (result.ok) return result.theme
    }
  } catch {
    // Storage unavailable: use defaults.
  }
  return structuredClone(defaultTheme)
}

export function saveTheme(theme: Theme, storage: Storage | null = safeStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }
}

export function clearSavedTheme(storage: Storage | null = safeStorage()): void {
  try {
    storage?.removeItem(THEME_STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
