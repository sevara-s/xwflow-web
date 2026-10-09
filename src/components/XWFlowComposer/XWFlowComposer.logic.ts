import type { ComposerDraftModel, ComposerSample, XWFlowComposerData } from "./XWFlowComposer.types";

export function openingSample(data: XWFlowComposerData): ComposerSample {
  const first = data.samples[0];
  if (first) return first;
  return fallbackSample(data, "");
}

export function sampleForPrompt(data: XWFlowComposerData, prompt: string): ComposerSample {
  const text = prompt.trim();
  return data.samples.find((sample) => sample.prompt === text) ?? fallbackSample(data, text);
}

export function sampleById(data: XWFlowComposerData, id: string): ComposerSample {
  return data.samples.find((sample) => sample.id === id) ?? openingSample(data);
}

export function stepCountLabel(template: string, count: number): string {
  return template.replaceAll("{count}", String(count));
}

export function draftModel(
  data: XWFlowComposerData,
  sample: ComposerSample,
  shown: number,
): ComposerDraftModel {
  const steps = sample.steps.slice(0, shown);
  return {
    label: data.draftLabel,
    streamingLabel: data.streamingLabel,
    countLabel: stepCountLabel(data.stepsLabel, sample.steps.length),
    notice: sample.notice,
    showNotice: shown >= sample.steps.length && sample.steps.length > 0,
    steps,
  };
}

function fallbackSample(data: XWFlowComposerData, prompt: string): ComposerSample {
  const text = prompt.trim();
  const title = text ? trimTitle(text) : data.fallback.emptyTitle;
  return {
    id: "custom",
    prompt,
    notice: data.fallback.notice,
    steps: data.fallback.steps.map((step, index) =>
      index === data.fallback.promptStep ? { ...step, title } : { ...step },
    ),
  };
}

function trimTitle(text: string): string {
  if (text.length <= 42) return text;
  return `${text.slice(0, 42)}…`;
}
