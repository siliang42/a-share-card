"use client";

import type {Catalog} from "@gushi/contracts";
import {Search} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {getCatalog} from "@/lib/api";

const TAXONOMY_NAMES: Record<string, string> = {
  shenwan: "申万行业",
  eastmoney_concept: "概念板块",
};

export function SectorCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState("");
  const [taxonomy, setTaxonomy] = useState("shenwan");
  const [error, setError] = useState("");

  useEffect(() => {
    void getCatalog().then(setCatalog).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "板块目录加载失败");
    });
  }, []);

  const sectors = useMemo(() => (catalog?.sectors ?? []).filter((sector) => (
    sector.taxonomy === taxonomy && sector.name.includes(query.trim())
  )), [catalog, query, taxonomy]);

  if (error) return <div className="page-state" role="alert">{error}</div>;

  return (
    <div className="sector-catalog">
      <div className="catalog-toolbar">
        <div className="segmented-control" aria-label="板块体系">
          {Object.entries(TAXONOMY_NAMES).map(([value, label]) => (
            <button
              type="button"
              className={taxonomy === value ? "is-selected" : ""}
              aria-pressed={taxonomy === value}
              onClick={() => setTaxonomy(value)}
              key={value}
            >{label}</button>
          ))}
        </div>
        <label className="search-control">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">搜索板块</span>
          <input type="search" aria-label="搜索板块" placeholder="输入板块名称" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="sector-grid">
        {sectors.map((sector) => (
          <div className="sector-row" key={sector.id}>
            <div><strong>{sector.name}</strong><span>{TAXONOMY_NAMES[sector.taxonomy] ?? sector.taxonomy}</span></div>
            <span className="numeric-cell">{sector.stockCount.toLocaleString("en-US")} 只</span>
          </div>
        ))}
      </div>
      {!catalog ? <p className="empty-state">正在读取板块目录</p> : null}
      {catalog && !sectors.length ? <p className="empty-state">当前分类下没有匹配的板块。</p> : null}
    </div>
  );
}
