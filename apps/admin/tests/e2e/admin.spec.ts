import {expect, test} from "@playwright/test";

test("desktop maintenance flow renders live local data", async ({page}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", {name: "数据总览"})).toBeVisible();
  await expect(page.getByText("20260827-demo")).toBeVisible();
  await expect(page.getByText("股票总数").locator("..").getByText("5")).toBeVisible();
  await page.screenshot({path: "/tmp/gushi-dashboard-desktop.png", fullPage: true});

  await page.getByRole("link", {name: "股票维护"}).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", {name: "贵州茅台 600519"})).toBeVisible();
  const maotaiRow = page.getByRole("row").filter({has: page.getByRole("button", {name: "贵州茅台 600519"})});
  await expect(maotaiRow.getByLabel(/下跌 \d+\.\d+%/)).toBeVisible();
  await expect(maotaiRow.getByRole("cell").nth(2)).not.toHaveText("--");
  await page.getByRole("button", {name: "贵州茅台 600519"}).click();
  await expect(page.getByRole("complementary", {name: "编辑 贵州茅台"})).toBeVisible();
  await expect(page.getByText("当前生效主营")).toBeVisible();

  await page.screenshot({path: "/tmp/gushi-admin-desktop.png", fullPage: true});
  expect(pageErrors).toEqual([]);
});

test("mobile navigation and content stay inside the viewport", async ({browser}) => {
  const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 1});
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/sectors");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", {name: "板块目录"})).toBeVisible();
  await expect(page.getByRole("navigation", {name: "后台主导航"})).toBeVisible();
  const dimensions = await page.evaluate(() => ({width: window.innerWidth, scrollWidth: document.body.scrollWidth}));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await page.screenshot({path: "/tmp/gushi-admin-mobile.png", fullPage: true});

  expect(pageErrors).toEqual([]);
  await page.close();
});
