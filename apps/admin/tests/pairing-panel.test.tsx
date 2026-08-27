import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {PairingPanel} from "@/components/PairingPanel";


describe("PairingPanel", () => {
  it("keeps the pairing token concealed until explicitly revealed", async () => {
    const user = userEvent.setup();
    render(
      <PairingPanel
        pairing={{
          baseUrl: "http://192.168.1.8:8000",
          token: "local-secret-token",
          service: "股识本地数据服务",
        }}
      />,
    );

    expect(screen.getByRole("img", {name: "App 配对二维码"})).toBeVisible();
    expect(screen.queryByText("local-secret-token")).toBeNull();
    await user.click(screen.getByRole("button", {name: "显示配对令牌"}));
    expect(screen.getByText("local-secret-token")).toBeVisible();
  });
});
