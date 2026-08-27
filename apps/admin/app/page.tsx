import {DashboardScreen} from "@/components/DashboardScreen";

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">OPERATIONS</p><h1>数据总览</h1></div><p>检查目录、板块、数据集和最近同步结果。</p></header>
      <DashboardScreen />
    </div>
  );
}
