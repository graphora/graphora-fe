import '@testing-library/jest-dom/vitest'

// Radix UI's interactive primitives (Select, DropdownMenu, Dialog, etc.)
// rely on PointerEvent APIs and scrollIntoView that jsdom doesn't
// implement. Without these stubs, user-event-driven clicks on Radix
// triggers fail silently — the dropdown never opens, items never
// render, and tests fall back to timing out on `findByText`. Stubbing
// here at the global setup level keeps individual tests free of
// boilerplate.
const HTMLElementProto = window.HTMLElement.prototype as unknown as {
  hasPointerCapture: () => boolean
  setPointerCapture: () => void
  releasePointerCapture: () => void
  scrollIntoView: () => void
}
if (!HTMLElementProto.hasPointerCapture) {
  HTMLElementProto.hasPointerCapture = () => false
}
if (!HTMLElementProto.setPointerCapture) {
  HTMLElementProto.setPointerCapture = () => {}
}
if (!HTMLElementProto.releasePointerCapture) {
  HTMLElementProto.releasePointerCapture = () => {}
}
if (!HTMLElementProto.scrollIntoView) {
  HTMLElementProto.scrollIntoView = () => {}
}
