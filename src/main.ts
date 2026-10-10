import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/xwui-skin.css";
import { mountApplication } from "./app/app";

const root = document.querySelector("#app");
if (root instanceof HTMLElement) void mountApplication(root);
