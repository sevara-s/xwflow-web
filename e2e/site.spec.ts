import { expect, test } from "@playwright/test";
import { expectNotice, hash, open } from "./helpers";

const header = (page: import("@playwright/test").Page) => page.locator("xwui-bar-site-header");

test.describe("website", () => {
  test("the landing page tells what xwflow is", async ({ page }) => {
    await open(page, "/");
    await expect(page.locator("h1").first()).toContainText("Own the workflow");
  });

  test("every header link opens its page, and the header keeps one set of actions", async ({ page }) => {
    await open(page, "/");
    for (const [label, route] of [
      ["Notations", /#\/notations/],
      ["Integrations", /#\/integrations/],
      ["Pricing", /#\/pricing/],
      ["Self-host", /#\/self-host$/],
      ["Docs", /#\/self-host\?section=steps/],
      ["Migrate", /section=migrate/],
      ["Product", /section=how/],
    ] as const) {
      await header(page).getByRole("link", { name: label, exact: true }).first().click();
      await expect.poll(() => hash(page)).toMatch(route);
    }
    // The published header used to add a copy of its actions on every page change.
    await expect(header(page).locator(".xwui-bar-site-header__actions").getByRole("link", { name: "Sign in" })).toHaveCount(1);
  });

  test("العربية explains it comes next and keeps the page", async ({ page }) => {
    await open(page, "/pricing");
    await header(page).getByRole("link", { name: "العربية" }).first().click();
    await expectNotice(page, /Arabic interface is part of the next release/);
    expect(await hash(page)).toBe("#/pricing");
  });

  test("Start building opens the studio", async ({ page }) => {
    await open(page, "/");
    await header(page).getByRole("link", { name: "Start building" }).first().click();
    await expect.poll(() => hash(page)).toMatch(/#\/studio\/flows/);
  });

  test("pricing takes a quote request and refuses an empty one", async ({ page }) => {
    await open(page, "/pricing");
    await page.getByRole("button", { name: "Request a quote" }).click();
    await expectNotice(page, /Enter a work email address/);
    await page.getByRole("textbox", { name: /Work email/ }).fill("ops@example.com");
    await page.getByRole("textbox", { name: /What do you want to run/ }).fill("White-label for 40 tenants");
    await page.getByRole("button", { name: "Request a quote" }).click();
    await expectNotice(page, /Your request Q-[0-9A-F]+ is in/);
  });

  test("integrations narrow as you search", async ({ page }) => {
    await open(page, "/integrations");
    const tiles = page.locator("[role=button][aria-label]");
    const before = await tiles.count();
    await page.getByPlaceholder(/Search by name/).fill("http");
    await expect.poll(() => tiles.count()).toBeLessThan(before);
  });

  test("notation modes open their live view or explain themselves", async ({ page }) => {
    await open(page, "/notations");
    await expect(page.locator(".xwflow-layer-stack")).toBeVisible();
    await page.getByRole("radio", { name: "2D canvas", exact: true }).click();
    await expect.poll(() => hash(page)).toMatch(/flows\/f_order_alert$/);
    await open(page, "/notations");
    await page.getByRole("radio", { name: "List", exact: true }).click();
    await expectNotice(page, /List is a concept/);
  });
});
