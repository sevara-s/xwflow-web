/**
 * One process drawn in a standard notation: an ISO 5807 flowchart, swim
 * lanes, a BPMN 2.0 collaboration (an external pool, a pool with two
 * lanes, events, gateways, boundary errors and data stores) or a UML
 * sequence whose numbered rows can be chosen. The drawing is one SVG,
 * named by its title; colours come from the hue tokens. A simulation model
 * (Arena style) draws filled create, process, decide and dispose blocks with
 * branch shares, queues and live figures.
 */
import type { XWUIComponentStateSnapshot } from '../view';
import { h, type XWUIViewNode } from '../view';
import { branchRows, connector, extent, layout, LANE, type Box } from './XWFlowNotationDiagram.logic';
import type { XWFlowNotationDiagramConfig, XWFlowNotationDiagramData, XWFlowNotationEdge, XWFlowNotationHue, XWFlowNotationStep } from './XWFlowNotationDiagram.types';

export interface NotationDiagramViewContext {
  onSelect?: (id: string) => void;
}

export interface NotationDiagramView {
  data: XWFlowNotationDiagramData;
  config: XWFlowNotationDiagramConfig;
  classNames: string[];
  node: XWUIViewNode;
}

const ARROW = 'xwflow-notation-diagram-arrow';
const hue = (name: XWFlowNotationHue | undefined): string => `var(--xwui-hue-${name ?? 'violet'})`;
const INK = 'var(--notation-ink, var(--text-primary, #f5f5fa))';
const MUTED = 'var(--notation-muted, var(--text-secondary, #a9a9c2))';
const PANEL = 'var(--notation-panel, color-mix(in srgb, var(--bg-elevated, #141424) 96%, transparent))';
const LINE = 'var(--notation-line, rgba(255, 255, 255, 0.6))';
const FAINT = 'var(--notation-faint, rgba(255, 255, 255, 0.3))';

/** Collects SVG children with unique keys. */
class Canvas {
  readonly nodes: XWUIViewNode[] = [];
  private next = 0;

  private key(kind: string): string {
    this.next += 1;
    return `${kind}${this.next}`;
  }

  shape(tag: string, attrs: Record<string, string | number>, style: Record<string, string> = {}): void {
    this.nodes.push(h(tag, { key: this.key(tag), attrs: stringify(attrs), style }));
  }

  text(x: number, y: number, value: string, options: { anchor?: 'start' | 'middle' | 'end'; size?: number; fill?: string; weight?: number; rotate?: number; opacity?: number; spacing?: string } = {}): void {
    const attrs: Record<string, string | number> = { x, y, 'text-anchor': options.anchor ?? 'middle', 'font-size': options.size ?? 13, 'font-weight': options.weight ?? 700 };
    if (options.rotate !== undefined) attrs.transform = `rotate(${options.rotate} ${x} ${y})`;
    if (options.opacity !== undefined) attrs.opacity = options.opacity;
    if (options.spacing) attrs['letter-spacing'] = options.spacing;
    this.nodes.push(h('text', { key: this.key('text'), class: ['xwflow-notation-diagram__text'], attrs: stringify(attrs), style: { fill: options.fill ?? INK } }, value));
  }

  line(d: string, stroke = LINE, options: { dashed?: string; arrow?: boolean; width?: number } = {}): void {
    const attrs: Record<string, string | number> = { d, fill: 'none', 'stroke-width': options.width ?? 1.8 };
    if (options.arrow !== false) attrs['marker-end'] = `url(#${ARROW})`;
    if (options.dashed) attrs['stroke-dasharray'] = options.dashed;
    this.nodes.push(h('path', { key: this.key('line'), attrs: stringify(attrs), style: { stroke } }));
  }

  push(node: XWUIViewNode): void {
    this.nodes.push(node);
  }
}

function stringify(attrs: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(attrs).map(([name, value]) => [name, String(value)]));
}

const byId = (boxes: Box[]): Map<string, Box> => new Map(boxes.map((box) => [box.id, box]));

/** A loop back into the same step: down, round its start side and back in, e.g. a retry. */
export function selfLoop(box: Box): string {
  const bottom = box.y + box.h;
  return `M${box.x + box.w / 2} ${bottom} L${box.x + box.w / 2} ${bottom + 34} L${box.x - 24} ${bottom + 34} L${box.x - 24} ${box.y + box.h / 2} L${box.x - 6} ${box.y + box.h / 2}`;
}

