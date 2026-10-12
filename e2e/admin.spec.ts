import { expect, test } from "@playwright/test";
import { expectNotice, flip, hash, open, pick, rows, switchState } from "./helpers";

test.describe("admin and system rail", () => {
  test("every rail item opens its own page", async ({ page }) => {
    await open(page, "/admin");
    for (const [label, route] of [
      ["Overview", /#\/admin$/],
      ["Tenants", /admin\/tenants/],
      ["Audit", /admin\/audit/],
      ["Credentials policy", /admin\/credentials/],
      ["Node registry", /admin\/registry/],
      ["Adapters", /admin\/adapters/],
      ["Branding", /admin\/branding/],
      ["Usage", /admin\/usage/],
      ["AI governance", /admin\/ai/],
      ["Quotas", /#\/denied/],
      ["Health", /system\/health/],
      ["Schedules", /system\/schedules/],
      ["Workers", /system\/workers/],
      ["All executions", /system\/executions/],
      ["Config", /system\/config/],
    ] as const) {
      await page.locator("xwui-app-rail").getByRole("link", { name: new RegExp(`^${label}`) }).first().click();
      await expect.poll(() => hash(page)).toMatch(route);
    }
  });
});

test.describe("admin", () => {
  test("tenants: filter, add and resume; your own tenant has no suspend", async ({ page }) => {
    await open(page, "/admin/tenants");
    await page.getByPlaceholder("Search tenants").fill("atlas");
    await expect(rows(page)).toHaveCount(1);
    await page.getByPlaceholder("Search tenants").fill("");
    await expect(rows(page)).toHaveCount(4);
    await page.getByRole("button", { name: "Add tenant" }).click();
    await page.getByRole("dialog").getByRole("textbox", { name: /Name/ }).fill("Blue Harbor");
    await page.getByRole("dialog").getByRole("button", { name: "Create tenant" }).click();
    await expect(rows(page)).toHaveCount(5);
    await page.getByRole("button", { name: "Resume" }).first().click();
    await expectNotice(page, /Acme Auto is active again/);
    await expect(rows(page).filter({ hasText: "Personal workspace" }).getByRole("button")).toHaveCount(0);
  });

  test("credentials policy is saved and kept", async ({ page }) => {
    await open(page, "/admin/credentials");
    await flip(page, "Prefer OAuth");
    await pick(page, 0, "30 days");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectNotice(page, /Credentials policy saved/);
    await page.reload();
    await expect(switchState(page, "Prefer OAuth")).toHaveAttribute("aria-checked", "false");
  });

  test("node registry refuses to disable a type a published flow uses", async ({ page }) => {
    await open(page, "/admin/registry");
    await flip(page, "Webhook in the palette");
    await expectNotice(page, /used by 2 published flows/);
    await expect(switchState(page, "Webhook in the palette")).toHaveAttribute("aria-checked", "true");
    await flip(page, "Field changed in the palette");
    await expect(switchState(page, "Field changed in the palette")).toHaveAttribute("aria-checked", "false");
  });

  test("an adapter's sample lands as a draft flow", async ({ page }) => {
    await open(page, "/admin/adapters");
    await page.getByRole("button", { name: "Import a sample" }).first().click();
    await expectNotice(page, /imported as a draft/);
    await page.getByRole("button", { name: "Open the draft" }).first().click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/flows\/f_/);
  });

  test("usage matches the rail's runs", async ({ page }) => {
    await open(page, "/admin/usage");
    await expect(page.locator("xwui-kpi-card").first()).toContainText("380");
  });

  test("AI policy saves, and keeps at least one model", async ({ page }) => {
    await open(page, "/admin/ai");
    await flip(page, "GPT");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectNotice(page, /AI policy saved/);
    for (const model of ["Claude", "GPT", "Llama, self-hosted"]) if ((await switchState(page, model).getAttribute("aria-checked")) === "true") await flip(page, model);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectNotice(page, /Keep at least one model allowed/);
  });

  test("branding: the colour field is named and Save needs Commercial", async ({ page }) => {
    await open(page, "/admin/branding");
    await expect(page.getByRole("textbox", { name: "Primary color hex" })).toHaveValue(/^#[0-9a-f]{6}$/i);
    await expect(page.getByRole("button", { name: "Save brand kit" })).toBeDisabled();
  });

  test("Quotas: the Builder role can ask for access", async ({ page }) => {
    await open(page, "/denied");
    await page.getByRole("button", { name: "Request access" }).click();
    await expectNotice(page, /Request AR-[0-9A-F]+ sent/);
  });
});

test.describe("system", () => {
  test("health checks again and pauses every schedule", async ({ page }) => {
    await open(page, "/system/health");
    await page.getByRole("button", { name: "Check again" }).click();
    await expectNotice(page, /Checks ran again/);
    await page.getByRole("button", { name: "Pause all schedules" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: /pause/i });
    await dialog.getByRole("button").filter({ hasText: /pause/i }).last().click();
    await expectNotice(page, /schedules paused/);
    await open(page, "/system/schedules");
    for (const name of ["Weekly invoice digest", "Sync customers to the sheet"]) await expect(switchState(page, name)).toHaveAttribute("aria-checked", "false");
  });

  test("schedules: pause one and run one now", async ({ page }) => {
    await open(page, "/system/schedules");
    await flip(page, "Sync customers to the sheet");
    await expectNotice(page, /paused/);
    await page.getByRole("button", { name: "Run now" }).first().click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/runs\/r_/);
  });

  test("workers drain and resume, never the last one", async ({ page }) => {
    await open(page, "/system/workers");
    // Wait on the drawn state, not on a notice: older notices stay on screen for a while.
    const draining = page.locator("xwui-status-glyph").filter({ hasText: "Draining" });
    await page.getByRole("button", { name: "Drain" }).first().click();
    await expect(draining).toHaveCount(1);
    await page.getByRole("button", { name: "Resume" }).first().click();
    await expect(draining).toHaveCount(0);
    for (let count = 1; count <= 3; count += 1) {
      await page.getByRole("button", { name: "Drain" }).first().click();
      await expect(draining).toHaveCount(count);
    }
    await page.getByRole("button", { name: "Drain" }).first().click();
    await expectNotice(page, /last running worker cannot be drained/);
    await expect(draining).toHaveCount(3);
  });

  test("all executions filter by tenant and open your own run", async ({ page }) => {
    await open(page, "/system/executions");
    await pick(page, 0, "Atlas Ops");
    await expect(rows(page)).toHaveCount(2);
    // A fresh load drops the filter (the same address would not reload the page).
    await page.reload();
    await expect(rows(page).filter({ hasText: "Personal workspace" }).first()).toBeVisible();
    await rows(page).filter({ hasText: "Personal workspace" }).first().getByRole("button", { name: "Open", exact: true }).click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/runs\/r_/);
  });

  test("config refuses out-of-range values and saves good ones", async ({ page }) => {
    await open(page, "/system/config");
    const field = page.getByRole("spinbutton", { name: "Concurrent runs per tenant" });
    await field.fill("0");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectNotice(page, /takes a whole number from 1 to 200/);
    await field.fill("40");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectNotice(page, /1 setting saved/);
    await page.reload();
    await expect(page.getByRole("spinbutton", { name: "Concurrent runs per tenant" })).toHaveValue("40");
  });

  test("the audit log records console changes", async ({ page }) => {
    await open(page, "/system/workers");
    await page.getByRole("button", { name: "Drain" }).first().click();
    await expectNotice(page, /is draining/);
    await open(page, "/admin/audit");
    await expect(page.locator("#app")).toContainText("Worker drained");
  });
});
