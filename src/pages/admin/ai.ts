import { api } from "../../api/client";
import { fill, formatAgo, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { AiApproval, AiCall, AiPolicy } from "../../types/domain";
import { button, cell, glass, grid, iconTile, row, separator, stack, status, text, type Node } from "../../ui/kit";
import { choice, pageHead, section, settingRow, toggle } from "./console-view";

const words = catalog.console.ai;
const decisionTone = { allowed: "success", redacted: "warning", blocked: "error" } as const;

export async function view(context: ViewContext): Promise<PageResult> {
  const { policy, calls } = await api.getAiGovernance();
  const draft: AiPolicy = { ...policy, models: policy.models.map((model) => ({ ...model })) };
  const modelName = new Map(policy.models.map((model) => [model.id, model.name]));

  const save = async (): Promise<void> => {
    try {
      await api.saveAiPolicy(draft);
      notify(words.saved, "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const rules = section(
    words.models,
    [
      ...draft.models.flatMap((model, index) => [
        ...(index ? [separator()] : []),
        settingRow(model.name, fill(words.provider, { name: model.provider }), toggle(model.enabled, model.name, (on) => (model.enabled = on))),
      ]),
      separator(),
      settingRow(words.redact.title, words.redact.detail, toggle(draft.redactPersonalData, words.redact.title, (on) => (draft.redactPersonalData = on))),
      separator(),
      row([text("body", words.approval, { bold: true }), choice(draft.approval, words.approvals, words.approval, (value) => (draft.approval = value as AiApproval))], { justify: "space-between", wrap: true, gap: "m" }),
      row([button("primary", catalog.console.shared.save, { icon: "check", onClick: () => void save() })]),
    ],
    { pad: "l" },
  );

  const c = words.columns;
  const log: Node = section(words.calls, [
    glass(
      {
        tag: "xwui-table",
        data: {
          columns: [
            { key: "at", title: c.when, render: (_: unknown, call: AiCall) => cell(text("small", formatAgo(call.at), { tone: "secondary" })) },
            { key: "flow", title: c.flow, render: (_: unknown, call: AiCall) => cell(stack([text("small", call.flow, { bold: true }), text("xs", call.step, { tone: "secondary" })], { gap: "xs" })) },
            { key: "model", title: c.model, render: (_: unknown, call: AiCall) => cell(row([iconTile("sparkles", "pink", "sm"), text("small", modelName.get(call.model) ?? call.model)], { gap: "s" })) },
            { key: "tokens", title: c.tokens, align: "end", render: (_: unknown, call: AiCall) => cell(text("small", formatNumber(call.tokens), { mono: true })) },
            {
              key: "decision",
              title: c.decision,
              render: (_: unknown, call: AiCall) => cell(stack([status(decisionTone[call.decision], words.decisions[call.decision]), ...(call.reason ? [text("xs", call.reason, { tone: "tertiary" })] : [])], { gap: "xs" })),
            },
          ],
          data: calls.map((call, index) => ({ ...call, key: `${call.at}-${index}` })),
        },
        config: { bordered: false, ariaLabel: words.calls },
      },
      { pad: "none", scroll: true },
    ),
  ]);

  return {
    bar: adminBar(context.admin!, "admin", words.title),
    body: [...pageHead(words.title, words.lead), grid([rules, log], "half")],
  };
}
