/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Defaults to `/api`. */
  readonly VITE_API_BASE_URL?: string
  /** Set to `off` to disable the MSW mock backend. */
  readonly VITE_API_MOCKS?: string
  /** Mock network profile from src/mocks/simulation.ts: instant, normal, slow, flaky or down. */
  readonly VITE_MOCK_PROFILE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