function edges(canvas: Canvas, list: XWFlowNotationEdge[], boxes: Map<string, Box>): void {
  for (const edge of list) {
    const from = boxes.get(edge.from);
    const to = boxes.get(edge.to);
    if (!from || !to) continue;
    if (edge.from === edge.to) {
      canvas.line(selfLoop(from), hue('amber'), { dashed: '6 5' });
      if (edge.label) canvas.text(from.x + from.w / 2, from.y + from.h + 52, edge.label, { size: 12, fill: hue('amber') });
      continue;
    }
    canvas.line(connector(from, to), edge.dashed ? FAINT : LINE, { dashed: edge.dashed ? '6 6' : undefined });
    if (edge.label) canvas.text(from.x + from.w + 22, to.y + to.h / 2 - 8, edge.label, { size: 12, fill: edge.tone === 'yes' ? hue('lime') : MUTED });
  }
}

/* ---------------------------------------------------------------- flowchart (ISO 5807) */
function flowchart(canvas: Canvas, data: XWFlowNotationDiagramData): { width: number; height: number } {
  const steps = data.steps ?? [];
  const list = data.edges ?? [];
  const rows = branchRows(steps, list);
  const boxes = layout(steps, list, (step) => (rows.get(step.id) ?? 0) + 1, { x: 40, y: 50 }, FLOW);
  const map = byId(boxes);
  blockEdges(canvas, list, map, new Map(steps.map((step) => [step.id, step])));
  for (const step of steps) {
    const box = map.get(step.id);
    if (box) block(canvas, step, box);
  }
  return extent(boxes, 70);
}

