import { api } from "../../api/client";
import { fill, formatAgo, formatStampLong } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { ActorClass, AuditEvent, AuditList, AuditQuery } from "../../types/domain";
import { hueOf } from "../../ui/flow";
import { button, glass, iconTile, row, space, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUISelect } from "../../xwui";

const words = catalog.admin.audit;
const eventIcons: Record<string, string> = { published: "upload", edited: "sparkles", replaced: "link", paused: "clock", erased: "x" };

function toCsv(list: AuditList): string {
  const rows = [words.csvHeader, ...list.events.map((event) => [formatStampLong(event.at), event.title, event.object.name, event.actor.name, words.classes[event.actor.class]])];
  return rows.map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function eventRow(event: AuditEvent, project: string): Node {
  const type = words.objects[event.object.type as keyof typeof words.objects] ?? event.object.type;
  const objectLine = event.object.note
    ? fill(words.objectNote, { name: event.object.name, note: event.object.note })
    : event.object.type === "runs"
      ? event.object.name
      : fill(words.objectLine, { name: event.object.name, type: type.toLocaleLowerCase(), project });
  const classColor = words.classColors[event.actor.class];
  return glass(
    row(
      [
        row([iconTile(eventIcons[event.kind] ?? "file-text", hueOf[event.group], "sm"), stack([text("small", event.title, { bold: true }), text("xs", objectLine, { tone: "secondary" })], { gap: "xs" })], {
          gap: "m",
        }),
        row(
          [
            ...(event.actor.class === "person" ? [{ tag: "xwui-avatar", data: { name: event.actor.name }, config: { size: "small", decorative: true } }] : []),
            text("small", event.actor.name),
            tag(words.classes[event.actor.class], classColor === "plain" ? undefined : (classColor as Hue)),
            ...(event.onBehalfOf ? [text("xs", fill(words.forWhom, { name: event.onBehalfOf }), { tone: "tertiary" })] : []),
            text("xs", formatAgo(event.at), { tone: "tertiary" }),
          ],
          { gap: "s", wrap: true },
        ),
      ],
      { justify: "space-between", wrap: true, gap: "m" },
    ),
    { pad: "s" },
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const { workspace } = context;
  const query: AuditQuery = { days: Number(words.ranges[0].value) };
  let list = await api.listAudit(query);

  const timeline = (): Node =>
    list.events.length
      ? stack(
          list.events.map((event) => eventRow(event, workspace.project.name)),
          { gap: "m" },
        )
      : { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
  const reload = async (): Promise<void> => {
    try {
      list = await api.listAudit(query);
      context.instance<XWUIComposer>("audit-timeline")?.setTree(timeline());
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  };
  const filter = (key: keyof AuditQuery, label: string, any: string | null, options: Array<{ value: string; label: string }>, value = ""): Node => ({
    tag: "xwui-select",
    data: { value, placeholder: any ?? undefined, options: any ? [{ value: "", label: any }, ...options] : options },
    config: { ariaLabel: label },
    ref: (instance) =>
      (instance as XWUISelect).onChange((next) => {
        const raw = String(next);
        (query as Record<string, unknown>)[key] = key === "days" ? Number(raw) : raw;
        void reload();
      }),
  });
  const download = (): void => {
    // A CSV served as text/csv is saved by the browser rather than shown.
    const url = URL.createObjectURL(new Blob([toCsv(list)], { type: "text/csv" }));
    window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(fill(words.downloaded, { n: list.events.length }), "success");
  };

  const filters = words.filters;
  const [leadStart, leadEnd] = words.lead.split("{days}");
  const [lineStart, lineEnd] = words.identity.split("{link}");

  return {
    bar: adminBar(context.admin!, "admin", words.title, { actions: [button("glass", words.download, { size: "sm", icon: "download", onClick: download })] }),
    body: [
      text("h2", words.title),
      row([text("lead", leadStart), tag(String(list.retentionDays), "lime"), text("lead", leadEnd)], { gap: "s", wrap: true }),
      glass(
        row(
          [
            text("small", `${lineStart}${words.identityLink}${lineEnd}`, { tone: "secondary" }),
            button("ghost", words.identityLink, { size: "sm", icon: "external-link", onClick: () => notify(words.identitySoon, "info") }),
          ],
          { justify: "space-between", wrap: true, gap: "m" },
        ),
        { pad: "s" },
      ),
      row(
        [
          filter("actor", filters.actor, filters.anyActor, list.actors.map((name) => ({ value: name, label: name }))),
          filter("actorClass", filters.actorClass, filters.anyClass, (Object.keys(words.classes) as ActorClass[]).map((value) => ({ value, label: words.classes[value] }))),
          filter("action", filters.action, filters.anyAction, list.actions.map((value) => ({ value, label: words.actions[value as keyof typeof words.actions] ?? value }))),
          filter("objectType", filters.object, filters.anyObject, list.objectTypes.map((value) => ({ value, label: words.objects[value as keyof typeof words.objects] ?? value }))),
          filter("days", filters.range, null, words.ranges.map((item) => ({ ...item })), words.ranges[0].value),
        ],
        { gap: "m", wrap: true },
      ),
      {
        tag: "xwui-grid",
        config: { columns: "minmax(0, 1fr)", gap: space("xl"), alignItems: "start", responsive: { lg: { columns: "minmax(0, 2fr) minmax(0, 1fr)" } } },
        slots: {
          children: [
            { tag: "xwui-composer", key: "audit-timeline", data: { tree: timeline() } },
            glass(
              stack(
                [
                  row([text("h3", words.stream), tag(catalog.admin.branding.requires, "violet")], { justify: "space-between", wrap: true }),
                  text("small", words.streamBody, { tone: "secondary" }),
                  row([button("glass", words.configure, { disabled: true })]),
                ],
                { gap: "l" },
              ),
              { pad: "m", gradientBorder: true },
            ),
          ],
        },
      },
    ],
  };
}
