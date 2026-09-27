// Global test setup: jsdom polyfills needed by the headless UI primitives (reka-ui).
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

const elementProto = Element.prototype as Element & Record<string, unknown>
elementProto.scrollIntoView ??= () => {}
elementProto.hasPointerCapture ??= () => false
elementProto.releasePointerCapture ??= () => {}
elementProto.setPointerCapture ??= () => {}

// Mock backend: the same MSW handlers the app uses in the browser, reset between tests.
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/mocks/db'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
