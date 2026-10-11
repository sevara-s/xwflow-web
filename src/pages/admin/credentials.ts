import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { CredentialFinding, CredentialPolicy } from "../../types/domain";
import { button, glass, grid, iconTile, row, separator, stack, status, text, type Node } from "../../ui/kit";
import { choice, pageHead, section, settingRow, toggle } from "./console-view";

const words = catalog.console.credentials;
const issueIcon: Record<CredentialFinding["issue"], string> = { rotation: "clock", expired: "alert-triangle", personal: "user" };

function finding(item: CredentialFinding): Node {
  return glass(
    row(
      [
        row([iconTile(issueIcon[item.issue], item.issue === "expired" ? "red" : "amber", "sm"), stack([text("small", item.connection, { bold: true }), text("xs", fill(words.issues[item.issue], { n: item.ageDays }), { tone: "secondary" })], { gap: "xs" })], { gap: "m" }),
        status(item.issue === "expired" ? "error" : "warning", ""),
      ],
      { justify: "space-between", gap: "m" },
    ),
    { pad: "s" },
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const { policy, findings } = await api.getCredentialPolicy();
  const draft: CredentialPolicy = { ...policy };
  const save = async (): Promise<void> => {
    try {
      await api.saveCredentialPolicy(draft);
      notify(fill(catalog.console.shared.saved, { name: words.title }), "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const rules = section(
    words.rules,
    [
      settingRow(words.preferOAuth.title, words.preferOAuth.detail, toggle(draft.preferOAuth, words.preferOAuth.title, (on) => (draft.preferOAuth = on))),
      separator(),
      settingRow(words.blockPersonal.title, words.blockPersonal.detail, toggle(draft.blockPersonalInPublished, words.blockPersonal.title, (on) => (draft.blockPersonalInPublished = on))),
      separator(),
      settingRow(words.requireOwner.title, words.requireOwner.detail, toggle(draft.requireOwner, words.requireOwner.title, (on) => (draft.requireOwner = on))),
      separator(),
      row([text("body", words.rotation, { bold: true }), choice(String(draft.rotationDays), words.rotationOptions, words.rotation, (value) => (draft.rotationDays = Number(value)))], { justify: "space-between", wrap: true, gap: "m" }),
      row([button("primary", catalog.console.shared.save, { icon: "check", onClick: () => void save() })]),
    ],
    { pad: "l" },
  );

  const outOfPolicy = section(
    words.findings,
    [
      text("small", words.findingsLead, { tone: "secondary" }),
      ...(findings.length ? findings.map(finding) : [text("small", words.none, { tone: "secondary" })]),
      row([button("glass", words.openConnections, { icon: "arrow-right", iconAfter: true, onClick: () => navigate(paths.connections) })]),
    ],
    { pad: "l" },
  );

  return {
    bar: adminBar(context.admin!, "admin", words.title),
    body: [...pageHead(words.title, words.lead), grid([rules, outOfPolicy], 440)],
  };
}
