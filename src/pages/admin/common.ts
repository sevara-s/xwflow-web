import { api } from "../../api/client";
import { fill } from "../../app/format";
import type { PageContext } from "../../app/page";
import { href, paths } from "../../app/router";
import { XWFlowAppBar } from "../../components/XWFlowAppBar/XWFlowAppBar";
import type { Crumb } from "../../components/XWFlowAppBar/XWFlowAppBar.types";
import { catalog } from "../../content/catalog";

const words = catalog.admin;

/** Admin header: crumbs, then sample-data and tenant tags (or the plan) and the account. */
export async function mountAdminBar(
  context: PageContext,
  zone: "admin" | "system",
  page: string,
  options: { sample?: boolean; plan?: boolean } = {},
): Promise<XWFlowAppBar> {
  const admin = await api.getAdminContext();
  const crumbs: Crumb[] = [{ label: words.crumbs[zone], href: href(zone === "admin" ? paths.admin : paths.health) }, { label: page }];
  const tags: Array<{ label: string; color: "plain" | "lime" | "violet" }> = [{ label: fill(words.tenant, { name: admin.tenant.name }), color: "plain" }];
  if (options.plan) tags.push({ label: words.plan[admin.tenant.plan], color: "lime" });
  return context.scope.track(
    new XWFlowAppBar(context.header, {
      crumbs,
      sampleTag: options.sample === false ? undefined : words.sample,
      tags: options.plan || options.sample !== false ? tags : [],
      accountLabel: catalog.studio.topbar.account,
      accountName: context.workspace.you.name,
      hideAccount: options.plan,
    }),
  );
}
