"use client";

import type {Stock, StockOverrideUpdate} from "@gushi/contracts";
import {Save} from "lucide-react";
import {FormEvent, useState} from "react";

export function StockEditor({
  stock,
  onSave,
}: {
  stock: Stock;
  onSave: (update: StockOverrideUpdate) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [businessSummary, setBusinessSummary] = useState(
    stock.businessSummarySource === "manual" ? stock.businessSummary ?? "" : "",
  );
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await onSave({
        name: name.trim() || null,
        businessSummary: businessSummary.trim() || null,
        tags: tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
        notes: notes.trim() || null,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stock-editor" onSubmit={submit}>
      <div className="editor-identity">
        <div>
          <p className="eyebrow">{stock.id}</p>
          <h2>{stock.name}</h2>
        </div>
        <span className="board-label">{stock.board}</span>
      </div>

      <div className="provenance-rail">
        <div>
          <span>外部源名称</span>
          <strong>{stock.name}</strong>
        </div>
        <div>
          <span>当前主营来源</span>
          <strong>{stock.businessSummarySource ?? "暂无"}</strong>
        </div>
        <div className="source-summary">
          <span>当前生效主营</span>
          <strong>{stock.businessSummary ?? "暂无外部摘要"}</strong>
        </div>
      </div>

      <div className="field">
        <label htmlFor="override-name">人工名称覆盖</label>
        <input
          id="override-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="留空则继续使用外部源名称"
        />
      </div>

      <div className="field">
        <label htmlFor="override-summary">人工主营摘要</label>
        <textarea
          id="override-summary"
          value={businessSummary}
          onChange={(event) => setBusinessSummary(event.target.value)}
          placeholder="留空则继续使用当前生效主营"
          maxLength={240}
          rows={5}
        />
        <small>{businessSummary.length} / 240</small>
      </div>

      <div className="field">
        <label htmlFor="override-tags">人工标签</label>
        <input
          id="override-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="使用逗号分隔"
        />
      </div>

      <div className="field">
        <label htmlFor="override-notes">个人备注</label>
        <textarea
          id="override-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </div>

      <div className="editor-actions">
        <span role="status">{saved ? "已保存" : ""}</span>
        <button className="primary-button" type="submit" disabled={saving}>
          <Save aria-hidden="true" size={16} />
          {saving ? "保存中" : "保存修改"}
        </button>
      </div>
    </form>
  );
}
