import type {Metadata} from "next";
import {ImportWorkspace} from "@/components/ImportWorkspace";

export const metadata: Metadata = {title: "导入导出"};

export default function ImportsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">LOCAL EXCHANGE</p><h1>导入导出</h1></div><p>CSV 用于交换和补充，SQLite 仍是本地权威数据。</p></header>
      <ImportWorkspace />
    </div>
  );
}
