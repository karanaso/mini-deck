"use client";

import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";

import {
  sanitizeAwarenessState,
  type AwarenessState,
  type ParticipantState,
} from "@mini-deck/deck";

export interface AwarenessEntry extends AwarenessState {
  clientId: number;
}

export function useAwarenessStates(
  provider: HocuspocusProvider | null,
): AwarenessEntry[] {
  const [states, setStates] = useState<AwarenessEntry[]>([]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return;

    const update = () => {
      const next: AwarenessEntry[] = [];
      for (const [clientId, state] of awareness.getStates()) {
        const sanitized = sanitizeAwarenessState(state);
        if (sanitized) next.push({ clientId, ...sanitized });
      }
      next.sort((left, right) => left.clientId - right.clientId);
      setStates(next);
    };

    update();
    awareness.on("change", update);
    awareness.on("update", update);
    return () => {
      awareness.off("change", update);
      awareness.off("update", update);
    };
  }, [provider]);

  return states;
}

export function uniqueParticipants(entries: readonly AwarenessEntry[]): ParticipantState[] {
  const seen = new Set<string>();
  const participants: ParticipantState[] = [];
  for (const entry of entries) {
    if (seen.has(entry.user.id)) continue;
    seen.add(entry.user.id);
    participants.push(entry.user);
  }
  return participants;
}
