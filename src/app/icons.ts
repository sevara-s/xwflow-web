const markup: Record<string, string> = {
  search: `<circle cx="11" cy="11" r="6"></circle><path d="M16 16l4 4"></path>`,
  panel: `<rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M10 5v14"></path>`,
  plus: `<path d="M12 6v12M6 12h12"></path>`,
  spark: `<path d="M12 3l1.2 4.2L17 8.5l-3.8 1.3L12 14l-1.2-4.2L7 8.5l3.8-1.3L12 3z"></path>`,
  chevron: `<path d="M7 10l5 5 5-5"></path>`,
  assistant: `<path d="M12 3l1.3 3.8L17 8.2l-3.7 1.2L12 13l-1.3-3.6L7 8.2l3.7-1.4L12 3z"></path><path d="M17.5 15v4M15.5 17h4"></path>`,
  grid: `<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"></rect><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"></rect><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"></rect><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"></rect>`,
  chat: `<path d="M7 17l-2 3.5 4.2-1.6H16a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v5.2A4 4 0 0 0 7 17z"></path>`,
  shield: `<path d="M12 3.5l7 2.8v5.4c0 4.2-2.8 7-7 8.8-4.2-1.8-7-4.6-7-8.8V6.3l7-2.8z"></path>`,
  layout: `<rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 9h16M10 9v11"></path>`,
  chart: `<path d="M5 19V10M12 19V5M19 19v-7"></path>`,
  sliders: `<path d="M4 8h16M4 16h16"></path><circle cx="9" cy="8" r="2"></circle><circle cx="15" cy="16" r="2"></circle>`,
  warning: `<path d="M12 4.5l7.5 13h-15L12 4.5z"></path><path d="M12 10v3.5"></path><circle cx="12" cy="16.2" r="0.6" fill="currentColor" stroke="none"></circle>`,
  play: `<path d="M9 7.2l7.2 4.8L9 16.8V7.2z"></path>`,
};

export function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("xwflow-ico");
  svg.innerHTML = markup[name] ?? "";
  return svg;
}
