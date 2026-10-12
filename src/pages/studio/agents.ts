import { api } from "../../api/client";
import { fill, formatAgo, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Agent, AgentList, AgentStatus } from "../../types/domain";
import { hueOf } from "../../ui/flow";
import { button, glass, grid, iconTile, row, stack, status, tag, text, type Node, type StatusTone } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText, XWUISelect } from "../../xwui";
import { projectHead } from "./common-view";

type AgentsRoute = Extract<Route, { page: "agents" }>;

const words = catalog.project.agents;
const tones: Record<AgentStatus, StatusTone> = { live: "success", paused: "warning", draft: "neutral" };

function kpis(list: AgentList): Node {
  const kpi = (label: string, value: number, hue: string): Node => ({ tag: "xwui-kpi-card", data: { label, value: formatNumber(value) }, config: { hue } });
  return grid(
    [kpi(words.kpis.live, list.counts.live, "violet"), kpi(words.kpis.conversations, list.counts.conversations7d, "cyan"), kpi(words.kpis.handoffs, list.counts.handoffs7d, "pink")],
    "kpiCompact",
    "l",
  );
}

function card(agent: Agent, act: (agent: Agent, next: AgentStatus) => void): Node {
  const stats = [
    agent.conversations7d ? fill(words.conversations, { n: formatNumber(agent.conversations7d) }) : null,
    agent.resolvedRate === null ? words.notMeasured : fill(words.resolved, { n: Math.round(agent.resolvedRate * 100) }),
    agent.lastActiveAt === null ? words.neverActive : fill(words.lastActive, { when: formatAgo(agent.lastActiveAt).toLocaleLowerCase() }),
  ].filter((item): item is string => Boolean(item));
  const primary =
    agent.status === "live"
      ? button("glass", words.pause, { size: "sm", icon: "pause", onClick: () => act(agent, "paused") })
      : button("primary", agent.status === "paused" ? words.resume : words.goLive, { size: "sm", icon: "play", onClick: () => act(agent, "live") });
  return glass(
    stack(
      [
        row(
          [
            row([iconTile("bot", agent.hue), stack([text("body", agent.name, { bold: true }), text("xs", agent.owner.name, { tone: "tertiary" })], { gap: "xs" })], { gap: "m" }),
            status(tones[agent.status], words.status[agent.status]),
          ],
          { justify: "space-between", wrap: true },
        ),
        text("small", agent.description, { tone: "secondary" }),
        row([text("xs", words.model, { caps: true, bold: true, tone: "tertiary" }), tag(agent.model, "violet")], { gap: "s" }),
        stack(
          [
            text("xs", words.tools, { caps: true, bold: true, tone: "tertiary" }),
            agent.tools.length
              ? row(agent.tools.map((tool) => tag(tool.label, hueOf[tool.group], undefined, true)), { gap: "s", wrap: true })
              : text("small", words.noTools, { tone: "tertiary" }),
          ],
          { gap: "s" },
        ),
        text("xs", stats.join(" · "), { tone: "secondary" }),
        row([primary, button("ghost", words.open, { size: "sm", onClick: () => (navigate(paths.studio), notify(fill(words.openSoon, { name: agent.name }), "info")) })], { gap: "s" }),
      ],
      { gap: "l" },
    ),
    { pad: "m", glow: agent.status === "live" ? "violet" : undefined },
  );
}

export async function view(context: ViewContext<AgentsRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  const query = { q: route.q, status: route.status };
  let list = await api.listAgents(query);

  const cards = (): Node =>
    list.agents.length
      ? grid(list.agents.map((agent) => card(agent, act)), "agent")
      : { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
  const redraw = (): void => {
    context.instance<XWUIComposer>("agents-kpis")?.setTree(kpis(list));
    context.instance<XWUIComposer>("agents-cards")?.setTree(cards());
  };
  const reload = async (): Promise<void> => {
    list = await api.listAgents(query);
    redraw();
  };
  async function act(agent: Agent, next: AgentStatus): Promise<void> {
    try {
      await api.setAgentStatus(agent.id, next);
      notify(fill(next === "live" ? words.wentLive : words.paused, { name: agent.name }), next === "live" ? "success" : "info");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  }
  const apply = (patch: Partial<typeof query>): void => {
    Object.assign(query, patch);
    replaceQuery(paths.agents, { q: query.q, status: query.status });
    void reload().catch((error) => notify(errorMessage(error, catalog.errors.load), "danger"));
  };

  const dialogWords = words.dialog;
  const fields: { name?: XWUIInputText; description?: XWUIInputText; dialog?: { open(): void; close(): void } } = {};
  const create = async (): Promise<void> => {
    try {
      const agent = await api.createAgent({ name: fields.name?.getValue() ?? "", description: fields.description?.getValue() ?? "" });
      notify(fill(words.created, { name: agent.name }), "success");
      fields.dialog?.close();
      fields.name?.setValue("");
      fields.description?.setValue("");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }], sample: "data" },
    body: [
      ...projectHead(words.title, words.lead, "agents", [button("primary", words.create, { icon: "plus", onClick: () => setTimeout(() => fields.dialog?.open(), 0) })]),
      { tag: "xwui-composer", key: "agents-kpis", data: { tree: kpis(list) } },
      row(
        [
          {
            tag: "xwui-box",
            config: { width: "100%" },
            slots: {
              children: {
                tag: "xwui-input-text",
                data: { value: query.q, placeholder: words.search },
                config: { type: "search", leadingIcon: "search", ariaLabel: words.search, fullWidth: true, clearable: true },
                ref: (instance) => (instance as XWUIInputText).onChange(debounce((value: string) => apply({ q: value.trim() }), config.searchDebounceMs)),
              },
            },
          },
          {
            tag: "xwui-select",
            data: { value: query.status, placeholder: words.anyStatus, options: [{ value: "", label: words.anyStatus }, ...(["live", "paused", "draft"] as const).map((value) => ({ value, label: words.status[value] }))] },
            config: { ariaLabel: words.statusLabel },
            ref: (instance) => (instance as XWUISelect).onChange((value) => apply({ status: String(value) as AgentStatus | "" })),
          },
        ],
        { gap: "m", wrap: true },
      ),
      { tag: "xwui-composer", key: "agents-cards", data: { tree: cards() } },
      {
        tag: "xwui-dialog",
        data: { title: dialogWords.title },
        config: { size: "medium", closable: true },
        slots: {
          content: stack(
            [
              { tag: "xwui-input-text", data: { label: dialogWords.name, placeholder: dialogWords.namePlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (fields.name = i as XWUIInputText) },
              { tag: "xwui-textarea", data: { label: dialogWords.description, placeholder: dialogWords.descriptionPlaceholder, rows: 3 }, config: { fullWidth: true }, ref: (i) => (fields.description = i as XWUIInputText) },
            ],
            { gap: "l" },
          ),
          footer: row([button("glass", dialogWords.cancel, { onClick: () => fields.dialog?.close() }), button("primary", dialogWords.save, { onClick: () => void create() })], { justify: "flex-end" }),
        },
        ref: (instance) => (fields.dialog = instance as { open(): void; close(): void }),
      },
    ],
  };
}
