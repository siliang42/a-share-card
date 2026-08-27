import type {QuoteBatch} from "@gushi/contracts";

import type {PairingConfig} from "./config";
import {StockRepository, type LocalQuote, type SqlDatabase} from "@/src/db/repository";

export type QuotePayload = Omit<LocalQuote, "fetchedAt">;
export type QuoteLoader = (stockIds: string[]) => Promise<QuotePayload[]>;

export function createQuoteLoader(pairing: PairingConfig): QuoteLoader {
  const baseUrl = pairing.baseUrl.replace(/\/$/, "");
  return async (stockIds) => {
    if (!stockIds.length) return [];
    const query = new URLSearchParams({ids: stockIds.join(",")});
    const response = await fetch(`${baseUrl}/api/v1/quotes?${query.toString()}`, {
      headers: {Authorization: `Bearer ${pairing.token}`},
    });
    if (!response.ok) throw new Error("行情刷新失败，已保留缓存行情");
    const payload = await response.json() as QuoteBatch;
    return payload.quotes.map((quote) => ({
      stockId: quote.stockId,
      price: quote.price,
      changePercent: quote.changePercent,
      source: quote.source,
      sourceTime: quote.sourceTime,
      freshness: quote.freshness,
    }));
  };
}

export async function refreshVisibleQuotes(
  loader: QuoteLoader,
  db: SqlDatabase,
  stockIds: string[],
  now = new Date(),
  minimumIntervalMs = 15_000,
): Promise<LocalQuote[]> {
  const ids = [...new Set(stockIds)].filter(Boolean);
  if (!ids.length) return [];
  const repository = new StockRepository(db);
  const cached = await repository.getQuotes(ids);
  const cachedById = new Map(cached.map((quote) => [quote.stockId, quote]));
  const staleIds = ids.filter((id) => {
    const quote = cachedById.get(id);
    return !quote || now.getTime() - Date.parse(quote.fetchedAt) >= minimumIntervalMs;
  });
  if (staleIds.length) {
    const received = await loader(staleIds);
    await repository.upsertQuotes(received, now.toISOString());
  }
  return repository.getQuotes(ids);
}
