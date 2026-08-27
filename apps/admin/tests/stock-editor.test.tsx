import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {StockEditor} from "@/components/StockEditor";


describe("StockEditor", () => {
  it("submits only manual override fields", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <StockEditor
        stock={{
          id: "SZ:000400",
          exchange: "SZ",
          symbol: "000400",
          name: "许继电气",
          board: "SZ_MAIN",
          listingStatus: "active",
          businessSummary: "外部主营",
          businessSummarySource: "fixture",
          sectors: ["电网设备"],
        }}
        onSave={save}
      />,
    );

    const summary = screen.getByLabelText("人工主营摘要");
    await user.clear(summary);
    await user.type(summary, "电网自动化与特高压设备");
    await user.click(screen.getByRole("button", {name: "保存修改"}));

    expect(save).toHaveBeenCalledWith({
      businessSummary: "电网自动化与特高压设备",
      name: null,
      notes: null,
      tags: [],
    });
  });

  it("does not promote an untouched source summary to a manual override", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <StockEditor
        stock={{
          id: "SH:600519",
          exchange: "SH",
          symbol: "600519",
          name: "贵州茅台",
          board: "SH_MAIN",
          listingStatus: "active",
          businessSummary: "高端白酒生产与销售",
          businessSummarySource: "eastmoney",
          sectors: ["食品饮料"],
        }}
        onSave={save}
      />,
    );

    await user.click(screen.getByRole("button", {name: "保存修改"}));

    expect(save).toHaveBeenCalledWith({
      businessSummary: null,
      name: null,
      notes: null,
      tags: [],
    });
  });
});
