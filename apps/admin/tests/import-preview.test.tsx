import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {ImportPreview} from "@/components/ImportPreview";


describe("ImportPreview", () => {
  it("shows exact changes and blocks apply when rows were rejected", () => {
    render(
      <ImportPreview
        preview={{
          batchId: "batch-1",
          inserts: 3,
          updates: 8,
          unchanged: 12,
          rejected: 1,
          errors: [{row: 9, message: "找不到股票 SH:999999"}],
        }}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("新增 3")).toBeVisible();
    expect(screen.getByText("更新 8")).toBeVisible();
    expect(screen.getByText("第 9 行")).toBeVisible();
    expect(screen.getByRole("button", {name: "应用 11 项变更"})).toBeDisabled();
  });
});
