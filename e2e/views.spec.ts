import { expect, test } from "@playwright/test";
import { expectNotice, hash, open } from "./helpers";

const flow = "/studio/flows/f_order_alert";

test.describe("notation views", () => {
  for (const view of ["flowchart", "swimlane", "bpmn", "sequence", "sim"]) {
    test(`${view} draws the flow`, async ({ page }) => {
      await open(page, `${flow}/${view}`);
      await expect(page.locator(".xwflow-notation-diagram svg").first()).toBeVisible();
    });
  }

  test("3D draws the scene", async ({ page }) => {
    await open(page, `${flow}/3d`);
    await expect(page.locator("xwui-flow-scene")).toBeVisible();
  });

  test("the flowchart has Start, End and the retry loop", async ({ page }) => {
    await open(page, `${flow}/flowchart`);
    const drawing = page.locator(".xwflow-notation-diagram svg").first();
    for (const word of ["Start", "End", "retry"]) await expect(drawing).toContainText(word);
  });

  test("tabs move between notations and back to the editor", async ({ page }) => {
    await open(page, `${flow}/flowchart`);
    await page.getByRole("tab", { name: "Sequence" }).click();
    await expect.poll(() => hash(page)).toMatch(/\/sequence$/);
    await page.getByRole("tab", { name: "Node graph" }).click();
    await expect.poll(() => hash(page)).toMatch(/f_order_alert$/);
  });

  test("a sequence row opens that attempt's receipt", async ({ page }) => {
    await open(page, `${flow}/sequence`);
    await page.locator(".xwflow-notation-diagram [role=button]").nth(1).click();
    await expect.poll(() => hash(page)).toMatch(/runs\/r_7f39\?attempt=/);
  });

  test("the simulation pauses, steps and restarts", async ({ page }) => {
    await open(page, `${flow}/sim`);
    const clock = () => page.evaluate(() => document.body.innerText.match(/\d\d:\d\d:00/)?.[0] ?? "");
    const first = await clock();
    await expect.poll(clock).not.toBe(first);
    await page.getByRole("button", { name: "Pause" }).click();
    const paused = await clock();
    await page.waitForTimeout(1200);
    expect(await clock()).toBe(paused);
    await page.getByRole("button", { name: "Step one event" }).click();
    await expect.poll(clock).not.toBe(paused);
  });

  test("exports download BPMN XML and the drawing", async ({ page }) => {
    await open(page, `${flow}/bpmn`);
    const [xml] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export BPMN XML" }).click()]);
    expect(xml.suggestedFilename()).toBe("order-alert.bpmn");
    const [svg] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Export$/ }).click()]);
    expect(svg.suggestedFilename()).toBe("order-alert-bpmn.svg");
    await expectNotice(page, /exported|saved|order-alert/i);
  });
});
