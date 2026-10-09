import type { AssistantTurn, AssistantViewModel, XWFlowAssistantData } from "./XWFlowAssistant.types";

let sequence = 0;

export function createAssistantState(data: XWFlowAssistantData): {
  data: XWFlowAssistantData;
  turns: AssistantTurn[];
  busy: boolean;
} {
  return { data, turns: [], busy: false };
}

export function toViewModel(
  data: XWFlowAssistantData,
  turns: AssistantTurn[],
  busy: boolean,
): AssistantViewModel {
  return {
    title: data.title,
    placeholder: data.placeholder,
    sendLabel: data.sendLabel,
    emptyHint: data.emptyHint,
    busy,
    turns,
  };
}

export function nextTurn(role: AssistantTurn["role"], speaker: string, text: string): AssistantTurn {
  sequence += 1;
  return { id: `turn_${sequence}`, role, speaker, text };
}
