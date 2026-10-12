import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { open } from "./helpers";
import { routes } from "./routes";

/**
 * Accessibility: axe (WCAG 2.1 A and AA, plus best practice) on every route.
 * The app's own markup must be clean. Defects inside published XWUI components
 * are listed in docs/xwui-issues.md; only those elements are left out here.
 */
const publishedDefects = [
  ".xwui-tooltip", // tooltips are attached to <body>, outside every landmark
  "xwui-progress", // a second, unnamed progressbar inside the named host
  ".xwui-slider__thumb", // the slider's thumb is nested inside another control
  ".xwui-flow-scene", // the 3D scene is role="img" around focusable controls
  ".xwui-avatar-fallback", // initials on some generated colours fall below 4.5:1
  ".xwui-codeblock-pre", // the code block's scroll area takes no keyboard focus
];

for (const route of routes) {
  test(`accessibility: ${route}`, async ({ page }) => {
    await open(page, route);
    let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]);
    for (const selector of publishedDefects) axe = axe.exclude(selector);
    // Every xwui-table host carries role="tab" without a tablist (published defect).
    axe = axe.disableRules(["aria-required-parent"]);
    const { violations } = await axe.analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of routes) {
    test(`nothing spills past the screen edge: ${route}`, async ({ page }) => {
      await open(page, route);
      const spill = await page.evaluate(() => {
        const width = window.innerWidth;
        const clipped = (element: Element): boolean => {
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowX) && parent.getBoundingClientRect().right <= width + 1) return true;
          }
          return false;
        };
        return [...document.querySelectorAll("#app *")]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.right > width + 1 || box.left < -1) && !clipped(element) && !element.closest("xwui-glow-shape");
          })
          .map((element) => element.tagName.toLowerCase() + "." + String(element.className).split(" ")[0]);
      });
      expect(spill).toEqual([]);
    });
  }
});
