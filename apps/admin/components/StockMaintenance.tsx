"use client";

import type {Catalog, Stock} from "@gushi/contracts";
import {RefreshCw, X} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {getCatalog, getQuotes, getStocks, saveStockOverride} from "@/lib/api";
import {StockEditor} from "./StockEditor";
import {StockTable, type StockFilters, type TableQuote} from "./StockTable";

const EMPTY_FILTERS: StockFilters = {query: "", board: "", sectorId: ""};

export function StockMaintenance() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [quotes, setQuotes] = useState<Record<string, TableQuote>>({});
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getStocks({...filters, limit: 50});
        if (!current) return;
        setStocks(result.items);
        setTotal(result.total);
        setNextCursor(result.nextCursor ?? null);
      } catch (reason) {
        if (current) setError(reason instanceof Error ? reason.message : "股票目录加载失败");
      } finally {
        if (current) setLoading(false);
      }
    }, filters.query ? 250 : 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [filters]);

  const ids = useMemo(() => stocks.map((stock) => stock.id), [stocks]);
  useEffect(() => {
    if (!ids.length) return;
    let current = true;
    async function refreshQuotes() {
      try {
        const result = await getQuotes(ids);
        if (!current) return;
        setQuotes(Object.fromEntries(result.quotes.map((quote) => [quote.stockId, quote])));
      } catch {
        if (current) setQuotes({});
      }
    }
    void refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 15_000);
    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [ids]);

  async function loadMore() {
    if (!nextCursor) return;
    const result = await getStocks({...filters, cursor: nextCursor, limit: 50});
    setStocks((current) => [...current, ...result.items]);
    setNextCursor(result.nextCursor ?? null);
  }

  return (
    <div className="stock-maintenance">
      {error ? <div className="inline-alert" role="alert">{error}</div> : null}
      <div className={loading ? "is-loading table-area" : "table-area"}>
        {loading ? <div className="loading-line"><RefreshCw aria-hidden="true" className="is-spinning" size={15} />正在筛选全市场</div> : null}
        <StockTable
          stocks={stocks}
          quotes={quotes}
          total={total}
          filters={filters}
          onFiltersChange={setFilters}
          sectorOptions={catalog?.sectors.map(({id, name}) => ({id, name}))}
          onSelect={setSelected}
          onLoadMore={nextCursor ? loadMore : undefined}
        />
      </div>
      {selected ? (
        <div className="editor-backdrop" onMouseDown={() => setSelected(null)}>
          <aside className="editor-drawer" aria-label={`编辑 ${selected.name}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="drawer-close icon-button" type="button" aria-label="关闭编辑器" onClick={() => setSelected(null)}>
              <X aria-hidden="true" size={18} />
            </button>
            <StockEditor
              key={selected.id}
              stock={selected}
              onSave={async (update) => {
                const updated = await saveStockOverride(selected.id, update);
                setSelected(updated);
                setStocks((current) => current.map((stock) => stock.id === updated.id ? updated : stock));
              }}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
