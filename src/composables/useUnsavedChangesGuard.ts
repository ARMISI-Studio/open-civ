import { onBeforeUnmount, onMounted, toValue, type MaybeRefOrGetter } from 'vue'
import { onBeforeRouteLeave, type RouteLocationNormalized } from 'vue-router'

export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave this page and discard them?'

/**
 * Asks before discarding unsaved work: on in-app navigation (unless `allow(to)` says the target
 * keeps the work) and when the browser tab is closed or reloaded.
 */
export function useUnsavedChangesGuard(
  isDirty: MaybeRefOrGetter<boolean>,
  allow: (to: RouteLocationNormalized) => boolean = () => false,
) {
  onBeforeRouteLeave((to) => {
    if (!toValue(isDirty) || allow(to)) return true
    return window.confirm(UNSAVED_CHANGES_MESSAGE)
  })

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!toValue(isDirty)) return
    event.preventDefault()
    // Older browsers need returnValue to show the prompt.
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
