import { api } from "../../api/client";
import { fill, formatAgo, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { ProjectForm } from "../../types/domain";
import { button, glass, grid, iconTile, row, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";
import { projectHead } from "./common-view";

const words = catalog.project.forms;

const percent = (part: number, whole: number): number => (whole ? Math.round((part / whole) * 100) : 0);

function kpis(forms: ProjectForm[]): Node {
  const submissions = forms.reduce((sum, form) => sum + form.submissions7d, 0);
  const views = forms.reduce((sum, form) => sum + form.views7d, 0);
  const kpi = (label: string, value: string, hue: string): Node => ({ tag: "xwui-kpi-card", data: { label, value }, config: { hue } });
  return grid(
    [kpi(words.kpis.submissions, formatNumber(submissions), "lime"), kpi(words.kpis.views, formatNumber(views), "cyan"), kpi(words.kpis.conversion, `${percent(submissions, views)}%`, "violet")],
    210,
    "l",
  );
}

function card(form: ProjectForm, reload: () => Promise<void>): Node {
  const live = form.status === "live";
  const link = `${location.origin}${form.path}`;
  const toggle = async (): Promise<void> => {
    try {
      await api.setFormStatus(form.id, live ? "draft" : "live");
      notify(fill(live ? words.unpublished : words.published, { name: form.name }), live ? "info" : "success");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      notify(fill(words.copied, { name: form.name }), "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  return glass(
    stack(
      [
        row(
          [
            row([iconTile("file-text", form.hue), stack([text("body", form.name, { bold: true }), text("xs", form.path, { mono: true, tone: "tertiary" })], { gap: "xs" })], { gap: "m" }),
            status(live ? "success" : "neutral", words.status[form.status]),
          ],
          { justify: "space-between", wrap: true },
        ),
        row(
          [
            tag(fill(words.fields, { n: form.fields })),
            form.flow
              ? { ...button("ghost", fill(words.starts, { flow: form.flow.name }), { size: "sm", icon: "zap", onClick: () => navigate(paths.flow(form.flow!.id)) }) }
              : tag(words.noFlow, "amber"),
          ],
          { gap: "s", wrap: true },
        ),
        stack(
          [
            row(
              [
                text("disp", formatNumber(form.submissions7d)),
                text("xs", fill(words.conversion, { n: percent(form.submissions7d, form.views7d) }), { tone: "secondary" }),
              ],
              { gap: "m", align: "flex-end" },
            ),
            { tag: "xwui-spark-bars", data: { bars: form.daily.map((value) => ({ value })), label: words.perDay }, config: { height: 48 } },
            text("xs", words.perDay, { tone: "tertiary" }),
          ],
          { gap: "s" },
        ),
        row(
          [
            button(live ? "glass" : "primary", live ? words.unpublish : words.publish, { size: "sm", onClick: () => void toggle() }),
            button("ghost", words.copyLink, { size: "sm", icon: "link", onClick: () => void copy() }),
          ],
          { gap: "s", wrap: true },
        ),
        text("xs", formatAgo(form.updatedAt), { tone: "tertiary" }),
      ],
      { gap: "l" },
    ),
    { pad: "m", glow: live ? "lime" : undefined },
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const { workspace } = context;
  let forms = await api.listForms();

  const cards = (): Node => grid(forms.map((form) => card(form, reload)), 320);
  async function reload(): Promise<void> {
    forms = await api.listForms();
    context.instance<XWUIComposer>("forms-kpis")?.setTree(kpis(forms));
    context.instance<XWUIComposer>("forms-cards")?.setTree(cards());
  }

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }], sample: "data" },
    body: [
      ...projectHead(words.title, words.lead, "forms"),
      { tag: "xwui-composer", key: "forms-kpis", data: { tree: kpis(forms) } },
      { tag: "xwui-composer", key: "forms-cards", data: { tree: cards() } },
    ],
  };
}
