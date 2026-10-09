import { XWUIComponent } from "../../xwui";
import "./XWFlowAssistant.css";
import { createAssistantState, nextTurn, toViewModel } from "./XWFlowAssistant.logic";
import type { AssistantTurn, XWFlowAssistantData } from "./XWFlowAssistant.types";
import { renderAssistant, type AssistantViewHandles } from "./XWFlowAssistant.view";

export class XWFlowAssistant extends XWUIComponent {
  static componentName = "XWFlowAssistant";

  private source!: XWFlowAssistantData;
  private turns: AssistantTurn[] = [];
  private busy = false;
  private view?: AssistantViewHandles;

  constructor(container: HTMLElement, data: XWFlowAssistantData) {
    super(container, data);
    const initial = createAssistantState(data);
    this.source = initial.data;
    this.turns = initial.turns;
    this.busy = initial.busy;
    this.paint();
  }

  private paint(): void {
    this.view?.destroy();
    this.view = renderAssistant(
      this.container,
      toViewModel(this.source, this.turns, this.busy),
      { onSubmit: () => void this.submit() },
    );
  }

  private async submit(): Promise<void> {
    if (this.busy || !this.view) return;
    const instruction = this.view.readInstruction().trim();
    if (!instruction) return;
    this.turns = [...this.turns, nextTurn("user", this.source.youLabel, instruction)];
    this.busy = true;
    this.paint();
    try {
      const text = await this.source.onAsk(instruction);
      this.turns = [...this.turns, nextTurn("assistant", this.source.assistantLabel, text)];
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      this.turns = [...this.turns, nextTurn("assistant", this.source.assistantLabel, message)];
    } finally {
      this.busy = false;
      this.paint();
    }
  }

  override destroy(): void {
    this.view?.destroy();
    super.destroy();
  }
}
