import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {StockTable} from "@/components/StockTable";


const stocks = [
  {
    id: "SH:600519",
    exchange: "SH",
    symbol: "600519",
    name: "贵州茅台",
    board: "SH_MAIN",
    listingStatus: "active",
    businessSummary: "高端白酒生产与销售",
    businessSummarySource: "eastmoney",
    sectors: ["食品饮料", "白酒概念"],
  },
  {
    id: "SZ:000400",
    exchange: "SZ",
    symbol: "000400",
    name: "许继电气",
    board: "SZ_MAIN",
    listingStatus: "active",
    businessSummary: "电网自动化与特高压设备",
    businessSummarySource: "manual",
    sectors: ["电力设备"],
  },
];

describe("StockTable", () => {
  it("filters by name or code and keeps quote direction readable", async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    render(
      <StockTable
        stocks={stocks}
        quotes={{
          "SH:600519": {price: 1291.16, changePercent: -0.89, freshness: "fresh"},
          "SZ:000400": {price: 21.96, changePercent: 2.18, freshness: "cached"},
        }}
        onSelect={select}
      />,
    );

    expect(screen.getByText("-0.89%")).toHaveAccessibleName("下跌 0.89%");
    await user.type(screen.getByRole("searchbox", {name: "搜索股票"}), "000400");
    expect(screen.queryByText("贵州茅台")).toBeNull();
    await user.click(screen.getByRole("button", {name: "许继电气 000400"}));
    expect(select).toHaveBeenCalledWith(stocks[1]);
  });
});
