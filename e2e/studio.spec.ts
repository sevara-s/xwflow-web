import { expect, test } from "@playwright/test";
import { expectNotice, hash, open, pick, rows } from "./helpers";

test.describe("assistant", () => {
  test("drafts a matching flow and saves it as a draft", async ({ page }) => {
    await open(page, "/studio");
    await page.getByRole("textbox").first().fill("Send a weekly digest of invoices");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".xwui-flow-canvas__node").first()).toHaveAttribute("aria-label", /Every Monday/);
    await page.getByRole("button", { name: "Open as a draft" }).click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/flows\/f_/);
  });
});

test.describe("flows", () => {
  test("search, status filter and the query kept in the address", async ({ page }) => {
    await open(page, "/studio/flows");
    await expect(rows(page)).toHaveCount(5);
    await page.getByPlaceholder("Search flows").fill("invoice");
    await expect(rows(page)).toHaveCount(1);
    expect(await hash(page)).toContain("q=invoice");
    await page.getByPlaceholder("Search flows").fill("");
    await expect(rows(page)).toHaveCount(5);
    await pick(page, 0, "Draft");
    await expect(rows(page)).toHaveCount(1);
    await page.reload();
    await expect(rows(page)).toHaveCount(1);
  });

  test("row Actions › Run now starts the run and opens its receipt", async ({ page }) => {
    await open(page, "/studio/flows");
    await page.getByRole("button", { name: "Actions" }).first().click();
    await page.getByRole("menuitem", { name: "Run now" }).click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/runs\/r_/);
  });

  test("Create flow › Blank flow opens a new draft that the list shows", async ({ page }) => {
    await open(page, "/studio/flows");
    await page.getByRole("button", { name: "Create flow" }).click();
    await page.getByRole("menuitem", { name: "Blank flow" }).click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/flows\/f_/);
    await open(page, "/studio/flows");
    await expect(rows(page)).toHaveCount(6);
  });
});

test.describe("editor", () => {
  test("a click selects a step, a drag moves it without selecting", async ({ page }) => {
    await open(page, "/studio/flows/f_order_alert");
    await page.getByRole("button", { name: /^Over 500\?/ }).first().click();
    await expect(page.getByRole("heading", { name: "Over 500?" })).toBeVisible();
    const card = page.getByRole("button", { name: /^Log order/ }).first();
    const before = (await card.boundingBox())!;
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 60, before.y + before.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    const after = (await card.boundingBox())!;
    expect(Math.round(after.x - before.x)).toBe(60);
    await expect(page.getByRole("heading", { name: "Over 500?" })).toBeVisible();
  });

  test("run a test, add a step, pin an output", async ({ page }) => {
    await open(page, "/studio/flows/f_order_alert");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expectNotice(page, /Test run r_[0-9a-f]+ started/);
    const cards = page.locator(".xwui-flow-canvas__node");
    const count = await cards.count();
    await page.getByPlaceholder("Search steps").fill("wait");
    await page.getByRole("button", { name: "Wait", exact: true }).click();
    await expect(cards).toHaveCount(count + 1);
    await page.getByRole("button", { name: /^Look up customer/ }).first().click();
    await page.getByRole("button", { name: "Pin output" }).click();
    await expect(page.getByRole("button", { name: /^Look up customer/ }).first()).toHaveAttribute("aria-label", /Pinned/);
  });
});

test.describe("run receipt", () => {
  test("ledger, payload tabs, retry and show on canvas", async ({ page }) => {
    await open(page, "/studio/runs/r_7f39");
    await rows(page).nth(2).click();
    await expect.poll(() => hash(page)).toContain("attempt=");
    for (const tab of ["Input", "Output", "Error"]) await page.getByRole("tab", { name: tab, exact: true }).click();
    await page.getByRole("button", { name: "Show on canvas" }).click();
    await expect.poll(() => hash(page)).toMatch(/flows\/f_order_alert\?node=/);
    await open(page, "/studio/runs/r_7f39");
    await page.getByRole("button", { name: "Retry from this step" }).click();
    await expect.poll(() => hash(page)).toMatch(/runs\/r_(?!7f39)/);
  });
});

test.describe("runs and connections", () => {
  test("runs filter by search and status", async ({ page }) => {
    await open(page, "/studio/runs");
    const all = await rows(page).count();
    await page.getByLabel("Search runs", { exact: true }).first().fill("order");
    await expect.poll(() => rows(page).count()).toBeLessThan(all);
    await page.getByLabel("Search runs", { exact: true }).first().fill("");
    await pick(page, 0, "Failed");
    await expect.poll(() => hash(page)).toContain("status=failed");
  });

  test("reconnect a broken connection and add a new one", async ({ page }) => {
    await open(page, "/studio/connections");
    const mailbox = page.locator('[role=group][aria-label="Finance mailbox"]');
    await expect(mailbox).toContainText("Broken");
    await mailbox.getByRole("button", { name: "Reconnect" }).click();
    await expectNotice(page, /connected again/);
    const cards = page.locator("[role=group][aria-label]");
    const before = await cards.count();
    await page.getByRole("button", { name: "Add connection" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").first().fill("Billing API");
    await dialog.getByRole("button", { name: "Add connection" }).click();
    await expect(cards).toHaveCount(before + 1);
  });
});

test.describe("templates, settings and versions", () => {
  test("a template becomes a draft flow", async ({ page }) => {
    await open(page, "/studio/templates");
    await page.getByRole("button", { name: "Use template" }).first().click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/flows\/f_/);
  });

  test("settings are saved and kept after a reload", async ({ page }) => {
    await open(page, "/studio/settings");
    await pick(page, 0, "Tashkent");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectNotice(page, /Workspace settings saved/);
    await page.reload();
    await expect(page.locator("xwui-select").first()).toContainText("Tashkent");
  });

  test("a version is restored as a draft", async ({ page }) => {
    await open(page, "/studio/flows/f_order_alert/versions");
    await page.getByRole("button", { name: "Restore as draft" }).first().click();
    await expectNotice(page, /restored as a new draft/);
  });
});
