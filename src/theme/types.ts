/** Theme contract shared with the visual playground (public/ui-playground.html). */
export interface ThemeColors {
  background: string
  surface: string
  border: string
  inputBorder: string
  text: string
  muted: string
  primary: string
  primaryHover: string
  onPrimary: string
  selection: string
  success: string
  warning: string
  error: string
}

export interface ThemeSpacing {
  small: number
  medium: number
  large: number
  section: number
}

export interface ThemeFonts {
  family: string
  body: number
  label: number
  heading: number
  section: number
  lineHeight: number
}

export interface ThemeShape {
  controlRadius: number
  panelRadius: number
  controlHeight: number
}

export interface Theme {
  colors: ThemeColors
  spacing: ThemeSpacing
  fonts: ThemeFonts
  shape: ThemeShape
}

export type ThemeGroup = keyof Theme

/** Font stacks the playground offers; all are installed system fonts. */
export const FONT_FAMILIES = [
  'system-ui, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'ui-monospace, monospace',
] as const

/** Inclusive numeric bounds, matching the playground. `spacing` applies to every spacing key. */
export const NUMERIC_BOUNDS: Record<string, readonly [number, number]> = {
  spacing: [0, 64],
  body: [12, 24],
  label: [12, 20],
  heading: [18, 40],
  section: [14, 32],
  lineHeight: [1.2, 2],
  controlRadius: [0, 24],
  panelRadius: [0, 32],
  controlHeight: [44, 64],
}
