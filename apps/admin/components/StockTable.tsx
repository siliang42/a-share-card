"use client";

import type {Stock} from "@gushi/contracts";
import {ChevronRight, Search, Star} from "lucide-react";
import {useMemo, useState} from "react";

export type TableQuote = {
  price: number;
  changePercent: number;
  freshness: string;
};

export type StockFilters = {
  query: string;
  board: string;
  sectorId: string;
};

const BOARD_NAMES: Record<string, string> = {
  SH_MAIN: "沪市主板",
  SZ_MAIN: "深市主板",
  CHINEXT: "创业板",
  STAR: "科创板",
  BSE: "北交所",
};

export function StockTable({
  stocks,
  quotes = {},
  total,
  onSelect,
  onLoadMore,
  filters,
  onFiltersChange,
  sectorOptions,
}: {
  stocks: Stock[];
  quotes?: Record<string, TableQuote>;
  total?: number;
  onSelect: (stock: Stock) => void;
  onLoadMore?: () => void;
  filters?: StockFilters;
  onFiltersChange?: (filters: StockFilters) => void;
  sectorOptions?: {id: string; name: string}[];
}) {
  const [localFilters, setLocalFilters] = useState<StockFilters>({query: "", board: "", sectorId: ""});
  const activeFilters = filters ?? localFilters;

  function updateFilters(update: Partial<StockFilters>) {
    const next = {...activeFilters, ...update};
    setLocalFilters(next);
    onFiltersChange?.(next);
  }

  const sectors = useMemo(
    () => sectorOptions ?? Array.from(new Set(stocks.flatMap((stock) => stock.sectors ?? [])))
      .sort()
      .map((name) => ({id: name, name})),
    [sectorOptions, stocks],
  );
  const filtered = useMemo(() => {
    if (filters) return stocks;
    const needle = activeFilters.query.trim().toLocaleLowerCase("zh-CN");
    return stocks.filter((stock) => {
      const matchesQuery = !needle
        || stock.name.toLocaleLowerCase("zh-CN").includes(needle)
        || stock.symbol.includes(needle);
      const matchesBoard = !activeFilters.board || stock.board === activeFilters.board;
      const matchesSector = !activeFilters.sectorId || stock.sectors?.includes(activeFilters.sectorId);
      return matchesQuery && matchesBoard && matchesSector;
    });
  }, [activeFilters, filters, stocks]);

  return (
    <div className="stock-table-stack">
      <div className="table-toolbar">
        <label className="search-control">
          <span className="sr-only">搜索股票</span>
          <Search aria-hidden="true" size={17} />
          <input
            type="search"
            aria-label="搜索股票"
            value={activeFilters.query}
            onChange={(event) => updateFilters({query: event.target.value})}
            placeholder="名称 / 代码"
          />
        </label>
        <label>
          <span className="sr-only">所属市场</span>
          <select aria-label="所属市场" value={activeFilters.board} onChange={(event) => updateFilters({board: event.target.value})}>
            <option value="">全部市场</option>
            {Object.entries(BOARD_NAMES).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">所属板块</span>
          <select aria-label="所属板块" value={activeFilters.sectorId} onChange={(event) => updateFilters({sectorId: event.target.value})}>
            <option value="">全部板块</option>
            {sectors.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}
          </select>
        </label>
        <span className="result-count">{filtered.length} / {(total ?? stocks.length).toLocaleString("en-US")}</span>
      </div>

      <div className="table-frame stock-table-frame">
        <table>
          <thead>
            <tr>
              <th aria-label="收藏" />
              <th>股票</th>
              <th>价格</th>
              <th>涨跌</th>
              <th>市场</th>
              <th>板块</th>
              <th>主营摘要</th>
              <th>生效来源</th>
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((stock) => {
              const quote = quotes[stock.id];
              const direction = quote && quote.changePercent >= 0 ? "up" : "down";
              const absoluteChange = Math.abs(quote?.changePercent ?? 0).toFixed(2);
              return (
                <tr key={stock.id}>
                  <td><Star aria-hidden="true" className="muted-icon" size={15} /></td>
                  <td>
                    <button className="stock-name-button" type="button" onClick={() => onSelect(stock)}>
                      <strong>{stock.name}</strong>
                      <span>{stock.symbol}</span>
                    </button>
                  </td>
                  <td className="numeric-cell">{quote ? quote.price.toFixed(2) : "--"}</td>
                  <td>
                    {quote ? (
                      <span
                        className={`quote-change quote-${direction}`}
                        aria-label={`${direction === "up" ? "上涨" : "下跌"} ${absoluteChange}%`}
                      >
                        {quote.changePercent >= 0 ? "+" : "-"}{absoluteChange}%
                      </span>
                    ) : "--"}
                  </td>
                  <td><span className="board-label">{BOARD_NAMES[stock.board] ?? stock.board}</span></td>
                  <td className="sector-cell">{stock.sectors?.[0] ?? "待补充"}</td>
                  <td className="summary-cell">{stock.businessSummary ?? "待补充主营摘要"}</td>
                  <td>
                    <span className={`provenance-tag ${stock.businessSummarySource === "manual" ? "is-manual" : ""}`}>
                      {stock.businessSummarySource === "manual" ? "人工生效" : stock.businessSummarySource ?? "暂无"}
                    </span>
                  </td>
                  <td>
                    <button className="icon-button" type="button" aria-label={`编辑 ${stock.name}`} onClick={() => onSelect(stock)}>
                      <ChevronRight aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length ? <p className="empty-state">没有符合当前条件的股票。</p> : null}
      </div>
      {onLoadMore ? (
        <button className="secondary-button load-more" type="button" onClick={onLoadMore}>加载更多</button>
      ) : null}
    </div>
  );
}
