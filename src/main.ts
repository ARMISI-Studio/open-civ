import { createApp } from 'vue'

import '@/styles/tokens.css'
import '@/styles/base.css'
import { applyTheme, loadSavedTheme } from '@/theme/applyTheme'
import App from './App.vue'
import router from './router'

/**
 * There is no backend yet: API calls are answered by MSW handlers in src/mocks/.
 * Set VITE_API_MOCKS=off to send requests to the real API at VITE_API_BASE_URL instead.
 */
async function enableMocking() {
  if (import.meta.env.VITE_API_MOCKS === 'off') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

applyTheme(loadSavedTheme())

enableMocking().then(() => {
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})
