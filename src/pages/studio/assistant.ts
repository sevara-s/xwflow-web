import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { AssistantDraft, AssistantHome } from "../../types/domain";
import { canvasData, hueOf } from "../../ui/flow";
import { button, centred, glass, grid, iconTile, row, shape, stack, tag, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer, XWUIInputText } from "../../xwui";

const words = catalog.studio.assistant;

function preview(draft: AssistantDraft, saveable: boolean): Node {
  return stack(
    [
      row(
        [
          row([text("body", words.preview, { bold: true }), tag(words.flowTag, "lime"), text("small", draft.title, { tone: "secondary" })], { wrap: true }),
          row([
            tag(words.readOnly, "plan"),
            ...(saveable
              ? [
                  button("primary", words.saveDraft, {
                    size: "sm",
                    onClick: async () => {
                      try {
                        const flow = await api.saveDraft(draft);
                        notify(fill(words.saved, { name: flow.name }), "success");
                        navigate(paths.flow(flow.id));
                      } catch (error) {
                        notify(errorMessage(error), "danger");
                      }
                    },
                  }),
                ]
              : []),
          ]),
        ],
        { justify: "space-between", wrap: true },
      ),
      { tag: "xwui-flow-canvas", data: canvasData(draft.graph, { frames: false }), config: { readOnly: true, height: 150, maxFitScale: 1 } },
    ],
    { gap: 12 },
  );
}

function starters(home: AssistantHome): Node {
  return stack(
    [
      text("h3", words.startDirectly),
      grid(
        home.starters.map((starter) => ({
          ...glass(
            stack([iconTile(catalog.studio.groupIcons[starter.group], hueOf[starter.group], "sm"), text("small", starter.label, { bold: true }), text("xs", starter.hint, { tone: "secondary" })], {
              gap: 8,
            }),
            { pad: "s" },
          ),
          on: {
            click: () => (starter.route === "flows" ? navigate(paths.flows) : notify(fill(words.notInPreview, { name: starter.label }), "info")),
          },
        })),
        150,
        12,
      ),
    ],
    { gap: 12 },
  );
}

