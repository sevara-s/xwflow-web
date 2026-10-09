import "./styles/app.css";
import { mountApplication } from "./app/shell";

const root = document.querySelector("#app");
if (root instanceof HTMLElement) {
  mountApplication(root);
}
