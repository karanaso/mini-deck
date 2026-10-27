import { sanitizeAwarenessState } from "@mini-deck/deck";

export function sanitizeAwarenessStates(
  states: Map<number, Record<string, any>>,
): void {
  for (const [clientId, state] of states) {
    const sanitized = sanitizeAwarenessState(state);
    if (sanitized) states.set(clientId, sanitized);
    else states.delete(clientId);
  }
}
