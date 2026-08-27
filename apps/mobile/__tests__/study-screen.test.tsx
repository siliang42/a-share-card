import {fireEvent, render, waitFor} from "@testing-library/react-native";

import {StudyScreen} from "@/src/features/study/StudyScreen";
import type {StudySession} from "@/src/features/study/session";

const session: StudySession = {
  deckId: "market:sz_main",
  mode: "sequential",
  stocks: [{stockId: "SZ:000400", symbol: "000400", name: "许继电气", board: "SZ_MAIN", businessSummary: "电力自动化与保护控制", sectors: ["电力设备", "智能电网"], price: 31.42, changePercent: -2.18, quoteFreshness: "fresh"}],
  currentIndex: 0,
  current: {stockId: "SZ:000400", symbol: "000400", name: "许继电气", board: "SZ_MAIN", businessSummary: "电力自动化与保护控制", sectors: ["电力设备", "智能电网"], price: 31.42, changePercent: -2.18, quoteFreshness: "fresh"},
  completedCount: 0,
  total: 1,
};

describe("StudyScreen", () => {
  it("requires reveal before rating and maps accessible buttons to binary ratings", async () => {
    const rate = jest.fn().mockResolvedValue(undefined);
    const view = await render(<StudyScreen direction="name_to_profile" onRate={rate} onUndo={jest.fn()} session={session} />);

    expect(view.getByText("许继电气")).toBeVisible();
    expect(view.queryByText("000400")).toBeNull();
    expect(view.getByRole("button", {name: "不熟悉"})).toBeDisabled();
    expect(view.getByRole("button", {name: "记得"})).toBeDisabled();

    await fireEvent.press(view.getByRole("button", {name: "显示答案"}));
    expect(view.getByText("000400")).toBeVisible();
    expect(view.getByText("电力自动化与保护控制")).toBeVisible();
    await fireEvent.press(view.getByRole("button", {name: "记得"}));
    await waitFor(() => expect(rate).toHaveBeenCalledWith("good"));
  });

  it("can switch to code-to-name concealment", async () => {
    const changeDirection = jest.fn();
    const view = await render(<StudyScreen direction="name_to_profile" onDirectionChange={changeDirection} onRate={jest.fn()} onUndo={jest.fn()} session={session} />);

    await fireEvent.press(view.getByRole("button", {name: "代码背名称"}));

    expect(changeDirection).toHaveBeenCalledWith("code_to_name");
  });

  it("offers an explicit exit command on every platform", async () => {
    const close = jest.fn();
    const view = await render(<StudyScreen direction="name_to_profile" onClose={close} onRate={jest.fn()} onUndo={jest.fn()} session={session} />);

    await fireEvent.press(view.getByRole("button", {name: "退出学习"}));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
