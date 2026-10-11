import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { AssistantDraft, AssistantHome } from "../../types/domain";
import { canvasData, hueOf } from "../../ui/flow";
import { behind, button, centred, decoration, glass, grid, iconTile, row, stack, tag, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer, XWUIInputText } from "../../xwui";

const words = catalog.studio.assistant;

/** Where each "start directly" tile opens. */
const starterTargets: Record<string, string> = { flow: paths.flows, agent: paths.agents, table: paths.tables, form: paths.forms, mcp: paths.mcp };

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
    { gap: "m" },
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
              gap: "s",
            }),
            { pad: "s" },
          ),
          on: {
            click: () => navigate(starterTargets[starter.id] ?? paths.flows),
          },
        })),
        150,
        "m",
      ),
    ],
    { gap: "m" },
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
                  row(item.groups.map((group) => iconTile(catalog.studio.groupIcons[group], hueOf[group], "sm")), { gap: "xs" }),
                  text("xs", item.toConnect ? `${count}, ${fill(words.toConnect, { n: item.toConnect })}` : count, { tone: "secondary" }),
                ],
                { justify: "space-between" },
              ),
            ],
            { gap: "m" },
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

  /* Attached files give the assistant context; the names travel with the prompt. */
  let files: Array<{ id: string; name: string }> = [];
  const fileChips = (): Node =>
    row(
      files.map((file) => ({
        tag: "xwui-chip",
        data: { label: file.name },
        config: { closable: true, size: "small", ariaLabel: fill(words.removeFile, { name: file.name }) },
        ref: (instance: unknown) =>
          (instance as { onClose(handler: () => void): void }).onClose(() => {
            files = files.filter((item) => item.id !== file.id);
            context.instance<XWUIComposer>("assistant-files")?.setTree(fileChips());
          }),
      })),
      { gap: "s", wrap: true },
    );
  const withFiles = (prompt: string): string => (files.length ? `${prompt} ${fill(words.usingFiles, { names: files.map((file) => file.name).join(", ") })}` : prompt);
  let attachDialog: { open(): void; close(): void } | undefined;

  /* Dictation through the browser's speech recognition, where it exists. */
  type Recognition = { lang: string; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start(): void };
  const speak = (): void => {
    const Speech = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!Speech) {
      notify(words.speakUnsupported, "info");
      return;
    }
    const recognition = new Speech();
    recognition.lang = document.documentElement.lang || "en";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const said = Array.from(event.results, (result) => result[0].transcript).join(" ").trim();
      if (!said) return;
      parts.input?.setValue(said);
      parts.send?.setDisabled(false);
      notify(words.heard, "success");
    };
    recognition.start();
    notify(words.listening, "info");
  };

  const propose = async (prompt: string): Promise<void> => {
    const panel = context.instance<XWUIComposer>("assistant-preview");
    panel?.setTree({ tag: "xwui-spinner", data: { label: words.drafting } });
    parts.send?.setLoading(true);
    try {
      draft = await api.draftFlow(withFiles(prompt));
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
          decoration("assistant.ring"),
          decoration("assistant.ring2"),
          decoration("assistant.orb"),
        ],
        { gap: "none" },
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
        { tag: "xwui-composer", key: "assistant-files", data: { tree: fileChips() } },
        row(
          [
            row(
              [
                button("ghost", "", { icon: "paperclip", size: "sm", label: words.attach, onClick: () => setTimeout(() => attachDialog?.open(), 0) }),
                button("ghost", "", { icon: "mic", size: "sm", label: words.speak, onClick: speak }),
                tag(workspace.project.name, "violet"),
              ],
              { gap: "s" },
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
              { gap: "m" },
            ),
          ],
          { justify: "space-between", wrap: true },
        ),
      ],
      { gap: "m" },
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
      button("ghost", words.seeAll, { size: "sm", onClick: () => navigate(paths.templates) }),
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
            context.instance<XWUIComposer>("assistant-recommended")?.setTree(shown ? recommended(home, ask) : stack([], { gap: "none" }));
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
          children: behind(
            [decoration("assistant.halo"), decoration("assistant.halo2")],
            stack(
              [
                centred(core),
                centred(
                  row([text("h2", words.titleBefore), { ...text("h2", words.titleHighlight, { tone: "gradient" }) }, text("h2", words.titleAfter)], { gap: "m", wrap: true, justify: "center" }),
                ),
                centred(text("body", words.lead, { tone: "secondary", align: "center" })),
                { tag: "xwui-container", config: { maxWidth: 860, center: true, width: "100%" }, slots: { children: stack([prompt, pills], { gap: "l" }) } },
                glass({ tag: "xwui-composer", key: "assistant-preview", data: { tree: preview(draft, false) } }, { pad: "m" }),
                starters(home),
                stack([recommendedHead, { tag: "xwui-composer", key: "assistant-recommended", data: { tree: recommended(home, ask) } }], { gap: "m" }),
              ],
              { gap: "xl", align: "stretch" },
            ),
          ),
        },
      },
      {
        tag: "xwui-dialog",
        data: { title: words.attachTitle },
        config: { size: "medium", closable: true },
        slots: {
          content: {
            tag: "xwui-input-upload",
            data: { label: words.attachPrompt },
            config: { multiple: true, dragDrop: true, maxSize: 10 * 1024 * 1024 },
            ref: (instance) =>
              (instance as { onUpload(handler: (picked: File[]) => void): void }).onUpload((picked) => {
                files = [...files, ...picked.map((file, index) => ({ id: `${Date.now()}-${index}-${file.name}`, name: file.name }))];
                context.instance<XWUIComposer>("assistant-files")?.setTree(fileChips());
                notify(fill(words.attached, { n: files.length }), "success");
              }),
          },
          footer: row([button("primary", words.attachDone, { onClick: () => attachDialog?.close() })], { justify: "flex-end" }),
        },
        ref: (instance) => (attachDialog = instance as { open(): void; close(): void }),
      },
    ],
  };
}
