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
