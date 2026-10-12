/** Every route of the app, for the page-wide checks (accessibility, phone width). */
export const routes = [
  "/", "/integrations", "/pricing", "/self-host", "/notations",
  "/studio", "/studio/overview", "/studio/flows", "/studio/runs", "/studio/runs/r_7f39", "/studio/connections",
  "/studio/agents", "/studio/tables", "/studio/forms", "/studio/variables", "/studio/mcp", "/studio/templates",
  "/studio/insights", "/studio/settings",
  "/studio/flows/f_order_alert", "/studio/flows/f_order_alert/versions", "/studio/flows/f_order_alert/flowchart",
  "/studio/flows/f_order_alert/swimlane", "/studio/flows/f_order_alert/bpmn", "/studio/flows/f_order_alert/sequence",
  "/studio/flows/f_order_alert/sim", "/studio/flows/f_order_alert/3d",
  "/admin", "/admin/tenants", "/admin/audit", "/admin/credentials", "/admin/registry", "/admin/adapters",
  "/admin/branding", "/admin/usage", "/admin/ai", "/denied",
  "/system/health", "/system/schedules", "/system/workers", "/system/executions", "/system/config",
] as const;
