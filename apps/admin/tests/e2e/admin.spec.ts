import {mkdirSync} from "node:fs";
import path from "node:path";

import {expect, test} from "@playwright/test";

const screenshotDir = path.resolve(
  process.cwd(),
  process.env.GUSHI_PLAYWRIGHT_OUTPUT_DIR ?? "../../output/playwright",
);

test.beforeAll(() => {
  mkdirSync(screenshotDir, {recursive: true});
});

test("desktop maintenance flow renders seeded local data", async ({page}) => {
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const iconHref = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(iconHref).toBeTruthy();
  const iconResponse = await page.request.get(iconHref!);
  expect(iconResponse.status()).toBe(200);
  await expect(page.getByRole("heading", {name: "数据总览"})).toBeVisible();
  await expect(page.getByText(/数据版本 [0-9a-f]{16}/)).toBeVisible();
  await expect(page.getByText("股票总数").locator("..").getByText("5")).toBeVisible();
  await page.screenshot({path: path.join(screenshotDir, "admin-dashboard-desktop.png"), fullPage: true});

  await page.getByRole("link", {name: "股票维护"}).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", {name: "贵州茅台 600519"})).toBeVisible();
  const maotaiRow = page.getByRole("row").filter({has: page.getByRole("button", {name: "贵州茅台 600519"})});
  await expect(maotaiRow.getByLabel(/下跌 \d+\.\d+%/)).toBeVisible();
  await expect(maotaiRow.getByRole("cell").nth(2)).toHaveText("1428.50");

  await page.screenshot({path: path.join(screenshotDir, "admin-stocks-desktop.png"), fullPage: true});
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("manual summary remains effective after publication and reload", async ({page}) => {
  const manualSummary = "电网自动化与特高压设备";

  await page.goto("/stocks");
  await page.getByLabel("搜索股票").fill("000400");
  await expect(page.getByRole("button", {name: "许继电气 000400"})).toBeVisible();
  await page.getByRole("button", {name: "编辑 许继电气"}).click();
  await page.getByLabel("人工主营摘要").fill(manualSummary);
  await page.getByRole("button", {name: "保存修改"}).click();
  await expect(page.getByRole("status")).toHaveText("已保存");

  await page.getByRole("button", {name: "关闭编辑器"}).click();
  await page.getByRole("link", {name: "数据总览"}).click();
  await page.getByRole("button", {name: "发布手机数据集"}).click();
  await expect(page.getByRole("status")).toHaveText("手机数据集发布完成");

  await page.getByRole("link", {name: "股票维护"}).click();
  await page.getByLabel("搜索股票").fill("000400");
  const stockRow = page.getByRole("row").filter({has: page.getByRole("button", {name: "许继电气 000400"})});
  await expect(stockRow.getByText(manualSummary)).toBeVisible();
  await expect(stockRow.getByText("人工生效")).toBeVisible();
});

test("mobile navigation and content stay inside the viewport", async ({browser}) => {
  const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 1});
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/sectors");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", {name: "板块目录"})).toBeVisible();
  await expect(page.getByRole("navigation", {name: "后台主导航"})).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(Math.max(dimensions.bodyWidth, dimensions.documentWidth)).toBeLessThanOrEqual(dimensions.viewportWidth);
  await page.screenshot({path: path.join(screenshotDir, "admin-sectors-mobile.png"), fullPage: true});

  expect(pageErrors).toEqual([]);
  await page.close();
});
