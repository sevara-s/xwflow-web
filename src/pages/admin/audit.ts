import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatAgo, formatStampLong } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { catalog } from "../../content/catalog";
import type { ActorClass, AuditEvent, AuditQuery } from "../../types/domain";
import { XWUIAvatar, XWUIButton, XWUIEmpty, XWUISelect, XWUITag } from "../../xwui";
import { glass, heading } from "../studio/common";
import { mountAdminBar } from "./common";
import "./admin.css";

const words = catalog.admin.audit;
const eventIcons: Record<string, string> = { published: "upload", edited: "sparkles", replaced: "link", paused: "clock", erased: "x" };

export async function render(context: PageContext): Promise<void> {
  const { scope, body, workspace } = context;
  const bar = await mountAdminBar(context, "admin", words.title);
  const query: AuditQuery = { days: Number(words.ranges[0].value) };
  let list = await api.listAudit(query);

  const download = scope.track(new XWUIButton(slot(bar.actions), { text: words.download }, { variant: "ghost", size: "sm", icon: "download", className: "xwflow-btn-glass" }));
  download.onClick(() => {
    const rows = [words.csvHeader, ...list.events.map((event) => [formatStampLong(event.at), event.title, event.object.name, event.actor.name, words.classes[event.actor.class]])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = el("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "xwflow-audit.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    notify(fill(words.downloaded, { n: list.events.length }), "success");
  });

  const intro = el("div", "xwflow-stack xwflow-gap-4");
  body.append(intro);
  heading(intro, 1, "h2", words.title);
  const lead = el("p", "xwflow-sec");
  const [before, after] = words.lead.split("{days}");
  lead.append(before, el("span", "xwflow-placeholder xwflow-placeholder--filled", String(list.retentionDays)), after);
  intro.append(lead);

  const identity = el("div", "xwflow-band xwflow-small");
  identity.dataset.tone = "info";
  const [lineStart, lineEnd] = words.identity.split("{link}");
  const link = el("a", undefined, words.identityLink);
  link.href = "#identity";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    notify(words.identitySoon, "info");
  });
  const line = el("div");
  line.append(lineStart, link, lineEnd);
  identity.append(line);
  body.append(identity);

  const toolbar = el("div", "xwflow-toolbar");
  body.append(toolbar);
  const filter = <K extends keyof AuditQuery>(key: K, label: string, any: string, options: Array<{ value: string; label: string }>, value = ""): void => {
    const select = scope.track(
      new XWUISelect(slot(toolbar, "xwflow-toolbar__select"), { value, placeholder: any, options: [{ value: "", label: any }, ...options] }, { ariaLabel: label }),
    );
    select.onChange(async (next) => {
      const raw = String(next);
      (query as Record<string, unknown>)[key] = key === "days" ? Number(raw) : raw;
      try {
        list = await api.listAudit(query);
        show();
      } catch (error) {
        notify(errorMessage(error, catalog.errors.load), "danger");
      }
    });
  };
  const filters = words.filters;
  filter("actor", filters.actor, filters.anyActor, list.actors.map((name) => ({ value: name, label: name })));
  filter("actorClass", filters.actorClass, filters.anyClass, (Object.keys(words.classes) as ActorClass[]).map((value) => ({ value, label: words.classes[value] })));
  filter("action", filters.action, filters.anyAction, list.actions.map((value) => ({ value, label: words.actions[value as keyof typeof words.actions] ?? value })));
  filter("objectType", filters.object, filters.anyObject, list.objectTypes.map((value) => ({ value, label: words.objects[value as keyof typeof words.objects] ?? value })));
  const range = scope.track(
    new XWUISelect(slot(toolbar, "xwflow-toolbar__select"), { value: words.ranges[0].value, options: words.ranges.map((item) => ({ ...item })) }, { ariaLabel: filters.range }),
  );
  range.onChange(async (next) => {
    query.days = Number(next);
    list = await api.listAudit(query);
    show();
  });

  const split = el("div", "xwflow-audit");
  body.append(split);
  const timeline = el("ol", "xwflow-timeline");
  split.append(timeline);
  const aside = glass(split, { pad: "m", className: "xwflow-stack xwflow-gap-16 xwflow-audit__aside", label: words.stream });
  const asideHead = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  aside.append(asideHead);
  heading(asideHead, 2, "h3", words.stream);
  scope.track(new XWUITag(slot(asideHead, "xwflow-push"), { label: catalog.admin.branding.requires }, { size: "small", className: "xwflow-tag" }));
  aside.append(el("p", "xwflow-small xwflow-sec", words.streamBody));
  scope.track(new XWUIButton(slot(aside), { text: words.configure }, { variant: "ghost", disabled: true, className: "xwflow-btn-glass" }));

  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  function show(): void {
    owned.splice(0).forEach((item) => item.destroy());
    timeline.replaceChildren();
    if (!list.events.length) {
      owned.push(new XWUIEmpty(slot(timeline), { icon: "search", title: words.empty.title, description: words.empty.description }));
      return;
    }
    for (const event of list.events) timeline.append(eventRow(event, { track: (item) => (owned.push(item), item) }, workspace.project.name));
  }
  show();
}

function eventRow(event: AuditEvent, scope: Tracker, project: string): HTMLElement {
  const row = el("li", "xwflow-event");
  row.dataset.group = event.group;
  scope.track(new XWFlowStepIcon(slot(row), { icon: eventIcons[event.kind] ?? "file-text", group: event.group }, { size: "sm" }));
  const text = el("div", "xwflow-grow");
  const type = words.objects[event.object.type as keyof typeof words.objects] ?? event.object.type;
  const objectLine = event.object.note
    ? fill(words.objectNote, { name: event.object.name, note: event.object.note })
    : event.object.type === "runs"
      ? event.object.name
      : fill(words.objectLine, { name: event.object.name, type: type.toLocaleLowerCase(), project });
  text.append(el("b", undefined, event.title), el("div", "xwflow-small xwflow-sec", objectLine));
  row.append(text);
  const actor = el("span", "xwflow-row xwflow-gap-8 xwflow-small");
  if (event.actor.class === "person") {
    const avatar = el("span", "xwflow-avatar");
    scope.track(new XWUIAvatar(avatar, { name: event.actor.name }, { size: "xs", decorative: true }));
    actor.append(avatar);
  }
  actor.append(event.actor.name);
  scope.track(
    new XWUITag(slot(actor), { label: words.classes[event.actor.class] }, { size: "small", className: `xwflow-tag xwflow-tag--${words.classColors[event.actor.class]}` }),
  );
  if (event.onBehalfOf) actor.append(el("span", "xwflow-xs xwflow-ter", fill(words.forWhom, { name: event.onBehalfOf })));
  row.append(actor);
  const when = el("time", "xwflow-small xwflow-ter", formatAgo(event.at));
  when.dateTime = new Date(event.at).toISOString();
  when.title = formatStampLong(event.at);
  row.append(when);
  return row;
}


