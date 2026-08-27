"use client";

import type {ImportPreview as ImportPreviewResult} from "@gushi/contracts";
import {Download, FileUp} from "lucide-react";
import {FormEvent, useState} from "react";

import {applyCsv, exportCsvUrl, previewCsv} from "@/lib/api";
import {ImportPreview} from "./ImportPreview";

export function ImportWorkspace() {
  const [kind, setKind] = useState<"stock_overrides" | "manual_stocks">("stock_overrides");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setPreview(await previewCsv(kind, file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "CSV 校验失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="import-workspace">
      <section className="data-section" aria-labelledby="import-title">
        <div className="section-heading">
          <div><p className="eyebrow">CSV INBOUND</p><h2 id="import-title">导入本地补充数据</h2></div>
          <span className="dataset-version">UTF-8 · 先预览后应用</span>
        </div>
        <form className="import-form" onSubmit={submit}>
          <label className="field">
            <span>数据类型</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option value="stock_overrides">股票人工覆盖</option>
              <option value="manual_stocks">本地补充股票</option>
            </select>
          </label>
          <label className="file-picker">
            <FileUp aria-hidden="true" size={20} />
            <span>{file ? file.name : "选择 CSV 文件"}</span>
            <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <button className="primary-button" type="submit" disabled={!file || loading}>
            {loading ? "正在校验" : "生成变更预览"}
          </button>
        </form>
        {error ? <div className="inline-alert" role="alert">{error}</div> : null}
      </section>

      {preview ? <ImportPreview preview={preview} onApply={(batchId) => applyCsv(batchId)} /> : null}

      <section className="data-section" aria-labelledby="export-title">
        <div className="section-heading"><div><p className="eyebrow">CSV OUTBOUND</p><h2 id="export-title">导出当前数据</h2></div></div>
        <div className="export-list">
          <a className="secondary-button" href={exportCsvUrl("stocks")}><Download aria-hidden="true" size={16} />有效股票视图</a>
          <a className="secondary-button" href={exportCsvUrl("stock_overrides")}><Download aria-hidden="true" size={16} />人工覆盖模板</a>
          <a className="secondary-button" href={exportCsvUrl("manual_stocks")}><Download aria-hidden="true" size={16} />本地补充股票</a>
        </div>
      </section>
    </div>
  );
}
