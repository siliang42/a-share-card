import type {Dashboard as DashboardSnapshot} from "@gushi/contracts";
import {AlertTriangle, CheckCircle2, Clock3, Database, Layers3} from "lucide-react";

export type SourceHealth = {
  name: string;
  role: string;
  status: string;
  updatedAt: string;
};

export function Dashboard({
  snapshot,
  sources,
}: {
  snapshot: DashboardSnapshot;
  sources: SourceHealth[];
}) {
  const metrics = [
    {label: "股票总数", value: snapshot.stockCount, icon: Database},
    {label: "板块分类", value: snapshot.sectorCount, icon: Layers3},
    {label: "待确认", value: snapshot.pendingConfirmationCount, icon: AlertTriangle},
  ];

  return (
    <div className="dashboard-stack">
      <section className="metric-band" aria-label="数据概况">
        {metrics.map(({label, value, icon: Icon}) => (
          <div className="metric" key={label}>
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            <div>
              <span>{label}</span>
              <strong>{value.toLocaleString("en-US")}</strong>
            </div>
          </div>
        ))}
        <div className={`freshness ${snapshot.staleQuoteCount ? "is-stale" : "is-fresh"}`}>
          {snapshot.staleQuoteCount ? (
            <AlertTriangle aria-hidden="true" size={18} />
          ) : (
            <CheckCircle2 aria-hidden="true" size={18} />
          )}
          <div>
            <span>行情缓存</span>
            <strong>
              {snapshot.staleQuoteCount
                ? `${snapshot.staleQuoteCount} 项数据已过期`
                : "当前数据有效"}
            </strong>
          </div>
        </div>
      </section>

      <section className="data-section" aria-labelledby="sources-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SOURCE STATUS</p>
            <h2 id="sources-title">数据源状态</h2>
          </div>
          <span className="dataset-version">数据版本 {snapshot.datasetVersion ?? "尚未发布"}</span>
        </div>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>数据源</th>
                <th>职责</th>
                <th>状态</th>
                <th>最近响应</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.name}>
                  <td>
                    <strong>
                      {source.name}{source.role.includes("备用") ? " · 备用" : ""}
                    </strong>
                  </td>
                  <td>{source.role.replace(" · 备用", "")}</td>
                  <td>
                    <span className={`status-text status-${source.status}`}>{source.status}</span>
                  </td>
                  <td className="mono-cell"><Clock3 aria-hidden="true" size={13} />{source.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-section" aria-labelledby="runs-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENT RUNS</p>
            <h2 id="runs-title">最近同步</h2>
          </div>
        </div>
        {snapshot.recentSyncs.length ? (
          <div className="run-list">
            {snapshot.recentSyncs.map((run, index) => (
              <div className="run-row" key={String(run.id ?? index)}>
                <span>{String(run.kind ?? "同步任务")}</span>
                <span>{String(run.source ?? "local")}</span>
                <strong>{String(run.status ?? "unknown")}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">还没有同步记录。首次同步后会在这里显示来源、耗时和结果。</p>
        )}
      </section>
    </div>
  );
}
