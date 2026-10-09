import { heroHeadline } from "./XWFlowHero.logic";
import type { XWFlowHeroData } from "./XWFlowHero.types";

export interface HeroSlots {
  primary: HTMLElement;
  secondary: HTMLElement;
}

export function renderHero(container: HTMLElement, data: XWFlowHeroData): HeroSlots {
  const headline = heroHeadline(data);
  container.classList.add("xwflow-hero");
  container.replaceChildren();

  const chip = document.createElement("a");
  chip.className = "xwflow-hero__chip";
  chip.href = data.previewHref;
  const dot = document.createElement("span");
  dot.className = "xwflow-hero__dot";
  dot.setAttribute("aria-hidden", "true");
  const kicker = document.createElement("strong");
  kicker.textContent = data.kicker;
  const message = document.createElement("span");
  message.textContent = data.announcement;
  const preview = document.createElement("em");
  preview.textContent = data.previewLabel;
  chip.append(dot, kicker, message, preview);

  const title = document.createElement("h1");
  title.className = "xwflow-hero__title";
  const lead = document.createElement("span");
  lead.className = "xwflow-hero__lead";
  lead.textContent = headline.title;
  const accent = document.createElement("span");
  accent.className = "xwflow-hero__accent";
  accent.textContent = headline.accent;
  title.append(lead, accent);

  const lede = document.createElement("p");
  lede.className = "xwflow-hero__lede";
  lede.textContent = data.lede;

  const actions = document.createElement("div");
  actions.className = "xwflow-hero__actions";
  const primary = document.createElement("div");
  primary.className = "xwflow-cmd is-lime";
  const secondary = document.createElement("div");
  secondary.className = "xwflow-cmd is-outline";
  actions.append(primary, secondary);

  container.append(chip, title, lede, actions);
  return { primary, secondary };
}
