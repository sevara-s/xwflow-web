import { XWUIButton, XWUIInputTextarea, XWUITypography } from "../../xwui";
import type { AssistantViewModel } from "./XWFlowAssistant.types";

export interface AssistantViewHandles {
  destroy(): void;
  readInstruction(): string;
  clearInstruction(): void;
}

export function renderAssistant(
  container: HTMLElement,
  model: AssistantViewModel,
  handlers: { onSubmit(): void },
): AssistantViewHandles {
  const owned: Array<{ destroy(): void }> = [];
  container.classList.add("xwflow-assistant");
  container.replaceChildren();

  const titleHost = document.createElement("div");
  const transcript = document.createElement("div");
  transcript.className = "xwflow-assistant__transcript";
  transcript.setAttribute("role", "log");
  const composer = document.createElement("div");
  composer.className = "xwflow-assistant__composer";
  const inputHost = document.createElement("div");
  const buttonHost = document.createElement("div");
  composer.append(inputHost, buttonHost);
  container.append(titleHost, transcript, composer);

  owned.push(new XWUITypography(titleHost, { text: model.title, variant: "h3" }));

  if (!model.turns.length) {
    const hint = document.createElement("p");
    hint.className = "xwflow-assistant__hint";
    hint.textContent = model.emptyHint;
    transcript.append(hint);
  } else {
    for (const turn of model.turns) {
      const block = document.createElement("article");
      block.className = `xwflow-assistant__turn is-${turn.role}`;
      const speaker = document.createElement("span");
      speaker.className = "xwflow-assistant__speaker";
      speaker.textContent = turn.speaker;
      const body = document.createElement("p");
      body.textContent = turn.text;
      block.append(speaker, body);
      transcript.append(block);
    }
    transcript.scrollTop = transcript.scrollHeight;
  }

  const input = new XWUIInputTextarea(inputHost, {
    label: model.title,
    placeholder: model.placeholder,
    variant: "outline",
    fullWidth: true,
    rows: 3,
  });
  owned.push(input);
  const button = new XWUIButton(buttonHost, { text: model.sendLabel, loading: model.busy }, { variant: "primary" });
  button.onClick(() => handlers.onSubmit());
  owned.push(button);

  return {
    destroy() {
      for (const item of owned) item.destroy();
    },
    readInstruction: () => input.getValue(),
    clearInstruction: () => input.setData({ value: "" }),
  };
}
