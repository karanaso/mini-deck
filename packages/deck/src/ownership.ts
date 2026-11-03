import type { ContentOwner, ElementData, SlideData } from "./types.js";

export function getElementOwner(element: ElementData): ContentOwner | undefined {
  return element.owner;
}

export function getSlideOwner(slide: SlideData): ContentOwner | undefined {
  return slide.owner;
}

export function uniqueOwners(owners: readonly ContentOwner[]): ContentOwner[] {
  const seen = new Map<string, ContentOwner>();
  for (const owner of owners) {
    if (!seen.has(owner.id)) seen.set(owner.id, owner);
  }
  return Array.from(seen.values());
}

function conflictingOwners(
  owners: readonly ContentOwner[],
  actorOwnerId: string,
): ContentOwner[] {
  return uniqueOwners(owners).filter((owner) => owner.id !== actorOwnerId);
}

export function findElementDeletionConflicts(
  slide: SlideData,
  elementIds: readonly string[],
  actorOwnerId: string,
): ContentOwner[] {
  const selected = new Set(elementIds);
  const owners = slide.elements
    .filter((element) => selected.has(element.id))
    .map((element) => element.owner)
    .filter((owner): owner is ContentOwner => Boolean(owner));
  return conflictingOwners(owners, actorOwnerId);
}

export function findSlideDeletionConflicts(
  slide: SlideData,
  actorOwnerId: string,
): ContentOwner[] {
  const owners = [
    ...(slide.owner ? [slide.owner] : []),
    ...slide.elements
      .map((element) => element.owner)
      .filter((owner): owner is ContentOwner => Boolean(owner)),
  ];
  return conflictingOwners(owners, actorOwnerId);
}
