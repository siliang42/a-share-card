import {fireEvent, render} from "@testing-library/react-native";

import {HomeScreen, type HomeSnapshot} from "@/src/features/home/HomeScreen";

const snapshot: HomeSnapshot = {
  marketStrip: [
    {id: "sse", name: "上证", value: "3,812.42", changePercent: 0.68},
    {id: "szse", name: "深证", value: "12,194.15", changePercent: -0.34},
  ],
  progress: {completed: 18, target: 40, due: 12, streakDays: 6},
  continueDeck: {id: "market:sh_main", name: "沪市主板", nextStockName: "许继电气"},
  marketDeckCount: 5,
  sectorDeckCount: 496,
};

describe("HomeScreen", () => {
  it("makes continue learning primary and exposes both catalog types", async () => {
    const continueLearning = jest.fn();
    const openCatalog = jest.fn();
    const view = await render(
      <HomeScreen snapshot={snapshot} onContinue={continueLearning} onOpenCatalog={openCatalog} />,
    );

    expect(view.getByRole("button", {name: /继续学习/})).toBeVisible();
    expect(view.getByText("股票市场")).toBeVisible();
    expect(view.getByText("板块市场")).toBeVisible();
    expect(view.getByText("18 / 40")).toBeVisible();
    expect(view.getByText("-0.34%")).toBeVisible();

    await fireEvent.press(view.getByRole("button", {name: /继续学习/}));
    expect(continueLearning).toHaveBeenCalledWith("market:sh_main");
  });
});
