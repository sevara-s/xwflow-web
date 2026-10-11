import { describe, expect, it } from "vitest";
import { href, parseLocation, paths } from "../src/app/router";

describe("router", () => {
  it("maps the public site", () => {
    expect(parseLocation("#/")).toMatchObject({ zone: "site", page: "landing" });
    expect(parseLocation("")).toMatchObject({ zone: "site", page: "landing" });
    expect(parseLocation("#/self-host")).toMatchObject({ zone: "site", page: "selfHost" });
  });

  it("reads list filters from the query and drops unknown values", () => {
    expect(parseLocation("#/studio/flows?q=order&status=draft&folder=Sales")).toEqual({
      zone: "studio",
      page: "flows",
      q: "order",
      status: "draft",
      folder: "Sales",
    });
    expect(parseLocation("#/studio/runs?status=bogus&mode=test")).toMatchObject({ status: "", mode: "test", range: "7d" });
    expect(parseLocation("#/studio/runs?range=all")).toMatchObject({ range: "all" });
  });

  it("routes the editor, notation views and run receipts", () => {
    expect(parseLocation("#/studio/flows/f_1?node=n_2")).toEqual({ zone: "editor", page: "editor", flowId: "f_1", node: "n_2" });
    expect(parseLocation("#/studio/flows/f_1/bpmn")).toEqual({ zone: "editor", page: "view", flowId: "f_1", view: "bpmn" });
    expect(parseLocation("#/studio/flows/f_1/nope")).toMatchObject({ zone: "notFound" });
    expect(parseLocation("#/studio/runs/r_7f39?attempt=a3")).toEqual({ zone: "studio", page: "run", runId: "r_7f39", attempt: "a3" });
  });

  it("routes the project areas beside flows, with their filters", () => {
    expect(parseLocation("#/studio/agents?q=lead&status=paused")).toEqual({ zone: "studio", page: "agents", q: "lead", status: "paused" });
    expect(parseLocation("#/studio/agents?status=bogus")).toMatchObject({ status: "" });
    expect(parseLocation("#/studio/tables?table=t_orders")).toEqual({ zone: "studio", page: "tables", table: "t_orders" });
    expect(parseLocation("#/studio/forms")).toEqual({ zone: "studio", page: "forms" });
    expect(parseLocation("#/studio/variables?scope=test")).toEqual({ zone: "studio", page: "variables", scope: "test", q: "" });
    expect(parseLocation("#/studio/mcp")).toEqual({ zone: "studio", page: "mcp" });
    expect(parseLocation("#/studio/agents/extra")).toMatchObject({ zone: "notFound" });
  });

  it("routes the workspace pages and a flow's versions", () => {
    expect(parseLocation("#/studio/overview")).toEqual({ zone: "studio", page: "overview" });
    expect(parseLocation("#/studio/templates?category=Sales&q=lead")).toEqual({ zone: "studio", page: "templates", q: "lead", category: "Sales" });
    expect(parseLocation("#/studio/insights?days=7")).toEqual({ zone: "studio", page: "insights", days: 7 });
    expect(parseLocation("#/studio/insights?days=3")).toMatchObject({ days: 14 });
    expect(parseLocation("#/studio/settings?tab=keys")).toEqual({ zone: "studio", page: "settings", tab: "keys" });
    expect(parseLocation("#/studio/settings?tab=nope")).toMatchObject({ tab: "general" });
    expect(parseLocation("#/studio/flows/f_1/versions")).toEqual({ zone: "studio", page: "versions", flowId: "f_1" });
  });

  it("routes admin, system and the denied state", () => {
    expect(parseLocation("#/admin")).toEqual({ zone: "admin", page: "overview" });
    expect(parseLocation("#/admin/audit")).toEqual({ zone: "admin", page: "audit" });
    expect(parseLocation("#/system/health")).toEqual({ zone: "system", page: "health" });
    expect(parseLocation("#/denied")).toEqual({ zone: "denied", page: "denied" });
  });

  it("gives every admin and system rail item its own route", () => {
    for (const page of ["tenants", "credentials", "registry", "adapters", "usage", "ai", "branding", "audit"] as const) {
      expect(parseLocation(`#${paths.adminPage(page)}`)).toEqual({ zone: "admin", page });
    }
    for (const page of ["health", "schedules", "workers", "executions", "config"] as const) {
      expect(parseLocation(`#${paths.systemPage(page)}`)).toEqual({ zone: "system", page });
    }
    expect(paths.adminPage("overview")).toBe("/admin");
    expect(parseLocation("#/admin/nope").zone).toBe("notFound");
    expect(parseLocation("#/system/nope").zone).toBe("notFound");
  });

  it("builds links with only the filters that are set", () => {
    expect(href(paths.runs, { q: "order", status: "", mode: undefined })).toBe("#/studio/runs?q=order");
    expect(href(paths.flow("f a"))).toBe("#/studio/flows/f%20a");
  });
});
