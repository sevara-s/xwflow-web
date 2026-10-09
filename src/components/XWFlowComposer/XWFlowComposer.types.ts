export interface ComposerStep {
  title: string;
  detail: string;
  icon: string;
  tone: string;
  mark: string;
  markLabel?: string;
  markIcon?: string;
}

export interface ComposerFallback {
  emptyTitle: string;
  notice: string;
  promptStep: number;
  steps: readonly ComposerStep[];
}

export interface ComposerSample {
  id: string;
  prompt: string;
  notice: string;
  steps: readonly ComposerStep[];
}

export interface ComposerSuggestion {
  id: string;
  label: string;
}

export interface XWFlowComposerData {
  title: string;
  accent: string;
  close: string;
  lede: string;
  promptLabel: string;
  scopeLabel: string;
  buildLabel: string;
  buildArrow: string;
  draftLabel: string;
  streamingLabel: string;
  stepsLabel: string;
  suggestionsLabel: string;
  suggestions: readonly ComposerSuggestion[];
  samples: readonly ComposerSample[];
  fallback: ComposerFallback;
}

export interface ComposerDraftModel {
  label: string;
  streamingLabel: string;
  countLabel: string;
  notice: string;
  showNotice: boolean;
  steps: ComposerStep[];
}
