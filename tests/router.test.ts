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

  it("routes admin, system and the denied state", () => {
    expect(parseLocation("#/admin")).toEqual({ zone: "admin", page: "overview" });
    expect(parseLocation("#/admin/audit")).toEqual({ zone: "admin", page: "audit" });
    expect(parseLocation("#/system/health")).toEqual({ zone: "system", page: "health" });
    expect(parseLocation("#/denied")).toEqual({ zone: "denied", page: "denied" });
  });

  it("builds links with only the filters that are set", () => {
    expect(href(paths.runs, { q: "order", status: "", mode: undefined })).toBe("#/studio/runs?q=order");
    expect(href(paths.flow("f a"))).toBe("#/studio/flows/f%20a");
  });
});
