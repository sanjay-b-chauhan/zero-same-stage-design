/* Browser stub for the bare `electron` module. Nothing in the kickoff flow
 * reaches ipcRenderer directly (the renderer talks to window.electronAPI), so
 * these exist only to keep the module graph resolvable. */
export const ipcRenderer = {
  invoke: async () => undefined,
  send: () => {},
  on: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
};
export const contextBridge = { exposeInMainWorld: () => {} };
export const shell = { openExternal: async () => {} };
export default { ipcRenderer, contextBridge, shell };
