/**
 * A layer stack: panels laid on glowing, tilted planes stacked in 3D, the
 * first lowest, each named by a label with a line in its hue on the end
 * side. On a narrow screen the planes lie flat in a column under their
 * labels.
 */
import type { XWUIComponentStateSnapshot } from '../view';
import { h, type XWUIViewNode } from '../view';
import type { XWFlowLayerStackConfig, XWFlowLayerStackData } from './XWFlowLayerStack.types';

export interface LayerStackViewContext {
  panelRef?: (index: number) => XWUIViewNode['ref'];
}

export interface LayerStackView {
  data: XWFlowLayerStackData;
  config: XWFlowLayerStackConfig;
  classNames: string[];
  node: XWUIViewNode;
}

/** Height of each layer (bottom first) and where its label sits, top to bottom on screen. */
export function layerPlaces(count: number, spacing: number, labelTop = 120, labelStep = 130): Array<{ z: number; labelTop: number; labelEnd: number }> {
  return Array.from({ length: count }, (_, index) => {
    const fromTop = count - 1 - index;
    return { z: index * spacing, labelTop: labelTop + fromTop * labelStep, labelEnd: 12 - fromTop * 3 };
  });
}

export function projectLayerStackView(snapshot: XWUIComponentStateSnapshot<XWFlowLayerStackData, XWFlowLayerStackConfig>, context: LayerStackViewContext = {}): LayerStackView {
  const { data, config } = snapshot;
  const layers = data.layers ?? [];
  const spacing = config.spacing ?? 150;
  const places = layerPlaces(layers.length, spacing);
  const classNames = ['xwflow-layer-stack'];
  if (config.className) classNames.push(config.className);
  const style: Record<string, string> = {
    '--layer-stack-tilt-x': `${config.tiltX ?? 60}deg`,
    '--layer-stack-tilt-z': `${config.tiltZ ?? -34}deg`,
    '--layer-stack-width': `${config.width ?? 600}px`,
    '--layer-stack-height': `${config.height ?? 320}px`,
    '--layer-stack-view-height': `${config.viewHeight ?? 600}px`,
  };
  const node = h(
    'div',
    { class: classNames, style, attrs: { role: data.label ? 'img' : undefined, 'aria-label': data.label } },
    ...layers.map((layer, index) =>
      h('div', {
        key: `l${index}`,
        class: ['xwflow-layer-stack__layer', `xwflow-layer-stack--${layer.hue ?? 'violet'}`],
        style: { '--layer-stack-z': `${places[index].z}px`, zIndex: String(index + 1) },
        hostOwned: true,
        ref: context.panelRef?.(index),
      }),
    ),
    ...layers.map((layer, index) =>
      h(
        'span',
        {
          key: `t${index}`,
          class: ['xwflow-layer-stack__label', `xwflow-layer-stack--${layer.hue ?? 'violet'}`],
          style: { top: `${places[index].labelTop}px`, insetInlineEnd: `${places[index].labelEnd}%` },
        },
        layer.label,
      ),
    ),
  );
  return { data, config, classNames, node };
}
