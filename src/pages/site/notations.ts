import { api } from "../../api/client";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { href, notationViews, paths, type NotationView } from "../../app/router";
import type { ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Notation, NotationFamily, NotationGallery, NotationViewId, StepGroup } from "../../types/domain";
import { hueOf } from "../../ui/flow";
import { band, centred, eyebrow, glass, grid, headline, iconTile, measure, row, shape, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";

const words = catalog.site.notations;

/** Where a notation's "Open view" goes: the editor, a notation view, or the run receipt. */
function viewHref(view: NotationViewId, sample: NotationGallery["sample"]): string {
  if (view === "editor") return href(paths.flow(sample.flowId));
  if (view === "receipt") return sample.runId ? href(paths.run(sample.runId)) : href(paths.runs);
  return (notationViews as readonly string[]).includes(view) ? href(paths.flowView(sample.flowId, view as NotationView)) : href(paths.flow(sample.flowId));
}

function thumb(notation: string, sample: NotationGallery["sample"], label: string): Node {
  return {
    tag: "xwui-notation-thumb",
    data: {
      notation,
      label,
      steps: sample.steps.map((step) => ({ name: step.name, hue: hueOf[step.group as StepGroup] })),
      lanes: [...words.thumbLanes],
      actors: [...words.thumbActors],
    },
  };
}

function card(notation: Notation, sample: NotationGallery["sample"]): Node {
  const open = notation.view
    ? [{ ...tag(words.open, "cyan"), on: { click: () => (window.location.hash = viewHref(notation.view as NotationViewId, sample)) } }]
    : notation.concept
      ? [tag(words.concept, "plan")]
      : [];
  return glass(
    stack(
      [
        thumb(notation.id, sample, `${notation.name}: ${notation.summary}`),
        row([text("h4", notation.name), tag(notation.dims, "lime")], { justify: "space-between" }),
        text("xs", notation.standard, { mono: true, tone: "tertiary" }),
        text("small", notation.summary, { tone: "secondary" }),
        row([...notation.tags.map((label) => tag(label)), ...open], { wrap: true }),
      ],
      { gap: 10 },
    ),
    { pad: "s" },
  );
}

export async function view(context: ViewContext): Promise<Node[]> {
  const gallery = await api.getNotations();
  const sample = gallery.sample;

  const modes: Node = {
    tag: "xwui-segmented-control",
    data: { value: words.modes[0].id },
    config: { options: words.modes.map((mode) => ({ value: mode.id, label: mode.label })), ariaLabel: words.modeLabel },
    ref: (instance) =>
      (instance as { onChange(handler: (value: string | number) => void): void }).onChange((value) => {
        const mode = words.modes.find((item) => item.id === value);
        if (mode?.view) window.location.hash = viewHref(mode.view as NotationViewId, sample);
        else if (mode) notify(fill(words.conceptNote, { name: mode.label }), "info");
      }),
  };
  const layerHues: Hue[] = ["lime", "orange", "cyan"];
  const layers = row(
    ["node-graph", "bpmn", "flowchart"].map((kind, index) =>
      stack([tag(words.layers[index], layerHues[index]), glass(thumb(kind, sample, words.layers[index]), { pad: "none" })], { gap: 8 }),
    ),
    { gap: 20, wrap: true, justify: "center" },
  );

  const hero: Node = {
    tag: "xwui-box",
    key: "band-hero",
    config: { as: "section", position: "relative", padding: "80px 0 40px" },
    slots: {
      children: stack(
        [
          shape("halo", "violet", 520, { left: "-60px", top: "-80px" }),
          shape("halo", "pink", 460, { right: "-60px", top: "120px" }),
          {
            tag: "xwui-container",
            config: { maxWidth: 1280, center: true, padding: "0 24px" },
            slots: {
              children: stack(
                [
                  centred(row(words.tags.map((item) => tag(fill(item.label, { n: gallery.total }), item.color as Hue)))),
                  headline("mega", words.title, words.titleHighlight, "center"),
                  measure(text("lead", words.lead, { align: "center" })),
                  centred(modes),
                  layers,
                ],
                { gap: 24, align: "stretch" },
              ),
            },
          },
        ],
        { gap: 0 },
      ),
    },
  };

  const modeTiles = words.modes.map((mode) => {
    const tile = glass(
      stack([row([iconTile(mode.icon, hueOf[mode.group as StepGroup] ?? "cyan"), text("body", mode.label, { bold: true })], { gap: 12 }), text("small", mode.body, { tone: "secondary" })], {
        gap: 12,
      }),
      { pad: "m" },
    );
    return mode.view ? { ...tile, on: { click: () => (window.location.hash = viewHref(mode.view as NotationViewId, sample)) } } : tile;
  });

  const families: Node = {
    tag: "xwui-tabs",
    data: { tabs: words.families.map((item) => ({ id: item.id || "all", label: item.label })), activeTab: "all" },
    config: { variant: "button", size: "sm", ariaLabel: words.familiesLabel, hideContent: "true" },
    ref: (instance) =>
      (instance as { onChange(handler: (id: string) => void): void }).onChange(async (id) => {
        const next = await api.getNotations({ family: id === "all" ? "" : (id as NotationFamily) });
        context.instance<XWUIComposer>("notation-gallery")?.setTree(grid(next.items.map((item) => card(item, next.sample)), 300));
      }),
  };

  return [
    hero,
    band("modes", [stack([eyebrow(words.modesEyebrow), headline("h2", words.modesTitle, `${words.modesHighlight} ${words.modesTail}`)], { gap: 8 }), grid(modeTiles, 220)], {
      tight: true,
      gap: 24,
    }),
    band(
      "gallery",
      [
        row([stack([eyebrow(words.galleryEyebrow), headline("h2", words.galleryTitle, words.galleryHighlight)], { gap: 12 }), families], { gap: 24, wrap: true, justify: "space-between", align: "flex-end" }),
        { tag: "xwui-composer", key: "notation-gallery", data: { tree: grid(gallery.items.map((item) => card(item, sample)), 300) } },
      ],
      { gap: 24 },
    ),
  ];
}
