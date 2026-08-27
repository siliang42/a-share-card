import type {Metadata} from "next";
import {StockMaintenance} from "@/components/StockMaintenance";

export const metadata: Metadata = {title: "股票维护"};

export default function StocksPage() {
  return (
    <div className="page-stack wide-page">
      <header className="page-heading"><div><p className="eyebrow">STOCK UNIVERSE</p><h1>股票维护</h1></div><p>搜索全市场股票，核对行情、板块与主营来源。</p></header>
      <StockMaintenance />
    </div>
  );
}
