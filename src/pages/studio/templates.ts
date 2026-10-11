import { api } from "../../api/client";
import { fill, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths, replaceQuery, type Route } from "../../app/router";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { FlowTemplate, TemplateList } from "../../types/domain";
import { hueOf } from "../../ui/flow";
import { behind, button, glass, grid, iconTile, row, shape, stack, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText } from "../../xwui";

type TemplatesRoute = Extract<Route, { page: "templates" }>;

const words = catalog.workspace.templates;

function card(
  template: FlowTemplate,
  use: (template: FlowTemplate) => void,
): Node {
  const first = template.steps[0];
  const type =
    catalog.studio.stepTypes[
      first.type as keyof typeof catalog.studio.stepTypes
    ];
  return glass(
    stack(
      [
        row(
          [
            iconTile(
              type?.icon ?? catalog.studio.groupIcons[first.group],
              template.hue,
            ),
            row(
              [
                tag(template.category),
                ...(template.popular
                  ? [tag(words.popular, "lime", undefined, true)]
                  : []),
              ],
              { gap: "s" },
            ),
          ],
          { justify: "space-between" },
        ),
        stack(
          [
            text("body", template.name, { bold: true }),
            text("small", template.summary, { tone: "secondary" }),
          ],
          { gap: "s" },
        ),
        stack(
          [
            {
              tag: "xwui-step-chain",
              data: {
                steps: template.steps.map((step) => hueOf[step.group]),
                label: fill(words.steps, { n: template.steps.length }),
              },
            },
            text("xs", template.steps.map((step) => step.name).join(" → "), {
              tone: "tertiary",
            }),
          ],
          { gap: "s" },
        ),
        row(
          [
            stack(
              [
                text(
                  "xs",
                  fill(words.uses, { n: formatNumber(template.uses) }),
                  { tone: "secondary" },
                ),
                text("xs", fill(words.saves, { n: template.minutesSaved }), {
                  tone: "lime",
                }),
              ],
              { gap: "xs" },
            ),
            button("primary", words.use, {
              size: "sm",
              onClick: () => use(template),
            }),
          ],
          { justify: "space-between", wrap: true },
        ),
      ],
      { gap: "l" },
    ),
    { pad: "m", glow: template.popular ? "lime" : undefined },
  );
}

export async function view(
  context: ViewContext<TemplatesRoute>,
): Promise<PageResult> {
  const { route } = context;
  const query = { q: route.q, category: route.category };
  let list = await api.listTemplates(query);

  const use = async (template: FlowTemplate): Promise<void> => {
    try {
      const flow = await api.useTemplate(template.id);
      notify(fill(words.created, { name: flow.name }), "success");
      navigate(paths.flow(flow.id));
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  const cards = (current: TemplateList): Node =>
    current.templates.length
      ? grid(
          current.templates.map((template) =>
            card(template, (item) => void use(item)),
          ),
          320,
        )
      : {
          tag: "xwui-empty",
          data: {
            icon: "search",
            title: words.empty.title,
            description: words.empty.description,
            action: {
              label: words.askAssistant,
              onClick: () => navigate(paths.studio),
            },
          },
        };
  const apply = (patch: Partial<typeof query>): void => {
    Object.assign(query, patch);
    replaceQuery(paths.templates, { q: query.q, category: query.category });
    void api
      .listTemplates(query)
      .then((next) => {
        list = next;
        context.instance<XWUIComposer>("templates-cards")?.setTree(cards(list));
      })
      .catch((error) =>
        notify(errorMessage(error, catalog.errors.load), "danger"),
      );
  };

  return {
    bar: { crumbs: [{ label: words.title }], sample: null },
    body: [
      {
        tag: "xwui-box",
        config: { position: "relative" },
        slots: {
          children: behind(
            [shape("ring", "violet", 160, { right: "2%", top: "-70px" }, 3), shape("cube", "lime", 64, { right: "14%", top: "-24px" })],
            stack([text("h2", words.title), text("lead", words.lead)], { gap: "m" }),
          ),
        },
      },
      stack(
        [
          // The categories scroll sideways on a phone rather than widening the page.
          {
            tag: "xwui-box",
            config: { overflow: "auto", width: "100%" },
            slots: {
              children: {
                tag: "xwui-segmented-control",
                data: { value: query.category },
                config: {
                  options: [
                    { value: "", label: words.allCategories },
                    ...list.categories.map((category) => ({
                      value: category,
                      label: category,
                    })),
                  ],
                  ariaLabel: words.categoryLabel,
                },
                ref: (instance) =>
                  (
                    instance as {
                      onChange?(handler: (value: string) => void): void;
                    }
                  ).onChange?.((value) => apply({ category: value })),
              },
            },
          },
          {
            tag: "xwui-box",
            config: { width: "100%" },
            slots: {
              children: {
                tag: "xwui-input-text",
                data: { value: query.q, placeholder: words.search },
                config: {
                  type: "search",
                  leadingIcon: "search",
                  ariaLabel: words.search,
                  fullWidth: true,
                  clearable: true,
                },
                ref: (instance) =>
                  (instance as XWUIInputText).onChange(
                    debounce(
                      (value: string) => apply({ q: value.trim() }),
                      config.searchDebounceMs,
                    ),
                  ),
              },
            },
          },
        ],
        { gap: "m" },
      ),
      {
        tag: "xwui-composer",
        key: "templates-cards",
        data: { tree: cards(list) },
      },
    ],
  };
}
