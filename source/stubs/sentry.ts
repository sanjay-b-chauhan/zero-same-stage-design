/* Browser stub for @sentry/electron/renderer — the standalone build has no
 * Electron main process to forward events to, so every entry point is a no-op
 * with the same signature. */
export const init = (_o?: unknown) => {};
export const setTags = (_t?: unknown) => {};
export const setTag = (_k?: unknown, _v?: unknown) => {};
export const setUser = (_u?: unknown) => {};
export const addBreadcrumb = (_b?: unknown) => {};
export const captureException = (e?: unknown) => { console.warn('[sentry-stub] captureException', e); return ''; };
export const captureMessage = (m?: unknown) => { console.warn('[sentry-stub] captureMessage', m); return ''; };
export const browserTracingIntegration = (_o?: unknown) => ({ name: 'BrowserTracing' });
export const browserProfilingIntegration = () => ({ name: 'BrowserProfiling' });
export const startSpan = <T,>(_o: unknown, cb: (span: unknown) => T): T =>
  cb({ end: () => {}, setAttribute: () => {}, setStatus: () => {} });
export const startInactiveSpan = (_o?: unknown) => ({
  end: () => {}, setAttribute: () => {}, setStatus: () => {},
});
export const getCurrentScope = () => ({ setTag: () => {}, setUser: () => {}, setExtra: () => {} });
export const withScope = <T,>(cb: (s: unknown) => T): T =>
  cb({ setTag: () => {}, setExtra: () => {}, setLevel: () => {} });
export default { init, captureException, captureMessage };
