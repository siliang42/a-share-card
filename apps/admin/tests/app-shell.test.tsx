import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

vi.mock("next/navigation", () => ({usePathname: () => "/stocks"}));

import {AppShell} from "@/components/AppShell";


describe("AppShell", () => {
  it("keeps stock maintenance identifiable in the compact navigation", () => {
    render(<AppShell><p>页面内容</p></AppShell>);

    expect(screen.getByRole("link", {name: "股票维护"})).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("本地数据服务")).toBeVisible();
    expect(screen.getByText("页面内容")).toBeVisible();
  });
});
