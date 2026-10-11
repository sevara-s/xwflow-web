import { api } from "../../api/client";
import { fill, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Tenant, TenantPlan, TenantQuery, TenantStatus } from "../../types/domain";
import { button, cell, glass, row, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText, XWUISelect } from "../../xwui";
import { choice, pageHead } from "./console-view";

const words = catalog.console.tenants;

function regionLabel(region: string): string {
  return words.regions[region as keyof typeof words.regions] ?? region;
}

export async function view(context: ViewContext): Promise<PageResult> {
  const query: TenantQuery = {};
  let list = await api.listTenants(query);
  const own = context.admin!.tenant.id;

  const setStatus = async (tenant: Tenant, next: TenantStatus): Promise<void> => {
    try {
      await api.setTenantStatus(tenant.id, next);
      notify(fill(next === "suspended" ? words.suspended : words.resumed, { name: tenant.name }), next === "suspended" ? "warning" : "success");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const table = (): Node => {
    if (!list.tenants.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
    const c = words.columns;
    return stack(
      [
        glass(
          {
            tag: "xwui-table",
            data: {
              columns: [
                { key: "name", title: c.name, render: (_: unknown, t: Tenant) => cell(stack([text("small", t.name, { bold: true }), ...(t.id === own ? [text("xs", words.you, { tone: "secondary" })] : [])], { gap: "xs" })) },
                { key: "plan", title: c.plan, render: (_: unknown, t: Tenant) => cell(tag(words.plans[t.plan], t.plan === "commercial" ? "violet" : "lime")) },
                { key: "region", title: c.region, render: (_: unknown, t: Tenant) => cell(text("small", regionLabel(t.region), { tone: "secondary" })) },
                { key: "members", title: c.members, align: "end", render: (_: unknown, t: Tenant) => cell(text("small", formatNumber(t.members))) },
                { key: "flows", title: c.flows, align: "end", render: (_: unknown, t: Tenant) => cell(text("small", formatNumber(t.flows))) },
                { key: "runs30d", title: c.runs, align: "end", render: (_: unknown, t: Tenant) => cell(text("small", formatNumber(t.runs30d))) },
                { key: "status", title: c.status, render: (_: unknown, t: Tenant) => cell(status(t.status === "active" ? "success" : "warning", words.statuses[t.status])) },
                {
                  key: "action",
                  title: c.action,
                  ariaLabel: c.status,
                  align: "end",
                  render: (_: unknown, t: Tenant) =>
                    t.id === own ? "" : cell(button("glass", t.status === "active" ? words.suspend : words.resume, { size: "sm", onClick: () => void setStatus(t, t.status === "active" ? "suspended" : "active") })),
                },
              ],
              data: list.tenants.map((t) => ({ ...t, key: t.id })),
            },
            config: { hoverable: true, bordered: false, ariaLabel: words.title },
          },
          { pad: "none", scroll: true },
        ),
        text("small", fill(words.total, { n: list.tenants.length, total: list.total }), { tone: "secondary" }),
      ],
      { gap: "m" },
    );
  };

  async function reload(): Promise<void> {
    try {
      list = await api.listTenants(query);
      context.instance<XWUIComposer>("tenant-table")?.setTree(table());
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  }

  const fields: { dialog?: { open(): void; close(): void }; name?: XWUIInputText; plan?: XWUISelect; region?: XWUISelect } = {};
  const create = async (): Promise<void> => {
    try {
      const tenant = await api.addTenant({
        name: fields.name?.getValue() ?? "",
        plan: String(fields.plan?.getValue() ?? "core") as TenantPlan,
        region: String(fields.region?.getValue() ?? "eu-central"),
      });
      fields.dialog?.close();
      fields.name?.setValue("");
      notify(fill(words.added, { name: tenant.name, plan: words.plans[tenant.plan] }), "success");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  const d = words.dialog;
  const dialog: Node = {
    tag: "xwui-dialog",
    data: { title: d.title },
    config: { size: "medium", closable: true },
    slots: {
      content: stack(
        [
          { tag: "xwui-input-text", data: { label: d.name, placeholder: d.namePlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (fields.name = i as XWUIInputText) },
          {
            tag: "xwui-select",
            data: { label: d.plan, value: "core", options: (Object.keys(words.plans) as TenantPlan[]).map((value) => ({ value, label: words.plans[value] })) },
            config: { fullWidth: true },
            ref: (i) => (fields.plan = i as XWUISelect),
          },
          {
            tag: "xwui-select",
            data: { label: d.region, value: "eu-central", options: Object.entries(words.regions).map(([value, label]) => ({ value, label })) },
            config: { fullWidth: true },
            ref: (i) => (fields.region = i as XWUISelect),
          },
        ],
        { gap: "l" },
      ),
      footer: row([button("glass", d.cancel, { onClick: () => fields.dialog?.close() }), button("primary", d.create, { onClick: () => void create() })], { justify: "flex-end" }),
    },
    ref: (instance) => (fields.dialog = instance as { open(): void; close(): void }),
  };

  return {
    bar: adminBar(context.admin!, "admin", words.title, { actions: [button("primary", words.add, { size: "sm", icon: "plus", onClick: () => fields.dialog?.open() })] }),
    body: [
      ...pageHead(words.title, words.lead),
      row(
        [
          {
            tag: "xwui-input-text",
            data: { placeholder: words.search },
            config: { type: "search", leadingIcon: "search", ariaLabel: words.search, clearable: true },
            ref: (instance) =>
              (instance as XWUIInputText).onChange(
                debounce((value: string) => {
                  query.q = value.trim();
                  void reload();
                }, config.searchDebounceMs),
              ),
          },
          choice("", [{ value: "", label: words.anyPlan }, ...(Object.keys(words.plans) as TenantPlan[]).map((value) => ({ value, label: words.plans[value] }))], words.columns.plan, (value) => {
            query.plan = value as TenantPlan | "";
            void reload();
          }),
          choice("", [{ value: "", label: catalog.console.shared.anyStatus }, ...(Object.keys(words.statuses) as TenantStatus[]).map((value) => ({ value, label: words.statuses[value] }))], words.columns.status, (value) => {
            query.status = value as TenantStatus | "";
            void reload();
          }),
        ],
        { gap: "m", wrap: true },
      ),
      { tag: "xwui-composer", key: "tenant-table", data: { tree: table() } },
      dialog,
    ],
  };
}
