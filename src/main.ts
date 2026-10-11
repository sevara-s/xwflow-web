import { mountApplication } from "./app/app";

const root = document.querySelector("#app");
if (root instanceof HTMLElement) void mountApplication(root);
