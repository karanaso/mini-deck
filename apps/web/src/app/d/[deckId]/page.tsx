import { DeckLoader } from "@/components/deck-loader";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  return <DeckLoader deckId={deckId} />;
}
