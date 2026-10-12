import { expect, type Page } from "@playwright/test";

/** Open a route and wait until its page has drawn: the app root holds text and no spinner shows. */
export async function open(page: Page, route: string): Promise<void> {
  // A new query makes it a real load (a hash change alone keeps the old page on screen
  // for a moment); the session's data survives it.
  await page.goto(`/?load=${Date.now()}#${route}`);
  await page.waitForFunction(() => (document.querySelector("#app")?.textContent ?? "").trim().length > 40);
  await expect(page.locator("#app xwui-spinner")).toHaveCount(0);
}

/** The text of every notice on screen, newest first. */
export async function notices(page: Page): Promise<string> {
  return (await page.locator(".xwui-toast-message").allInnerTexts()).join(" / ");
}

/** Wait for a notice that matches. */
export async function expectNotice(page: Page, text: RegExp): Promise<void> {
  await expect.poll(() => notices(page)).toMatch(text);
}

export const hash = (page: Page): Promise<string> => page.evaluate(() => window.location.hash);

/** Rows of the first table on the page. */
export const rows = (page: Page) => page.locator("xwui-table tbody tr");

/** Pick an option from the n-th select on the page. */
export async function pick(page: Page, index: number, option: string): Promise<void> {
  await page.locator("xwui-select").nth(index).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Flip an XWUI switch by its name (its checkbox is visually hidden; the label takes the click). */
export async function flip(page: Page, name: string): Promise<void> {
  await page.locator("label").filter({ has: page.getByRole("switch", { name, exact: true }) }).first().click();
}

export const switchState = (page: Page, name: string) => page.getByRole("switch", { name, exact: true }).first();
