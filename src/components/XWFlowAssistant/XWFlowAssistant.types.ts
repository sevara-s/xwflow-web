export interface AssistantTurn {
  id: string;
  role: "user" | "assistant";
  speaker: string;
  text: string;
}

export interface XWFlowAssistantData {
  title: string;
  placeholder: string;
  sendLabel: string;
  emptyHint: string;
  youLabel: string;
  assistantLabel: string;
  onAsk: (instruction: string) => Promise<string>;
}

export interface AssistantViewModel {
  title: string;
  placeholder: string;
  sendLabel: string;
  emptyHint: string;
  busy: boolean;
  turns: AssistantTurn[];
}