function recommended(home: AssistantHome, pick: (title: string) => void): Node {
  return grid(
    home.recommended.map((item) => {
      const count = fill(words.steps, { n: item.groups.length });
      return {
        ...glass(
          stack(
            [
              ...(item.top ? [row([tag(words.topPick, "violet")])] : []),
              text("body", item.title, { bold: true }),
              ...(item.summary ? [text("small", item.summary, { tone: "secondary" })] : []),
              row(
                [
                  row(item.groups.map((group) => iconTile(catalog.studio.groupIcons[group], hueOf[group], "sm")), { gap: 4 }),
                  text("xs", item.toConnect ? `${count}, ${fill(words.toConnect, { n: item.toConnect })}` : count, { tone: "secondary" }),
                ],
                { justify: "space-between" },
              ),
            ],
            { gap: 10 },
          ),
          { pad: "m", glow: item.top ? "violet" : undefined },
        ),
        on: { click: () => pick(item.title) },
      };
    }),
    300,
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const { workspace } = context;
  const home = await api.getAssistantHome();
  let draft: AssistantDraft = { prompt: "", title: home.preview.title, graph: home.preview.graph };
  const parts: { input?: XWUIInputText; send?: XWUIButton; pills: Map<string, XWUIButton> } = { pills: new Map() };

  const propose = async (prompt: string): Promise<void> => {
    const panel = context.instance<XWUIComposer>("assistant-preview");
    panel?.setTree({ tag: "xwui-spinner", data: { label: words.drafting } });
    parts.send?.setLoading(true);
    try {
      draft = await api.draftFlow(prompt);
      panel?.setTree(preview(draft, true));
    } catch (error) {
      notify(errorMessage(error), "danger");
      panel?.setTree(preview(draft, false));
    } finally {
      parts.send?.setLoading(false);
    }
  };
  const ask = (prompt: string): void => {
    parts.input?.setValue(prompt);
    parts.send?.setDisabled(false);
    void propose(prompt);
  };

  const onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      parts.input?.focus();
    }
  };
  document.addEventListener("keydown", onKey);
  context.onLeave(() => document.removeEventListener("keydown", onKey));

  const core: Node = {
    tag: "xwui-box",
    config: { position: "relative", width: 200, height: 200 },
    slots: {
      children: stack(
        [
          shape("ring", "violet", 200, { left: "0", top: "0" }, 4),
          shape("ring", "violet", 170, { left: "15px", top: "15px" }, 3),
          shape("orb", "violet", 120, { left: "40px", top: "40px" }),
        ],
        { gap: 0 },
      ),
    },
  };

  const prompt = glass(
    stack(
      [
        text("small", words.promptLabel, { bold: true }),
        {
          tag: "xwui-textarea",
          data: { placeholder: words.promptPlaceholder, rows: 3 },
          config: { fullWidth: true, autoResize: true, resize: "none", ariaLabel: words.promptLabel },
          ref: (instance) => {
            parts.input = instance as XWUIInputText;
            parts.input.onChange((value: string) => parts.send?.setDisabled(!value.trim()));
          },
        },
        row(
          [
            row(
              [
                button("ghost", "", { icon: "paperclip", size: "sm", label: words.attach, onClick: () => notify(fill(words.notInPreview, { name: words.attach }), "info") }),
                button("ghost", "", { icon: "mic", size: "sm", label: words.speak, onClick: () => notify(fill(words.notInPreview, { name: words.speak }), "info") }),
                tag(workspace.project.name, "violet"),
              ],
              { gap: 8 },
            ),
            row(
              [
                text("xs", words.focusHint, { tone: "tertiary" }),
                {
                  ...button("primary", words.send, {
                    icon: "send",
                    iconAfter: true,
                    disabled: true,
                    onClick: () => {
                      const value = parts.input?.getValue().trim();
                      if (value) void propose(value);
                    },
                  }),
                  ref: (instance) => (parts.send = instance as XWUIButton),
                },
              ],
              { gap: 12 },
            ),
          ],
          { justify: "space-between", wrap: true },
        ),
      ],
      { gap: 12 },
    ),
    { pad: "m", gradientBorder: true },
  );

  const pills = row(
    [
      ...home.suggestions.map((suggestion) => {
        const pill = button("glass", suggestion.label, {
          onClick: () => {
            for (const [id, item] of parts.pills) item.setPressed(id === suggestion.id);
            ask(suggestion.label);
          },
        });
        pill.config = { ...pill.config, toggleable: true, pressed: suggestion.id === home.activeSuggestion };
        return { ...pill, ref: (instance: unknown) => parts.pills.set(suggestion.id, instance as XWUIButton) };
      }),
      button("ghost", words.seeAll, { size: "sm", onClick: () => notify(fill(words.notInPreview, { name: words.seeAll }), "info") }),
    ],
    { wrap: true, justify: "center" },
  );

  let shown = true;
  const recommendedHead = row(
    [
      text("h3", words.recommended),
      {
        ...button("ghost", words.hide, {
          size: "sm",
          onClick: () => {
            shown = !shown;
            context.instance<XWUIComposer>("assistant-recommended")?.setTree(shown ? recommended(home, ask) : stack([], { gap: 0 }));
            context.instance<XWUIButton>("assistant-toggle")?.setText(shown ? words.hide : words.show);
          },
        }),
        key: "assistant-toggle",
      },
    ],
    { justify: "space-between" },
  );

  return {
    bar: {
      crumbs: [{ label: words.crumb }],
      sample: null,
      actions: [button("ghost", catalog.studio.topbar.help, { size: "sm", icon: "help-circle", onClick: () => notify(words.lead, "info") })],
    },
    body: [
      {
        tag: "xwui-box",
        config: { position: "relative" },
        slots: {
          children: stack(
            [
              shape("halo", "violet", 460, { left: "30%", top: "60px" }),
              shape("halo", "cyan", 300, { right: "6%", top: "-40px" }),
              centred(core),
              centred(
                row([text("h2", words.titleBefore), { ...text("h2", words.titleHighlight, { tone: "gradient" }) }, text("h2", words.titleAfter)], { gap: 10, wrap: true, justify: "center" }),
              ),
              centred(text("body", words.lead, { tone: "secondary", align: "center" })),
              { tag: "xwui-container", config: { maxWidth: 860, center: true, width: "100%" }, slots: { children: stack([prompt, pills], { gap: 16 }) } },
              glass({ tag: "xwui-composer", key: "assistant-preview", data: { tree: preview(draft, false) } }, { pad: "m" }),
              starters(home),
              stack([recommendedHead, { tag: "xwui-composer", key: "assistant-recommended", data: { tree: recommended(home, ask) } }], { gap: 12 }),
            ],
            { gap: 24, align: "stretch" },
          ),
        },
      },
    ],
  };
}
