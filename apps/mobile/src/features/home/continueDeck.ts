import type {LocalCatalog} from "@/src/db/repository";

type CatalogDeck = LocalCatalog["markets"][number];

export function resolveContinueDeck(
  catalog: LocalCatalog,
  lastDeckId: string | null,
): CatalogDeck | null {
  const decks = [...catalog.markets, ...catalog.sectors];
  return decks.find((deck) => deck.id === lastDeckId) ?? catalog.markets[0] ?? decks[0] ?? null;
}
