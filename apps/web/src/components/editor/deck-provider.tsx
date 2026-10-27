"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import * as Y from "yjs";
import { toast } from "sonner";

import {
  LOCAL_ORIGIN,
  createParticipantIdentity,
  getMeta,
  getSlideOrder,
  getSlides,
  type ParticipantState,
  type Role,
} from "@mini-deck/deck";

import { useI18n } from "@/components/i18n/locale-provider";
import {
  readStoredParticipant,
  resolveParticipant,
  storeParticipant,
} from "@/lib/participant";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface DeckContextValue {
  deckId: string;
  token: string;
  role: Role;
  doc: Y.Doc;
  provider: HocuspocusProvider | null;
  undoManager: Y.UndoManager;
  status: ConnectionStatus;
  synced: boolean;
  participant: ParticipantState | null;
  canUndo: boolean;
  canRedo: boolean;
  renameParticipant: (name: string) => void;
  undo: () => void;
  redo: () => void;
}

const DeckContext = createContext<DeckContextValue | null>(null);

export function useDeckContext(): DeckContextValue {
  const value = useContext(DeckContext);
  if (!value) throw new Error("useDeckContext must be used inside DeckProvider");
  return value;
}

export function DeckProvider({
  deckId,
  token,
  role,
  children,
}: {
  deckId: string;
  token: string;
  role: Role;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [synced, setSynced] = useState(false);
  const [participant, setParticipant] = useState<ParticipantState | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const reconciled = useRef(false);

  const undoManager = useMemo(
    () =>
      new Y.UndoManager(
        [getMeta(doc), getSlides(doc), getSlideOrder(doc)],
        {
          trackedOrigins: new Set([LOCAL_ORIGIN]),
          captureTimeout: 500,
        },
      ),
    [doc],
  );

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://localhost:1234";
    const instance = new HocuspocusProvider({
      url: wsUrl,
      name: deckId,
      token,
      document: doc,
      onStatus: ({ status: nextStatus }) => {
        if (nextStatus === WebSocketStatus.Connected) setStatus("connected");
        else if (nextStatus === WebSocketStatus.Connecting) setStatus("connecting");
        else setStatus("disconnected");
      },
      onSynced: ({ state }) => setSynced(state),
      onAuthenticationFailed: () => setStatus("disconnected"),
    });

    setProvider(instance);
    const handleOffline = () => setStatus("disconnected");
    const handleOnline = () => {
      setStatus("connecting");
      void instance.connect().catch(() => undefined);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      setProvider(null);
      instance.destroy();
    };
  }, [deckId, token, doc]);

  useEffect(() => {
    const interval = setInterval(() => {
      const socket = provider?.configuration.websocketProvider;
      if (
        provider &&
        navigator.onLine &&
        socket?.status === WebSocketStatus.Connected
      ) {
        setStatus("connected");
      }
    }, 400);
    return () => clearInterval(interval);
  }, [provider]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return;
    const stored = readStoredParticipant();
    const existing = collectParticipants(awareness.getStates());
    const chosen = resolveParticipant(existing, stored);
    awareness.setLocalStateField("user", chosen);
    awareness.setLocalStateField("cursor", null);
    awareness.setLocalStateField("selection", null);
    setParticipant(chosen);
    storeParticipant(chosen);
  }, [provider]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness || !synced || reconciled.current || !participant) return;
    reconciled.current = true;
    const existing = collectParticipants(awareness.getStates()).filter(
      (candidate) => candidate.id !== participant.id,
    );
    const collision = existing.some(
      (candidate) =>
        candidate.name === participant.name || candidate.color === participant.color,
    );
    if (collision) {
      const replacement = createParticipantIdentity(existing);
      awareness.setLocalStateField("user", replacement);
      setParticipant(replacement);
      storeParticipant(replacement);
    }
  }, [provider, synced, participant]);

  useEffect(() => {
    const update = () =>
      setHistory({
        canUndo: undoManager.undoStack.length > 0,
        canRedo: undoManager.redoStack.length > 0,
      });
    update();
    undoManager.on("stack-item-added", update);
    undoManager.on("stack-item-popped", update);
    undoManager.on("stack-cleared", update);
    return () => {
      undoManager.off("stack-item-added", update);
      undoManager.off("stack-item-popped", update);
      undoManager.off("stack-cleared", update);
    };
  }, [undoManager]);

  const renameParticipant = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 40);
      if (!trimmed || !provider?.awareness) return;
      const next = { ...(participant ?? createParticipantIdentity()), name: trimmed };
      provider.awareness.setLocalStateField("user", next);
      setParticipant(next);
      storeParticipant(next);
      toast.success(t("editor.displayNameUpdated"));
    },
    [participant, provider, t],
  );

  const undo = useCallback(() => {
    undoManager.undo();
  }, [undoManager]);
  const redo = useCallback(() => {
    undoManager.redo();
  }, [undoManager]);

  const value = useMemo<DeckContextValue>(
    () => ({
      deckId,
      token,
      role,
      doc,
      provider,
      undoManager,
      status,
      synced,
      participant,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      renameParticipant,
      undo,
      redo,
    }),
    [
      deckId,
      token,
      role,
      doc,
      provider,
      undoManager,
      status,
      synced,
      participant,
      history.canUndo,
      history.canRedo,
      renameParticipant,
      undo,
      redo,
    ],
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

function collectParticipants(
  states: Map<number, Record<string, unknown>>,
): ParticipantState[] {
  const participants: ParticipantState[] = [];
  for (const state of states.values()) {
    const user = state.user as ParticipantState | undefined;
    if (
      user &&
      typeof user.id === "string" &&
      typeof user.name === "string" &&
      typeof user.color === "string"
    ) {
      participants.push(user);
    }
  }
  return participants;
}
