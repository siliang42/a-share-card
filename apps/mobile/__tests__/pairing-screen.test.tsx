import {fireEvent, render, waitFor} from "@testing-library/react-native";

import {PairingScreen} from "@/src/features/settings/PairingScreen";

describe("PairingScreen", () => {
  it("submits a trimmed LAN address and token", async () => {
    const pair = jest.fn().mockResolvedValue(undefined);
    const view = await render(<PairingScreen initialBaseUrl="" onPair={pair} />);

    await fireEvent.changeText(view.getByLabelText("Mac 服务地址"), " http://192.168.1.8:8000/ ");
    await fireEvent.changeText(view.getByLabelText("配对令牌"), " local-secret-token ");
    await fireEvent.press(view.getByRole("button", {name: "保存并连接"}));

    await waitFor(() => expect(pair).toHaveBeenCalledWith({
      baseUrl: "http://192.168.1.8:8000/",
      token: "local-secret-token",
    }));
    expect(await view.findByText("连接信息已保存")).toBeVisible();
  });
});
