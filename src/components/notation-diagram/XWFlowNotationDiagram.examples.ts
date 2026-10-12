/**
 * XWFlowNotationDiagram examples: one per mode, the way XWUI ships examples
 * with each component. The docs show them and the tests render every one.
 */
import type { XWFlowNotationDiagramConfig, XWFlowNotationDiagramData } from './XWFlowNotationDiagram.types';

export interface XWFlowNotationDiagramExample {
  name: string;
  description: string;
  data: XWFlowNotationDiagramData;
  config: XWFlowNotationDiagramConfig;
}

const steps: XWFlowNotationDiagramData['steps'] = [
  { id: 'start', name: 'Start', shape: 'terminal', hue: 'lime' },
  { id: 'order', name: 'New order', shape: 'io', hue: 'lime', lane: 'automation' },
  { id: 'lookup', name: 'Look up customer', shape: 'call', hue: 'cyan', lane: 'automation' },
  { id: 'over', name: 'Over 500?', shape: 'decision', hue: 'orange', lane: 'automation' },
  { id: 'notify', name: 'Notify sales', shape: 'process', hue: 'pink', lane: 'sales' },
  { id: 'log', name: 'Log order', shape: 'store', hue: 'violet', lane: 'automation' },
  { id: 'end', name: 'End', shape: 'terminal', hue: 'lime' },
];

const edges: XWFlowNotationDiagramData['edges'] = [
  { from: 'start', to: 'order' },
  { from: 'order', to: 'lookup' },
  { from: 'lookup', to: 'lookup', label: 'retry, wait 1 s', dashed: true },
  { from: 'lookup', to: 'over' },
  { from: 'over', to: 'notify', label: 'yes', tone: 'yes' },
  { from: 'over', to: 'log', label: 'no', tone: 'no' },
  { from: 'notify', to: 'end' },
  { from: 'log', to: 'end' },
];

const lanes: XWFlowNotationDiagramData['lanes'] = [
  { id: 'automation', name: 'Automation', hue: 'violet' },
  { id: 'sales', name: 'Sales chat', hue: 'pink' },
];

export const examples: XWFlowNotationDiagramExample[] = [
  {
    name: 'Flowchart',
    description: 'ISO 5807 symbols: terminators, input, a predefined process with its retry loop, a decision and its two branches.',
    data: { title: 'Order alert: flowchart', steps, edges },
    config: { mode: 'flowchart' },
  },
  {
    name: 'Swimlanes',
    description: 'The same steps placed in the lane of the system that runs them.',
    data: { title: 'Order alert: swimlanes', steps: steps.filter((step) => step.lane), edges: edges.filter((edge) => edge.from !== 'start' && edge.to !== 'end'), lanes },
    config: { mode: 'swimlane' },
  },
  {
    name: 'BPMN 2.0',
    description: 'Events, tasks and an exclusive gateway in a pool with lanes, and the external shop as a collapsed pool.',
    data: { title: 'Order alert', steps: steps.filter((step) => step.lane), edges: edges.filter((edge) => edge.from !== 'start' && edge.to !== 'end'), lanes, external: { name: 'Shop', note: 'black box pool' } },
    config: { mode: 'bpmn' },
  },
  {
    name: 'Sequence',
    description: 'Numbered messages between the engine and the systems it calls, with a failed call, its retry and an alt frame. Rows can be chosen.',
    data: {
      title: 'Order alert: sequence',
      lanes: [{ id: 'shop', name: 'Shop', hue: 'lime' }, { id: 'engine', name: 'xwflow', hue: 'violet' }, { id: 'crm', name: 'Customer API', hue: 'cyan' }],
      actor: 'engine',
      messages: [
        { id: 'm1', kind: 'in', label: 'POST /orders', lane: 'shop', hue: 'lime' },
        { id: 'm2', kind: 'call', label: 'GET /customers/42', lane: 'crm', reply: '503', failed: true, hue: 'cyan' },
        { id: 'm3', kind: 'call', label: 'GET /customers/42', lane: 'crm', reply: '200 OK', hue: 'cyan' },
        { id: 'm4', kind: 'branch', label: 'total > 500', hue: 'orange' },
      ],
      labels: { alt: 'alt' },
    },
    config: { mode: 'sequence' },
  },
  {
    name: 'Simulation',
    description: 'The filled block notation: entities created, queued in front of a process with its workers, decided, logged and disposed, with live figures.',
    data: {
      title: 'Sample model',
      labels: { queue: 'queue' },
      steps: [
        { id: 'arrive', name: 'Orders arrive', subtitle: 'Create', shape: 'create', hue: 'lime', stat: '281' },
        { id: 'lookup', name: 'Look up customer', subtitle: 'Process, 4 workers', shape: 'process', hue: 'cyan', stat: '267 out, 14 waiting', queue: 14 },
        { id: 'decide', name: 'Total > 500?', shape: 'decision', hue: 'orange' },
        { id: 'alert', name: 'Notify sales', subtitle: 'Process', shape: 'process', hue: 'pink', stat: '67', col: 3, row: 0 },
        { id: 'log', name: 'Log order', subtitle: 'Process', shape: 'process', hue: 'violet', stat: '263', col: 3, row: 2 },
        { id: 'done', name: 'Done', subtitle: 'Dispose', shape: 'dispose', hue: 'violet', stat: '263', col: 4, row: 2 },
      ],
      edges: [
        { from: 'arrive', to: 'lookup' },
        { from: 'lookup', to: 'decide' },
        { from: 'decide', to: 'alert', label: 'True 32%', tone: 'yes' },
        { from: 'decide', to: 'log', label: 'False 68%', tone: 'no' },
        { from: 'alert', to: 'log' },
        { from: 'log', to: 'done' },
      ],
    },
    config: { mode: 'simulation' },
  },
];
