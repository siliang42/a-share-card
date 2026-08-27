import type {Metadata} from "next";
import {SectorCatalog} from "@/components/SectorCatalog";

export const metadata: Metadata = {title: "板块目录"};

export default function SectorsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">SECTOR TAXONOMY</p><h1>板块目录</h1></div><p>申万行业与东方财富概念严格分开标注。</p></header>
      <SectorCatalog />
    </div>
  );
}
