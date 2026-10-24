/** Journal des appels « serveur » interceptés, lu par le test navigateur. */
type Call = { name: string; payload: unknown };

declare global {
  interface Window {
    __serverCalls: Call[];
  }
}

window.__serverCalls ??= [];

export function record(name: string, payload?: unknown) {
  window.__serverCalls.push({ name, payload });
}
