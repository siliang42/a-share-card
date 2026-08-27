import {fireEvent, render, waitFor} from "@testing-library/react-native";

import {MarketCatalog} from "@/src/features/catalog/MarketCatalog";
import {StockDetail} from "@/src/features/stocks/StockDetail";

const catalog = {
  markets: [
    {id: "market:sh_main", name: "沪市主板", taxonomy: "market", stockCount: 1689},
    {id: "market:star", name: "科创板", taxonomy: "market", stockCount: 591},
  ],
  sectors: [
    {id: "sector:shenwan:801120", name: "食品饮料", taxonomy: "shenwan", stockCount: 128},
    {id: "sector:eastmoney_concept:BK0456", name: "智能电网", taxonomy: "eastmoney_concept", stockCount: 93},
  ],
};

describe("MarketCatalog", () => {
  it("separates stock markets from sector taxonomies and opens a deck", async () => {
    const openDeck = jest.fn();
    const view = await render(<MarketCatalog catalog={catalog} onOpenDeck={openDeck} />);

    expect(view.getByText("股票市场")).toBeVisible();
    expect(view.getByText("申万行业")).toBeVisible();
    expect(view.getByText("热门概念")).toBeVisible();
    expect(view.queryByText("其他分类")).toBeNull();
    await fireEvent.press(view.getByRole("button", {name: /智能电网/}));
    expect(openDeck).toHaveBeenCalledWith("sector:eastmoney_concept:BK0456");
  });
});

describe("StockDetail", () => {
  it("supports favorite and personal note actions", async () => {
    const toggleFavorite = jest.fn();
    const saveNote = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <StockDetail
        note=""
        onSaveNote={saveNote}
        onToggleFavorite={toggleFavorite}
        stock={{
          id: "SZ:000400",
          symbol: "000400",
          name: "许继电气",
          board: "SZ_MAIN",
          primarySector: "电力设备",
          sectorNames: ["电力设备", "智能电网"],
          businessSummary: "聚焦电力系统自动化、保护控制及新能源装备。",
          businessSummarySource: "eastmoney",
          quote: null,
          isFavorite: false,
          memoryStatus: "未学习",
        }}
      />,
    );

    await fireEvent.press(view.getByRole("button", {name: "收藏 许继电气"}));
    expect(toggleFavorite).toHaveBeenCalledWith("SZ:000400", true);
    await fireEvent.changeText(view.getByLabelText("个人笔记"), "特高压与继保");
    await fireEvent.press(view.getByRole("button", {name: "保存笔记"}));
    await waitFor(() => expect(saveNote).toHaveBeenCalledWith("SZ:000400", "特高压与继保"));
  });
});
