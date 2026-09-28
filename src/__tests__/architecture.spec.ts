/**
 * Guards for two acceptance criteria that are about structure rather than behaviour:
 * - persistence and sharing go through API modules, not ad-hoc local-only logic;
 * - API types are centralized in one module.
 */
import { describe, it, expect } from 'vitest'

const sources = import.meta.glob<string>(
  ['../**/*.{ts,vue}', '!../**/__tests__/**', '!../mocks/**'],
  { query: '?raw', import: 'default', eager: true },
)

function filesMatching(pattern: RegExp, allowed: (path: string) => boolean) {
  return Object.entries(sources)
    .filter(([path, code]) => pattern.test(code) && !allowed(path))
    .map(([path]) => path)
}

describe('architecture', () => {
  it('scans the application sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30)
  })

  it('only the API client performs network requests', () => {
    const offenders = filesMatching(
      /\bfetch\s*\(|XMLHttpRequest|axios/,
      (p) => p === '../api/client.ts',
    )
    expect(offenders).toEqual([])
  })

  it('application data is never persisted in browser storage (only the theme preference)', () => {
    const offenders = filesMatching(
      /localStorage|sessionStorage|indexedDB/,
      (p) => p === '../theme/applyTheme.ts',
    )
    expect(offenders).toEqual([])
  })

  it('views, components, and composables reach the backend only through API modules', () => {
    const offenders = filesMatching(/['"]@\/mocks\//, () => false).filter((p) => p !== '../main.ts')
    expect(offenders).toEqual([])
    const apiClientUsers = filesMatching(/apiRequest/, (p) => p.startsWith('../api/'))
    expect(apiClientUsers).toEqual([])
  })

  it('API DTO types are declared only in api/types.ts', () => {
    const declaresDto = filesMatching(/(interface|type)\s+\w+Dto\b/, (p) => p === '../api/types.ts')
    expect(declaresDto).toEqual([])
    const usesDto = filesMatching(/\b\w+Dto\b/, (p) => p.startsWith('../api/'))
    expect(usesDto).toEqual([])
  })
})
