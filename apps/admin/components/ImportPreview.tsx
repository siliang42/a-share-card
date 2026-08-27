"use client";

import type {ImportPreview as ImportPreviewResult} from "@gushi/contracts";
import {AlertTriangle, Check, FileCheck2} from "lucide-react";
import {useState} from "react";

export function ImportPreview({
  preview,
  onApply,
}: {
  preview: ImportPreviewResult;
  onApply: (batchId: string) => Promise<unknown> | unknown;
}) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const changed = preview.inserts + preview.updates;
  const blocked = preview.rejected > 0;

  async function apply() {
    setApplying(true);
    try {
      await onApply(preview.batchId);
      setApplied(true);
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="import-preview" aria-labelledby="preview-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">VALIDATION RESULT</p>
          <h2 id="preview-title">导入变更预览</h2>
        </div>
        <FileCheck2 aria-hidden="true" size={22} />
      </div>
      <div className="change-strip" aria-label="变更统计">
        <strong>新增 {preview.inserts}</strong>
        <strong>更新 {preview.updates}</strong>
        <span>无变化 {preview.unchanged}</span>
        <span className={blocked ? "reject-count" : ""}>拒绝 {preview.rejected}</span>
      </div>
      {preview.errors.length ? (
        <div className="validation-errors">
          <div className="validation-title">
            <AlertTriangle aria-hidden="true" size={16} />
            <strong>先修正以下行，再重新预览</strong>
          </div>
          {preview.errors.map((error) => (
            <div className="validation-row" key={`${error.row}-${error.message}`}>
              <span>第 {error.row} 行</span>
              <p>{error.message}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="editor-actions">
        <span role="status">{applied ? <><Check aria-hidden="true" size={15} />变更已应用</> : ""}</span>
        <button
          className="primary-button"
          type="button"
          disabled={blocked || applying || !changed}
          onClick={apply}
        >
          {applying ? "正在应用" : `应用 ${changed} 项变更`}
        </button>
      </div>
    </section>
  );
}
