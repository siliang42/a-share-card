"use client";

import type {Dashboard as DashboardSnapshot} from "@gushi/contracts";
import {RefreshCw} from "lucide-react";
import {useCallback, useEffect, useState} from "react";

import {getAdminDashboard, runSync} from "@/lib/api";
import {Dashboard, type SourceHealth} from "./Dashboard";
import {SyncControls} from "./SyncControls";

const SOURCES: SourceHealth[] = [
  {name: "东方财富", role: "股票目录、概念板块、公司资料 · 主源", status: "按需", updatedAt: "随同步检查"},
  {name: "申万指数", role: "申万行业与成分", status: "按需", updatedAt: "随同步检查"},
  {name: "腾讯行情", role: "实时价格 · 备用", status: "备用", updatedAt: "行情请求时检查"},
];

export function DashboardScreen() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setSnapshot(await getAdminDashboard());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取后台状态");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!snapshot) {
    return (
      <div className="page-state" role={error ? "alert" : "status"}>
        <RefreshCw aria-hidden="true" className={!error ? "is-spinning" : ""} size={20} />
        <p>{error || "正在读取本地数据状态"}</p>
        {error ? <button className="secondary-button" type="button" onClick={load}>重新连接</button> : null}
      </div>
    );
  }

  return (
    <>
      <Dashboard snapshot={snapshot} sources={SOURCES} />
      <SyncControls onRun={async (kind) => {
        const result = await runSync(kind);
        await load();
        return result;
      }} />
    </>
  );
}
