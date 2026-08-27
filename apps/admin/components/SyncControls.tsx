"use client";

import type {SyncResult} from "@gushi/contracts";
import {BookOpenCheck, Boxes, DatabaseZap, RefreshCw} from "lucide-react";
import {useState} from "react";

const JOBS = [
  {kind: "universe", label: "同步股票目录", complete: "股票目录同步完成", icon: DatabaseZap},
  {kind: "shenwan", label: "同步申万行业", complete: "申万行业同步完成", icon: BookOpenCheck},
  {kind: "concepts", label: "同步概念板块", complete: "概念板块同步完成", icon: Boxes},
  {kind: "publish", label: "发布手机数据集", complete: "手机数据集发布完成", icon: RefreshCw},
] as const;

export function SyncControls({onRun}: {onRun: (kind: string) => Promise<SyncResult>}) {
  const [active, setActive] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(kind: string, complete: string) {
    setActive(kind);
    setMessage("");
    try {
      await onRun(kind);
      setMessage(complete);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败，请查看数据源状态。 ");
    } finally {
      setActive(null);
    }
  }

  return (
    <section className="sync-control-section" aria-labelledby="sync-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">MANUAL RUN</p>
          <h2 id="sync-title">手动同步</h2>
        </div>
        <span role="status">{message}</span>
      </div>
      <div className="sync-actions">
        {JOBS.map(({kind, label, complete, icon: Icon}) => (
          <button
            className={kind === "publish" ? "primary-button" : "secondary-button"}
            type="button"
            disabled={active !== null}
            onClick={() => run(kind, complete)}
            key={kind}
          >
            <Icon className={active === kind ? "is-spinning" : ""} aria-hidden="true" size={16} />
            {active === kind ? "同步中" : label}
          </button>
        ))}
      </div>
    </section>
  );
}
