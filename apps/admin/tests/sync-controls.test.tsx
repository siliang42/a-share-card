import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {SyncControls} from "@/components/SyncControls";


describe("SyncControls", () => {
  it("runs the selected source job and reports completion", async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockResolvedValue({kind: "shenwan", status: "completed", details: {}});
    render(<SyncControls onRun={run} />);

    await user.click(screen.getByRole("button", {name: "同步申万行业"}));

    expect(run).toHaveBeenCalledWith("shenwan");
    expect(await screen.findByRole("status")).toHaveTextContent("申万行业同步完成");
  });
});
