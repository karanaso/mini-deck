"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import {
  findElementDeletionConflicts,
  findSlideDeletionConflicts,
  getSlideData,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { useEditorStore } from "@/store/editor-store";

interface DeletionGuardValue {
  guardElementDeletion: (
    slideId: string,
    elementIds: readonly string[],
  ) => boolean;
  guardSlideDeletion: (slideId: string) => boolean;
}

const DeletionGuardContext = createContext<DeletionGuardValue | null>(null);

export function useDeletionGuard(): DeletionGuardValue {
  const value = useContext(DeletionGuardContext);
  if (!value) {
    throw new Error("useDeletionGuard must be used inside DeletionGuardProvider");
  }
  return value;
}

export function DeletionGuardProvider({ children }: { children: ReactNode }) {
  const { doc, owner } = useDeckContext();
  const blockedOwners = useEditorStore((state) => state.blockedOwners);
  const setBlockedOwners = useEditorStore((state) => state.setBlockedOwners);

  const guardElementDeletion = useCallback(
    (slideId: string, elementIds: readonly string[]): boolean => {
      if (!owner) return true;
      const slide = getSlideData(doc, slideId);
      if (!slide) return true;
      const conflicts = findElementDeletionConflicts(
        slide,
        elementIds,
        owner.id,
      );
      if (conflicts.length === 0) return true;
      setBlockedOwners(conflicts);
      return false;
    },
    [doc, owner, setBlockedOwners],
  );

  const guardSlideDeletion = useCallback(
    (slideId: string): boolean => {
      if (!owner) return true;
      const slide = getSlideData(doc, slideId);
      if (!slide) return true;
      const conflicts = findSlideDeletionConflicts(slide, owner.id);
      if (conflicts.length === 0) return true;
      setBlockedOwners(conflicts);
      return false;
    },
    [doc, owner, setBlockedOwners],
  );

  const value = useMemo<DeletionGuardValue>(
    () => ({ guardElementDeletion, guardSlideDeletion }),
    [guardElementDeletion, guardSlideDeletion],
  );

  return (
    <DeletionGuardContext.Provider value={value}>
      {children}
      <OwnershipDialog
        owners={blockedOwners}
        onDismiss={() => setBlockedOwners([])}
      />
    </DeletionGuardContext.Provider>
  );
}

function OwnershipDialog({
  owners,
  onDismiss,
}: {
  owners: readonly { id: string; name: string }[];
  onDismiss: () => void;
}) {
  const { locale, t } = useI18n();
  const open = owners.length > 0;
  const names = useMemo(
    () =>
      new Intl.ListFormat(INTL_LOCALES[locale], {
        style: "long",
        type: "conjunction",
      }).format(owners.map((owner) => owner.name)),
    [locale, owners],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent data-testid="ownership-dialog">
        <DialogHeader>
          <DialogTitle>{t("editor.ownership.title")}</DialogTitle>
          <DialogDescription data-testid="ownership-message">
            {owners.length === 1
              ? t("editor.ownership.single", { name: owners[0]?.name ?? "" })
              : t("editor.ownership.multiple", { names })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDismiss} data-testid="ownership-dismiss">
            {t("editor.ownership.dismiss")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
