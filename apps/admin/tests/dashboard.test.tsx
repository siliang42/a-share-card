import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Dashboard} from "@/components/Dashboard";


describe("Dashboard", () => {
  it("shows source health and stale data without marketing copy", () => {
    render(
      <Dashboard
        snapshot={{
          datasetVersion: "20260827-a1b2",
          stockCount: 5904,
          sectorCount: 496,
          pendingConfirmationCount: 2,
          staleQuoteCount: 2,
          recentSyncs: [],
        }}
        sources={[
          {name: "东方财富", role: "股票资料 · 主源", status: "受限", updatedAt: "11:31"},
          {name: "腾讯行情", role: "实时价格 · 备用", status: "正常", updatedAt: "11:32"},
        ]}
      />,
    );

    expect(screen.getByText("5,904")).toBeVisible();
    expect(screen.getByText("腾讯行情 · 备用")).toBeVisible();
    expect(screen.getByText("2 项数据已过期")).toBeVisible();
    expect(screen.queryByText(/开启您的投资之旅/)).toBeNull();
  });
});
