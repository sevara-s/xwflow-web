import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, paths } from "../../app/router";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import { button, centred, glass, grid, measure, row, shape, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIButton } from "../../xwui";

const words = catalog.admin.denied;
const stepHues: Hue[] = ["lime", "cyan"];

export async function view(context: ViewContext): Promise<PageResult> {
  const denial = await api.getAccessDenial();

  const request = async (): Promise<void> => {
    const requestButton = context.instance<XWUIButton>("denied-request");
    requestButton?.setLoading(true);
    try {
      const result = await api.requestAccess(denial.missingRole);
      notify(fill(words.requested, { reference: result.reference, who: denial.grantedBy.toLocaleLowerCase() }), "success");
      requestButton?.setDisabled(true);
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      requestButton?.setLoading(false);
    }
  };

  const lock: Node = {
    tag: "xwui-box",
    config: { position: "relative", width: 180, height: 180 },
    slots: { children: stack([shape("ring", "pink", 180, { left: "0", top: "0" }, 5), shape("orb", "pink", 110, { left: "35px", top: "35px" })], { gap: "none" }) },
  };

  const panel = glass(
    stack(
      [
        centred(row([text("h2", words.titleBefore), text("h2", denial.page, { tone: "gradient" })], { gap: "m", wrap: true, justify: "center" })),
        text("body", words.lead, { tone: "secondary", align: "center" }),
        grid(
          (
            [
              [words.missing, denial.missingRole],
              [words.yours, denial.yourRole],
              [words.grants, denial.grantedBy],
            ] as const
          ).map(([label, value]) => glass(stack([text("xs", label, { caps: true, bold: true, tone: "tertiary" }), text("body", value, { bold: true })], { gap: "xs" }), { pad: "s" })),
          160,
          "m",
        ),
        stack(
          words.steps.map((step, index) => row([tag(String(index + 1), stepHues[index % stepHues.length]), text("small", fill(step, { role: denial.missingRole }))], { gap: "m" })),
          { gap: "m" },
        ),
        row(
          [{ ...button("primary", words.request, { size: "lg", onClick: () => void request() }), key: "denied-request" }, button("glass", words.back, { size: "lg", href: href(paths.admin) })],
          { gap: "m", wrap: true },
        ),
      ],
      { gap: "xl" },
    ),
    { pad: "l", gradientBorder: true },
  );

  return {
    bar: adminBar(context.admin!, "admin", denial.page, { sample: false }),
    body: [
      {
        tag: "xwui-box",
        // The halos may spill past the page edge; clip them rather than scroll sideways.
        config: { position: "relative", overflow: "clip" },
        slots: {
          children: stack(
            [shape("halo", "violet", 420, { left: "10%", top: "-40px" }), shape("halo", "pink", 360, { right: "8%", top: "120px" }), centred(lock), measure(panel, 760)],
            { gap: "xxl" },
          ),
        },
      },
    ],
  };
}