/* ---------------------------------------------------------------- swim lanes */
function swimlane(canvas: Canvas, data: XWFlowNotationDiagramData): { width: number; height: number } {
  const steps = data.steps ?? [];
  const lanes = data.lanes ?? [];
  const laneOf = (step: XWFlowNotationStep): number => Math.max(0, lanes.findIndex((lane) => lane.id === step.lane));
  const boxes = layout(steps, data.edges ?? [], laneOf, { x: 200, y: 43 });
  const size = extent(boxes);
  const width = Math.max(size.width, 900);
  lanes.forEach((lane, index) => {
    const y = 10 + index * LANE;
    canvas.shape('rect', { x: 10, y, width: width - 20, height: LANE - 6, rx: 12 }, { fill: index % 2 ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.045)', stroke: 'rgba(255,255,255,.1)' });
    canvas.shape('rect', { x: 10, y, width: 6, height: LANE - 6, rx: 3 }, { fill: hue(lane.hue) });
    canvas.text(30, y + LANE / 2, lane.name.toUpperCase(), { anchor: 'start', fill: hue(lane.hue), size: 12, spacing: '0.12em' });
  });
  const map = byId(boxes);
  edges(canvas, data.edges ?? [], map);
  for (const step of steps) {
    const box = map.get(step.id);
    if (!box) continue;
    canvas.shape('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 12, 'stroke-width': 2, opacity: step.disabled ? 0.5 : 1 }, { fill: PANEL, stroke: hue(step.hue) });
    canvas.shape('rect', { x: box.x + 12, y: box.y - 1, width: box.w - 24, height: 2 }, { fill: hue(step.hue) });
    canvas.text(box.x + box.w / 2, box.y + box.h / 2 + 5, step.name);
  }
  return { width, height: Math.max(size.height, lanes.length * LANE + 20) };
}

/* ---------------------------------------------------------------- BPMN 2.0 collaboration */
function bpmn(canvas: Canvas, data: XWFlowNotationDiagramData): { width: number; height: number } {
  const steps = data.steps ?? [];
  const list = data.edges ?? [];
  const lanes = (data.lanes ?? []).slice(0, 2);
  const laneOf = (step: XWFlowNotationStep): number => (lanes[1] && step.lane === lanes[1].id ? 1 : 0);
  const boxes = layout(steps, list, laneOf, { x: 120, y: 190 });
  const size = extent(boxes, 80);
  const width = Math.max(size.width + 80, 1000);
  const poolTop = 130;
  const poolHeight = 2 * LANE + 20;
  if (data.external) {
    canvas.shape('rect', { x: 80, y: 20, width: width - 120, height: 60, rx: 4 }, { fill: 'rgba(255,255,255,.03)', stroke: FAINT });
    canvas.text(width / 2, 56, data.external.name, { size: 14 });
    if (data.external.note) canvas.text(width - 60, 56, data.external.note, { anchor: 'end', size: 11, fill: MUTED });
  }
  canvas.shape('rect', { x: 20, y: poolTop, width: width - 60, height: poolHeight, rx: 4 }, { fill: 'rgba(255,255,255,.02)', stroke: FAINT });
  canvas.line(`M60 ${poolTop} L60 ${poolTop + poolHeight} M60 ${poolTop + LANE + 10} L${width - 40} ${poolTop + LANE + 10}`, 'rgba(255,255,255,.2)', { arrow: false, width: 1 });
  canvas.text(40, poolTop + poolHeight / 2, data.title ?? '', { size: 12, rotate: -90 });
  lanes.forEach((lane, index) => canvas.text(74, poolTop + 10 + index * LANE + LANE / 2, lane.name, { size: 11, fill: hue(lane.hue), rotate: -90 }));
  const map = byId(boxes);
  edges(canvas, list, map);
  const first = steps[0] && map.get(steps[0].id);
  if (first && data.external) canvas.line(`M${first.x + first.w / 2} 80 L${first.x + first.w / 2} ${first.y - 4}`, FAINT, { dashed: '5 5' });
  steps.forEach((step, index) => {
    const box = map.get(step.id);
    if (!box) return;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    if (step.shape === 'terminal') {
      canvas.shape('circle', { cx, cy, r: 20, 'stroke-width': 2.5 }, { fill: PANEL, stroke: hue(step.hue) });
      canvas.shape('rect', { x: cx - 9, y: cy - 6, width: 18, height: 12, rx: 2, 'stroke-width': 1.5 }, { fill: 'none', stroke: hue(step.hue) });
      canvas.text(cx, cy + 40, step.name, { size: 12 });
    } else if (step.shape === 'decision') {
      canvas.shape('polygon', { points: `${cx},${cy - 26} ${cx + 26},${cy} ${cx},${cy + 26} ${cx - 26},${cy}`, 'stroke-width': 2.5 }, { fill: PANEL, stroke: hue(step.hue) });
      canvas.text(cx, cy + 6, '×', { size: 22, fill: hue(step.hue) });
      canvas.text(cx, cy - 36, step.name, { size: 12 });
    } else {
      canvas.shape('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 14, 'stroke-width': 2, opacity: step.disabled ? 0.55 : 1 }, { fill: PANEL, stroke: hue(step.hue) });
      canvas.text(cx, cy + 5, step.name);
      if (step.error) {
        const ex = box.x + box.w - 18;
        canvas.shape('circle', { cx: ex, cy: box.y + box.h, r: 11, 'stroke-width': 2 }, { fill: PANEL, stroke: hue('red') });
        canvas.text(ex, box.y + box.h + 4, 'ϟ', { size: 11, fill: hue('red') });
        canvas.line(`M${ex} ${box.y + box.h + 11} L${ex} ${box.y + box.h + 50} L${box.x + box.w + 22} ${box.y + box.h + 50}`, hue('red'));
        canvas.text(box.x + box.w + 30, box.y + box.h + 54, step.error, { anchor: 'start', size: 12, fill: hue('red') });
      }
      if (step.store) {
        const dy = box.y + box.h + 40;
        canvas.shape('path', { d: `M${cx - 18} ${dy} Q ${cx} ${dy - 8}, ${cx + 18} ${dy} L${cx + 18} ${dy + 26} Q ${cx} ${dy + 34}, ${cx - 18} ${dy + 26} Z`, 'stroke-width': 1.5 }, { fill: 'rgba(200,255,61,.08)', stroke: hue('lime') });
        canvas.line(`M${cx} ${box.y + box.h} L${cx} ${dy - 6}`, FAINT, { dashed: '4 4' });
        canvas.text(cx, dy + 50, step.store, { size: 11, fill: MUTED });
      }
    }
    if (index === steps.length - 1) {
      const endX = box.x + box.w + 70;
      canvas.shape('circle', { cx: endX, cy, r: 18, 'stroke-width': 4 }, { fill: PANEL, stroke: INK });
      canvas.line(`M${box.x + box.w} ${cy} L${endX - 22} ${cy}`);
    }
  });
  return { width, height: Math.max(size.height + 60, poolTop + poolHeight + 20) };
}

/* ---------------------------------------------------------------- simulation model (Arena style) */
/** Ink that reads on a filled block of this hue. */
const inkOn = (name: XWFlowNotationHue): string => (['violet', 'blue', 'red'].includes(name) ? '#ffffff' : '#0a0a0a');
const SIM = { column: 280, lane: 190, w: 206, h: 92 };
const FLOW = { column: 220, lane: 170, w: 172, h: 72 };

/**
 * Connectors between filled blocks: straight, elbowed, down a column, or out
 * of a decision's top or bottom point; a loop back into a step for a retry.
 */
function blockEdges(canvas: Canvas, list: XWFlowNotationEdge[], map: Map<string, Box>, stepOf: Map<string, XWFlowNotationStep>): void {
  for (const edge of list) {
    const from = map.get(edge.from);
    const to = map.get(edge.to);
    if (!from || !to) continue;
    if (edge.from === edge.to) {
      canvas.line(selfLoop(from), hue('amber'), { dashed: '6 5', width: 2 });
      if (edge.label) canvas.text(from.x + from.w / 2, from.y + from.h + 52, edge.label, { size: 12, fill: hue('amber') });
      continue;
    }
    const decision = stepOf.get(edge.from)?.shape === 'decision';
    const fx = from.x + from.w / 2;
    const tyMid = to.y + to.h / 2;
    let d: string;
    if (Math.abs(from.x - to.x) < 1) d = `M${fx} ${from.y + from.h} L${fx} ${to.y - 6}`;
    else if (decision && Math.abs(tyMid - (from.y + from.h / 2)) > 1) {
      const vy = tyMid < from.y ? from.y - 6 : from.y + from.h + 6;
      d = `M${fx} ${vy} L${fx} ${tyMid} L${to.x - 6} ${tyMid}`;
    } else d = connector(from, to);
    canvas.line(d, LINE, { dashed: edge.dashed ? '6 6' : undefined, width: 2 });
    if (edge.label) {
      const lx = decision ? fx + 18 : from.x + from.w + 18;
      const ly = decision ? tyMid + (tyMid < from.y ? -14 : 24) : tyMid - 10;
      canvas.text(lx, ly, edge.label, { anchor: 'start', size: 13, fill: edge.tone === 'yes' ? hue('lime') : MUTED });
    }
  }
}

/** A filled block with its name (and subtitle) in readable ink. */
function block(canvas: Canvas, step: XWFlowNotationStep, box: Box): void {
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const fill = { fill: hue(step.hue), stroke: 'none' };
  const nudge = step.shape === 'create' ? -14 : step.shape === 'dispose' ? 14 : 0;
  if (step.shape === 'create') canvas.shape('polygon', { points: `${x},${y} ${x + w - 36},${y} ${x + w},${cy} ${x + w - 36},${y + h} ${x},${y + h}` }, fill);
  else if (step.shape === 'dispose') canvas.shape('polygon', { points: `${x + 36},${y} ${x + w},${y} ${x + w},${y + h} ${x + 36},${y + h} ${x},${cy}`, 'stroke-width': 2 }, { fill: PANEL, stroke: hue(step.hue) });
  else if (step.shape === 'decision') canvas.shape('polygon', { points: `${cx},${y - 14} ${x + w - 14},${cy} ${cx},${y + h + 14} ${x + 14},${cy}` }, fill);
  else if (step.shape === 'terminal') canvas.shape('rect', { x, y: y + 4, width: w, height: h - 8, rx: (h - 8) / 2 }, fill);
  else if (step.shape === 'io') canvas.shape('polygon', { points: `${x + 18},${y} ${x + w},${y} ${x + w - 18},${y + h} ${x},${y + h}` }, fill);
  else if (step.shape === 'store') canvas.shape('path', { d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h - 8} Q ${x + w * 0.75} ${y + h - 20}, ${cx} ${y + h - 6} T ${x} ${y + h - 4} Z` }, fill);
  else {
    canvas.shape('rect', { x, y, width: w, height: h, rx: 4, opacity: step.disabled ? 0.5 : 1 }, fill);
    if (step.shape === 'call') canvas.line(`M${x + 10} ${y} L${x + 10} ${y + h} M${x + w - 10} ${y} L${x + w - 10} ${y + h}`, 'rgba(0,0,0,.45)', { arrow: false, width: 2 });
  }
  const ink = step.shape === 'dispose' ? INK : inkOn(step.hue);
  canvas.text(cx + nudge, cy + (step.subtitle ? 0 : 6), step.name, { size: 16, fill: ink, weight: 800 });
  if (step.subtitle) canvas.text(cx + nudge, cy + 21, step.subtitle, { size: 12, fill: step.shape === 'dispose' ? MUTED : ink, weight: 700 });
}


function simulation(canvas: Canvas, data: XWFlowNotationDiagramData): { width: number; height: number } {
  const steps = data.steps ?? [];
  const list = data.edges ?? [];
  const rows = branchRows(steps, list);
  const boxes = layout(steps, list, (step) => (rows.get(step.id) ?? 0) + 1, { x: 60, y: 30 }, SIM);
  const map = byId(boxes);
  const stepOf = new Map(steps.map((step) => [step.id, step]));
  blockEdges(canvas, list, map, stepOf);
  for (const step of steps) {
    const box = map.get(step.id);
    if (!box) continue;
    const { x, y, w, h } = box;
    const cx = x + w / 2;
    block(canvas, step, box);
    if (step.stat) canvas.text(cx, y + h + 40, step.stat, { size: 15, fill: hue('cyan'), weight: 700 });
    const waiting = Math.min(5, Math.max(0, step.queue ?? 0));
    if (step.queue !== undefined) {
      for (let index = 0; index < waiting; index += 1) canvas.shape('circle', { cx: x + 26 + index * 22, cy: y - 34, r: 8 }, { fill: hue('cyan') });
      canvas.line(`M${x + 10} ${y - 20} L${x + w - 10} ${y - 20}`, FAINT, { arrow: false, width: 2 });
      if (data.labels?.queue) canvas.text(x + w - 14, y - 30, data.labels.queue, { anchor: 'end', size: 11, fill: MUTED });
    }
  }
  const size = extent(boxes, 80);
  return { width: size.width, height: size.height + 30 };
}

/* ---------------------------------------------------------------- UML sequence */
function sequence(canvas: Canvas, data: XWFlowNotationDiagramData, onSelect?: (id: string) => void): { width: number; height: number } {
  const lanes = data.lanes ?? [];
  const messages = data.messages ?? [];
  const lifeline = new Map(lanes.map((lane, index) => [lane.id, 220 + index * 200]));
  const actorX = lifeline.get(data.actor ?? '') ?? 220;
  const top = 30;
  const rowHeight = (failed?: boolean): number => (failed ? 110 : 78);
  const height = 140 + messages.reduce((sum, message) => sum + rowHeight(message.failed), 0);
  for (const lane of lanes) {
    const x = lifeline.get(lane.id) ?? 0;
    canvas.shape('rect', { x: x - 70, y: top, width: 140, height: 40, rx: 8, opacity: 0.95 }, { fill: hue(lane.hue) });
    canvas.text(x, top + 26, lane.name, { fill: '#0a0a0a', size: 13 });
    canvas.line(`M${x} ${top + 40} L${x} ${height}`, 'rgba(255,255,255,.25)', { arrow: false, dashed: '4 6', width: 1 });
  }
  if (lanes.length) canvas.shape('rect', { x: actorX - 6, y: top + 70, width: 12, height: Math.max(0, height - top - 90), rx: 3, opacity: 0.85 }, { fill: hue(lanes.find((lane) => lane.id === data.actor)?.hue) });
  const right = Math.max(actorX, ...lifeline.values());
  let y = top + 90;
  const rows: Array<{ id: string; y: number; index: number; failed: boolean; hue: XWFlowNotationHue; label: string }> = [];
  messages.forEach((message, index) => {
    rows.push({ id: message.id, y, index, failed: !!message.failed, hue: message.hue, label: message.label });
    const target = lifeline.get(message.lane ?? '') ?? actorX;
    if (message.kind === 'in') {
      canvas.line(`M${target} ${y} L${actorX - 8} ${y}`);
      canvas.text((actorX + target) / 2, y - 8, message.label, { size: 12 });
    } else if (message.kind === 'skip') {
      canvas.line(`M${actorX + 8} ${y} L${target - 8} ${y}`, 'rgba(255,255,255,.25)', { dashed: '3 6' });
      canvas.text((actorX + target) / 2, y - 8, message.label, { size: 12, fill: MUTED });
    } else if (message.kind === 'branch') {
      canvas.shape('rect', { x: actorX - 40, y: y - 26, width: right - actorX + 100, height: 52, rx: 6 }, { fill: 'rgba(200,255,61,.04)', stroke: hue('lime') });
      canvas.text(actorX - 30, y - 12, data.labels?.alt ?? 'alt', { anchor: 'start', size: 11, fill: hue('lime') });
      canvas.text(actorX + 14, y + 6, message.label, { anchor: 'start', size: 12, fill: hue('lime') });
    } else if (message.kind === 'note') {
      canvas.text(actorX + 20, y + 4, message.label, { anchor: 'start', size: 12, fill: MUTED });
    } else {
      canvas.line(`M${actorX + 8} ${y - 10} L${target - 8} ${y - 10}`);
      canvas.text((actorX + target) / 2, y - 16, message.label, { size: 12 });
      canvas.shape('rect', { x: target - 6, y: y - 14, width: 12, height: 28, rx: 3 }, { fill: hue(message.hue) });
      canvas.line(`M${target - 8} ${y + 12} L${actorX + 8} ${y + 12}`, message.failed ? hue('red') : hue('green'), { dashed: '6 5' });
      if (message.reply) canvas.text((actorX + target) / 2, y + 28, message.reply, { size: 12, fill: message.failed ? hue('red') : hue('green') });
      if (message.failed && message.retry) {
        canvas.line(`M${actorX + 8} ${y + 40} L${actorX + 46} ${y + 40} L${actorX + 46} ${y + 58} L${actorX + 10} ${y + 58}`, hue('amber'), { width: 1.6 });
        canvas.text(actorX + 54, y + 54, message.retry, { anchor: 'start', size: 11, fill: hue('amber') });
      }
    }
    y += rowHeight(message.failed);
  });
  for (const row of rows) {
    const selected = data.selectedMessage === row.id;
    const choose = (): void => onSelect?.(row.id);
    canvas.push(
      h(
        'g',
        {
          key: `dot-${row.id}`,
          class: ['xwflow-notation-diagram__dot', selected ? 'is-selected' : null],
          attrs: { tabindex: '0', role: 'button', 'aria-label': `${row.index + 1}. ${row.label}`, 'aria-pressed': selected ? 'true' : 'false' },
          events: onSelect
            ? {
                click: choose,
                keydown: (event: Event) => {
                  const key = (event as KeyboardEvent).key;
                  if (key === 'Enter' || key === ' ') {
                    event.preventDefault();
                    choose();
                  }
                },
              }
            : undefined,
        },
        h('circle', { key: 'c', attrs: { cx: '60', cy: String(row.y), r: selected ? '15' : '12', 'stroke-width': '2' }, style: { fill: row.failed ? hue('red') : hue(row.hue), stroke: selected ? '#fff' : 'none' } }),
        h('text', { key: 't', attrs: { x: '60', y: String(row.y + 4), 'text-anchor': 'middle', 'font-size': '11', 'font-weight': '800' }, style: { fill: '#0a0a0a' } }, String(row.index + 1)),
      ),
    );
  }
  return { width: 220 + lanes.length * 200, height };
}

export function projectNotationDiagramView(snapshot: XWUIComponentStateSnapshot<XWFlowNotationDiagramData, XWFlowNotationDiagramConfig>, context: NotationDiagramViewContext = {}): NotationDiagramView {
  const { data, config } = snapshot;
  const mode = config.mode ?? 'flowchart';
  const classNames = ['xwflow-notation-diagram', `xwflow-notation-diagram--${mode}`];
  if (config.className) classNames.push(config.className);
  const canvas = new Canvas();
  const size =
    mode === 'swimlane' ? swimlane(canvas, data) : mode === 'bpmn' ? bpmn(canvas, data) : mode === 'sequence' ? sequence(canvas, data, context.onSelect) : mode === 'simulation' ? simulation(canvas, data) : flowchart(canvas, data);
  const defs = h(
    'defs',
    { key: 'defs' },
    h(
      'marker',
      { key: 'arrow', attrs: { id: ARROW, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' } },
      h('path', { key: 'tip', attrs: { d: 'M0 0 L10 5 L0 10 z' }, style: { fill: 'rgba(255,255,255,.75)' } }),
    ),
  );
  const node = h(
    'div',
    { class: classNames },
    h(
      'svg',
      {
        key: 'svg',
        attrs: { role: 'img', 'aria-label': data.title ?? '', viewBox: `0 0 ${size.width} ${size.height}`, width: String(size.width), height: String(size.height), preserveAspectRatio: 'xMidYMin meet' },
      },
      defs,
      ...canvas.nodes,
    ),
  );
  return { data, config, classNames, node };
}
