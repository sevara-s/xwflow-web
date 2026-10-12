import { api } from "../../api/client";
import { fill, formatAgo } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { paths, replaceQuery, type Route } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { ApiKey, Member, MemberRole, NotificationPrefs, Settings } from "../../types/domain";
import { button, cell, glass, quietLabel, row, space, stack, tag, text, type Node } from "../../ui/kit";
import { columns } from "../../ui/layout";
import type { XWUIComposer, XWUIInputText, XWUISelect } from "../../xwui";

type SettingsRoute = Extract<Route, { page: "settings" }>;
type Tab = SettingsRoute["tab"];
type Dialog = { open(): void; close(): void };
type Changeable<T> = { onChange(handler: (value: T) => void): void };

const words = catalog.workspace.settings;

/** A label over a field, for fields whose component has no label of its own. */
const labelled = (label: string, field: Node, hint?: string): Node =>
  stack([text("small", label, { bold: true }), field, ...(hint ? [text("xs", hint, { tone: "tertiary" })] : [])], { gap: "s" });

function general(settings: Settings, refresh: () => void): Node {
  const draft = { ...settings.general };
  const g = words.general;
  const save = async (): Promise<void> => {
    try {
      await api.saveGeneral({ ...draft, retentionDays: Number(draft.retentionDays) });
      notify(g.saved, "success");
      refresh();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  const select = (value: string, options: ReadonlyArray<{ value: string; label: string }>, label: string, onPick: (value: string) => void): Node => ({
    tag: "xwui-select",
    data: { label, value, options: options.map((item) => ({ ...item })) },
    config: { fullWidth: true },
    ref: (instance) => (instance as XWUISelect).onChange((picked) => onPick(String(picked))),
  });
  return glass(
    stack(
      [
        {
          tag: "xwui-input-text",
          data: { label: g.name, value: draft.name },
          config: { fullWidth: true, required: true },
          ref: (instance) => (instance as XWUIInputText).onChange((value: string) => (draft.name = value)),
        },
        {
          tag: "xwui-grid",
          config: { columns: columns.one, gap: space("l"), responsive: { md: { columns: columns.halves } } },
          slots: {
            children: [
              stack([select(draft.timezone, words.timezones, g.timezone, (value) => (draft.timezone = value)), text("xs", g.timezoneHint, { tone: "tertiary" })], { gap: "s" }),
              select(draft.language, words.languages, g.language, (value) => (draft.language = value)),
              select(String(draft.retentionDays), g.retentionOptions, g.retention, (value) => (draft.retentionDays = Number(value))),
              labelled(g.weekStart, {
                tag: "xwui-segmented-control",
                data: { value: draft.weekStart },
                config: { options: g.weekStarts.map((item) => ({ value: item.id, label: item.label })), ariaLabel: g.weekStart },
                ref: (instance) => (instance as Partial<Changeable<string>>).onChange?.((value) => (draft.weekStart = value as Settings["general"]["weekStart"])),
              }),
            ],
          },
        },
        row([button("primary", g.save, { onClick: () => void save() })], { justify: "flex-end" }),
      ],
      { gap: "xl" },
    ),
    { pad: "l" },
  );
}

function members(settings: Settings, refresh: () => void, invite: () => void): Node {
  const m = words.members;
  const act = async (work: () => Promise<string>): Promise<void> => {
    try {
      notify(await work(), "success");
      refresh();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  return stack(
    [
      row([button("primary", m.invite, { icon: "user-plus", onClick: invite })], { justify: "flex-end" }),
      glass(
        {
          tag: "xwui-table",
          data: {
            columns: [
              {
                key: "name",
                title: m.columns.name,
                render: (_: unknown, member: Member) =>
                  cell(
                    row(
                      [
                        { tag: "xwui-avatar", data: { name: member.name }, config: { size: "small" } },
                        stack(
                          [
                            row([text("small", member.name, { bold: true }), ...(member.isYou ? [tag(m.you, "lime")] : []), ...(member.invited ? [tag(m.invited, "amber")] : [])], { gap: "s" }),
                            text("xs", member.email, { tone: "tertiary" }),
                          ],
                          { gap: "xs" },
                        ),
                      ],
                      { gap: "m" },
                    ),
                  ),
              },
              {
                key: "role",
                title: m.columns.role,
                render: (_: unknown, member: Member) =>
                  cell(
                    member.role === "owner"
                      ? tag(m.roles.owner, "violet")
                      : {
                          tag: "xwui-select",
                          data: { value: member.role, options: (["editor", "viewer"] as const).map((role) => ({ value: role, label: m.roles[role] })) },
                          config: { size: "small", ariaLabel: fill(m.roleLabel, { name: member.name }) },
                          ref: (instance) =>
                            (instance as XWUISelect).onChange((value) =>
                              void act(async () => {
                                const role = String(value) as Exclude<MemberRole, "owner">;
                                await api.setMemberRole(member.id, role);
                                return fill(m.roleChanged, { name: member.name, role: m.roles[role].toLocaleLowerCase() });
                              }),
                            ),
                        },
                  ),
              },
              {
                key: "lastActiveAt",
                title: m.columns.active,
                render: (_: unknown, member: Member) => cell(text("small", member.lastActiveAt === null ? m.never : formatAgo(member.lastActiveAt), { tone: "secondary" })),
              },
              {
                key: "actions",
                title: m.columns.actions,
                align: "end",
                render: (_: unknown, member: Member) =>
                  cell(
                    member.role === "owner"
                      ? text("xs", "")
                      : button("ghost", "", {
                          size: "sm",
                          icon: "trash-2",
                          label: fill(m.remove, { name: member.name }),
                          onClick: () =>
                            void act(async () => {
                              await api.removeMember(member.id);
                              return fill(m.removed, { name: member.name });
                            }),
                        }),
                  ),
              },
            ],
            data: settings.members.map((member) => ({ ...member, key: member.id })),
          },
          config: { hoverable: true, bordered: false, ariaLabel: m.tableLabel },
        },
        { pad: "none", scroll: true },
      ),
    ],
    { gap: "l" },
  );
}

function keys(settings: Settings, refresh: () => void, create: () => void): Node {
  const k = words.keys;
  const revoke = async (key: ApiKey): Promise<void> => {
    try {
      await api.revokeApiKey(key.id);
      notify(fill(k.revoked, { name: key.name }), "success");
      refresh();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  return stack(
    [
      row([text("small", k.lead, { tone: "secondary" }), button("primary", k.create, { icon: "key", onClick: create })], { justify: "space-between", wrap: true, gap: "m" }),
      ...(settings.apiKeys.length
        ? settings.apiKeys.map((key) =>
            glass(
              row(
                [
                  stack(
                    [
                      row([text("body", key.name, { bold: true }), text("small", `${key.prefix}••••`, { mono: true, tone: "tertiary" })], { gap: "m", wrap: true }),
                      row(key.scopes.map((scope) => tag(scope, scope.endsWith("write") ? "orange" : "cyan")), { gap: "s" }),
                      text(
                        "xs",
                        `${fill(k.created, { when: formatAgo(key.createdAt).toLocaleLowerCase() })} · ${key.lastUsedAt === null ? k.neverUsed : fill(k.lastUsed, { when: formatAgo(key.lastUsedAt).toLocaleLowerCase() })}`,
                        { tone: "tertiary" },
                      ),
                    ],
                    { gap: "s" },
                  ),
                  button("glass", k.revoke, { size: "sm", onClick: () => void revoke(key) }),
                ],
                { justify: "space-between", wrap: true, gap: "m" },
              ),
              { pad: "m" },
            ),
          )
        : [text("small", k.empty, { tone: "secondary" })]),
    ],
    { gap: "l" },
  );
}

function notifications(settings: Settings): Node {
  const n = words.notifications;
  return glass(
    stack(
      n.items.map((item) =>
        row(
          [
            stack([text("body", item.title, { bold: true }), text("small", item.detail, { tone: "secondary" })], { gap: "xs" }),
            {
              tag: "xwui-switch",
              data: { checked: settings.notifications[item.id as keyof NotificationPrefs], label: item.title },
              config: { ariaLabel: item.title, className: quietLabel },
              ref: (instance) =>
                (instance as Changeable<boolean>).onChange(async (checked) => {
                  try {
                    await api.setNotification(item.id as keyof NotificationPrefs, checked);
                    notify(fill(checked ? n.on : n.off, { title: item.title }), "info");
                  } catch (error) {
                    notify(errorMessage(error), "danger");
                  }
                }),
            },
          ],
          { justify: "space-between", gap: "l" },
        ),
      ),
      { gap: "xl" },
    ),
    { pad: "l" },
  );
}

export async function view(context: ViewContext<SettingsRoute>): Promise<PageResult> {
  let tab: Tab = context.route.tab;
  let settings = await api.getSettings();

  const dialogs: { invite?: Dialog; key?: Dialog; email?: XWUIInputText; inviteRole?: XWUISelect; keyName?: XWUIInputText; keyScope?: XWUISelect } = {};
  const section = (): Node =>
    tab === "members"
      ? members(settings, refresh, () => setTimeout(() => dialogs.invite?.open(), 0))
      : tab === "keys"
        ? keys(settings, refresh, () => {
            context.instance<XWUIComposer>("key-body")?.setTree(keyForm());
            setTimeout(() => dialogs.key?.open(), 0);
          })
        : tab === "notifications"
          ? notifications(settings)
          : general(settings, refresh);
  function refresh(): void {
    void api.getSettings().then((next) => {
      settings = next;
      context.instance<XWUIComposer>("settings-section")?.setTree(section());
    });
  }

  const m = words.members.dialog;
  const sendInvite = async (): Promise<void> => {
    try {
      const member = await api.inviteMember({ email: dialogs.email?.getValue() ?? "", role: (String(dialogs.inviteRole?.getValue() ?? "editor") || "editor") as "editor" | "viewer" });
      notify(fill(m.sent, { email: member.email }), "success");
      dialogs.invite?.close();
      dialogs.email?.setValue("");
      refresh();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const k = words.keys.dialog;
  const keyForm = (): Node =>
    stack(
      [
        { tag: "xwui-input-text", data: { label: k.name, placeholder: k.namePlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (dialogs.keyName = i as XWUIInputText) },
        {
          tag: "xwui-select",
          data: { label: k.scope, value: "runs:read", options: k.scopeOptions.map((item) => ({ ...item })) },
          config: { fullWidth: true },
          ref: (i) => (dialogs.keyScope = i as XWUISelect),
        },
        row([button("glass", k.cancel, { onClick: () => dialogs.key?.close() }), button("primary", k.create, { onClick: () => void createKey() })], { justify: "flex-end" }),
      ],
      { gap: "l" },
    );
  const createKey = async (): Promise<void> => {
    try {
      const { token } = await api.createApiKey({ name: dialogs.keyName?.getValue() ?? "", scopes: [String(dialogs.keyScope?.getValue() ?? "runs:read")] });
      // The token is shown once, here, then only its prefix exists in the list.
      context.instance<XWUIComposer>("key-body")?.setTree(
        stack(
          [
            { tag: "xwui-alert", data: { message: k.once }, config: { variant: "warning" } },
            { tag: "xwui-code-block", data: { code: token }, config: { language: "text", copyable: true, showLineNumbers: false } },
            row([button("primary", k.done, { onClick: () => dialogs.key?.close() })], { justify: "flex-end" }),
          ],
          { gap: "l" },
        ),
      );
      refresh();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  return {
    bar: { crumbs: [{ label: words.title }], sample: null },
    body: [
      text("h2", words.title, { level: 1 }),
      text("lead", words.lead),
      {
        tag: "xwui-box",
        config: { overflow: "auto", width: "100%" },
        slots: {
          children: {
            tag: "xwui-tabs",
            data: { tabs: words.tabs.map((item) => ({ ...item })), activeTab: tab },
            config: { variant: "button", size: "sm", ariaLabel: words.tabsLabel, contentMode: "hidden" },
            ref: (instance) =>
              (instance as Changeable<string>).onChange((id) => {
                tab = id as Tab;
                replaceQuery(paths.settings, { tab: tab === "general" ? null : tab });
                context.instance<XWUIComposer>("settings-section")?.setTree(section());
              }),
          },
        },
      },
      { tag: "xwui-composer", key: "settings-section", data: { tree: section() } },
      {
        tag: "xwui-dialog",
        data: { title: m.title },
        config: { size: "medium", closable: true },
        slots: {
          content: stack(
            [
              { tag: "xwui-input-text", data: { label: m.email, placeholder: m.emailPlaceholder }, config: { type: "email", fullWidth: true, required: true }, ref: (i) => (dialogs.email = i as XWUIInputText) },
              {
                tag: "xwui-select",
                data: { label: m.role, value: "editor", options: (["editor", "viewer"] as const).map((role) => ({ value: role, label: words.members.roles[role] })) },
                config: { fullWidth: true },
                ref: (i) => (dialogs.inviteRole = i as XWUISelect),
              },
            ],
            { gap: "l" },
          ),
          footer: row([button("glass", m.cancel, { onClick: () => dialogs.invite?.close() }), button("primary", m.send, { icon: "send", onClick: () => void sendInvite() })], { justify: "flex-end" }),
        },
        ref: (instance) => (dialogs.invite = instance as Dialog),
      },
      {
        tag: "xwui-dialog",
        data: { title: k.title },
        config: { size: "medium", closable: true },
        slots: { content: { tag: "xwui-composer", key: "key-body", data: { tree: keyForm() } } },
        ref: (instance) => (dialogs.key = instance as Dialog),
      },
    ],
  };
}
