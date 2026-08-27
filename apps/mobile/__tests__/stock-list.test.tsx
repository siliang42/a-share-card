import {fireEvent, render} from "@testing-library/react-native";

import {StockList} from "@/src/features/stocks/StockList";
import {StockRow, type BrowseStock} from "@/src/features/stocks/StockRow";

const stock: BrowseStock = {
  id: "SZ:000400",
  symbol: "000400",
  name: "许继电气",
  board: "深市主板",
  primarySector: "电力设备",
  businessSummary: "聚焦电力系统自动化、保护控制及新能源装备。",
  quote: {
    price: 31.42,
    changePercent: -2.18,
    freshness: "fresh",
    sourceTime: "2026-08-27T06:58:00Z",
  },
  isFavorite: false,
  memoryStatus: "学习中",
};

const second: BrowseStock = {
  ...stock,
  id: "SH:600519",
  symbol: "600519",
  name: "贵州茅台",
  board: "沪市主板",
  primarySector: "食品饮料",
  businessSummary: "主营茅台酒及系列酒的生产和销售。",
  quote: {price: 1488.88, changePercent: 1.26, freshness: "stale", sourceTime: "2026-08-27T06:45:00Z"},
  isFavorite: true,
  memoryStatus: "待复习",
};

describe("StockRow", () => {
  it("hides summaries in compact density without hiding quote signs", async () => {
    const view = await render(<StockRow stock={stock} density="compact" />);

    expect(view.queryByText(stock.businessSummary!)).toBeNull();
    expect(view.getByText("-2.18%")).toBeVisible();
    expect(view.getByLabelText("许继电气，000400，下跌 2.18%")).toBeVisible();
  });

  it("labels cached quotes in detail density", async () => {
    const view = await render(<StockRow stock={second} density="detail" />);
    expect(view.getByText("缓存行情")).toBeVisible();
    expect(view.getByText(second.businessSummary!)).toBeVisible();
  });
});

describe("StockList", () => {
  it("searches by name or code and switches density without losing results", async () => {
    const view = await render(<StockList deckId="market:all" stocks={[stock, second]} />);

    await fireEvent.changeText(view.getByLabelText("搜索股票"), "600519");
    expect(view.getByText("贵州茅台")).toBeVisible();
    expect(view.queryByText("许继电气")).toBeNull();

    await fireEvent.press(view.getByRole("button", {name: "紧凑列表"}));
    expect(view.queryByText(second.businessSummary!)).toBeNull();
    expect(view.getByText("+1.26%")).toBeVisible();
  });
});
