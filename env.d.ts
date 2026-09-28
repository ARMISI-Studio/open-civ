/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Defaults to `/api`. */
  readonly VITE_API_BASE_URL?: string
  /** Set to `off` to disable the MSW mock backend. */
  readonly VITE_API_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
