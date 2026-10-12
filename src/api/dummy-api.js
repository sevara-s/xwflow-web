/**
 * Local dummy API for xwflow. Pages reach data only through these async
 * functions. Each call waits a short, simulated network latency and returns
 * a copy, so the UI can never mutate the store by accident.
 *
 * The workspace is kept for the browser session (sessionStorage). Clearing
 * site data restores the sample workspace.
 */

export * from "./modules/studio.js";
export * from "./modules/site.js";
export * from "./modules/admin.js";
export * from "./modules/views.js";
export * from "./modules/project.js";
export * from "./modules/workspace.js";
export * from "./modules/console.js";
