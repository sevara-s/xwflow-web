import { addStep, askAssistant, getProcess, publishProcess, removeStep, startRun, updateStep } from "../api/client";
import { formatVersion, formatWhen } from "../app/format";
import { MountScope } from "../app/mount";
import { errorMessage, notify } from "../app/notify";
import { href, navigate, runPath } from "../app/router";
import { XWFlowAssistant } from "../components/XWFlowAssistant";
import { XWFlowCanvas } from "../components/XWFlowCanvas";
import { catalog } from "../content/catalog";
import type { ProcessDetail, ProcessStep, StepKind } from "../types/domain";
import {
  XWUIAlert,
  XWUIBreadcrumbs,
  XWUIButton,
  XWUICard,
  XWUIDataTable,
  XWUIDialog,
  XWUIEmpty,
  XWUIInputText,
  XWUIInputTextarea,
  XWUIPageHeader,
  XWUISelect,
  XWUITabs,
} from "../xwui";

const stepKinds = Object.keys(catalog.stepKinds) as StepKind[];

export async function renderProcess(slot: HTMLElement, scope: MountScope, processId: string): Promise<void> {
  let process = await getProcess(processId);
  let selectedId: string | null = process.draft[0]?.id ?? null;
  let viewingVersionId: string | null = null;

  slot.replaceChildren();
  const crumbs = scope.host();
  const header = scope.host();
  const tabsHost = scope.host();
  const definition = scope.host("xwflow-panel");
  const versions = scope.host("xwflow-panel");
  const assistant = scope.host();
  slot.append(crumbs, header, tabsHost);

  scope.track(
    new XWUIBreadcrumbs(crumbs, {
      items: [
        { label: catalog.process.back, href: href(catalog.paths.processes) },
        { label: process.name },
      ],
    }),
  );
  scope.track(
    new XWUIPageHeader(header, {
      title: process.name,
      subtitle: process.description,
    }),
  );
  const tabs = scope.track(
    new XWUITabs(
      tabsHost,
      {
        activeTab: "definition",
        tabs: [
          { id: "definition", label: catalog.process.tabs.definition, content: definition },
          { id: "versions", label: catalog.process.tabs.versions, content: versions },
          { id: "assistant", label: catalog.process.tabs.assistant, content: assistant },
        ],
      },
      { variant: "line" },
    ),
  );

  scope.track(
    new XWFlowAssistant(assistant, {
      title: catalog.assistant.title,
      placeholder: catalog.assistant.placeholder,
      sendLabel: catalog.assistant.send,
      emptyHint: catalog.assistant.empty,
      youLabel: catalog.assistant.you,
      assistantLabel: catalog.assistant.assistant,
      onAsk: async (instruction) => (await askAssistant({ processId: process.id, instruction })).text,
    }),
  );

  const definitionScope = { current: new MountScope() };
  const versionScope = { current: new MountScope() };
  scope.track({
    destroy() {
      definitionScope.current.destroy();
      versionScope.current.destroy();
    },
  });

  const paint = () => {
    paintDefinition();
    paintVersions();
  };

  const paintDefinition = () => {
    definitionScope.current.destroy();
    definitionScope.current = new MountScope();
    const view = definitionScope.current;
    definition.replaceChildren();
    const actions = view.host("xwflow-actions");
    const split = view.host("xwflow-split");
    const canvasHost = view.host();
    const inspector = view.host("xwflow-panel");
    split.append(canvasHost, inspector);
    definition.append(actions, split);

    const version = process.versions.find((item) => item.id === viewingVersionId) ?? null;
    const steps = version ? version.steps : process.draft;
    if (version) {
      view.track(new XWUIAlert(actions, { message: `${catalog.process.readOnly} ${formatVersion(version.number)}.` }));
      const back = view.host();
      actions.append(back);
      const button = view.track(new XWUIButton(back, { text: catalog.process.draftLabel }));
      button.onClick(() => {
        viewingVersionId = null;
        selectedId = process.draft[0]?.id ?? null;
        paintDefinition();
      });
    } else {
      mountDraftActions(view, actions, () => {
        viewingVersionId = null;
        paint();
      });
    }

    view.track(
      new XWFlowCanvas(canvasHost, {
        steps,
        selectedId: steps.some((step) => step.id === selectedId) ? selectedId : steps[0]?.id ?? null,
        kindLabels: catalog.stepKinds,
        emptyLabel: catalog.canvas.empty,
        listLabel: catalog.canvas.label,
        onSelect: (stepId) => {
          selectedId = stepId;
          paintDefinition();
        },
      }),
    );
    paintInspector(view, inspector, steps, Boolean(version));
  };

  const paintInspector = (view: MountScope, inspector: HTMLElement, steps: ProcessStep[], readOnly: boolean) => {
    inspector.replaceChildren();
    const step = steps.find((item) => item.id === selectedId) ?? null;
    if (!step) {
      view.track(new XWUIAlert(inspector, { message: catalog.process.selectStep }));
      return;
    }
    if (readOnly) {
      view.track(
        new XWUICard(inspector, {
          title: step.name,
          subtitle: catalog.stepKinds[step.kind],
          content: step.summary,
        }),
      );
      return;
    }
    const nameHost = view.host();
    const kindHost = view.host();
    const summaryHost = view.host();
    const saveHost = view.host();
    inspector.append(nameHost, kindHost, summaryHost, saveHost);
    const name = view.track(
      new XWUIInputText(nameHost, { label: catalog.process.stepName, value: step.name, variant: "outline" }),
    );
    const kind = view.track(
      new XWUISelect(kindHost, {
        label: catalog.process.stepKind,
        value: step.kind,
        options: stepKinds.map((value) => ({ value, label: catalog.stepKinds[value] })),
      }),
    );
    const summary = view.track(
      new XWUIInputTextarea(summaryHost, {
        label: catalog.process.stepSummary,
        value: step.summary,
        variant: "outline",
        fullWidth: true,
        rows: 4,
      }),
    );
    const save = view.track(new XWUIButton(saveHost, { text: catalog.process.save }, { variant: "primary" }));
    save.onClick(() => {
      const selectedKind = kind.getValue();
      const nextKind = typeof selectedKind === "string" && stepKinds.includes(selectedKind as StepKind)
        ? (selectedKind as StepKind)
        : step.kind;
      void updateStep(process.id, step.id, {
        name: name.getValue(),
        kind: nextKind,
        summary: summary.getValue(),
      })
        .then(async (next) => {
          process = next;
          notify(catalog.process.saved, "success");
          paint();
        })
        .catch((error: unknown) => notify(errorMessage(error), "danger"));
    });
  };

  const mountDraftActions = (
    view: MountScope,
    actions: HTMLElement,
    afterChange: () => void,
  ) => {
    const addHost = view.host();
    const removeHost = view.host();
    const publishHost = view.host();
    const startHost = view.host();
    actions.append(addHost, removeHost, publishHost, startHost);
    const add = view.track(new XWUIButton(addHost, { text: catalog.process.addStep }));
    add.onClick(() => {
      void addStep(process.id)
        .then((next) => {
          process = next;
          selectedId = next.draft[next.draft.length - 1]?.id ?? null;
          afterChange();
        })
        .catch((error: unknown) => notify(errorMessage(error), "danger"));
    });
    const remove = view.track(new XWUIButton(removeHost, { text: catalog.process.removeStep }, { variant: "danger" }));
    remove.onClick(() => {
      if (!selectedId) return;
      void removeStep(process.id, selectedId)
        .then((next) => {
          process = next;
          selectedId = next.draft[0]?.id ?? null;
          afterChange();
        })
        .catch((error: unknown) => notify(errorMessage(error), "danger"));
    });
    const publish = view.track(new XWUIButton(publishHost, { text: catalog.process.publish }, { variant: "primary" }));
    publish.onClick(() => openPublish(view, process, (next) => {
      process = next;
      afterChange();
    }));
    const start = view.track(new XWUIButton(startHost, { text: catalog.process.start }));
    start.onClick(() => {
      if (!process.versions.length) {
        notify(catalog.process.noVersion, "warning");
        return;
      }
      void startRun(process.id)
        .then((run) => {
          notify(catalog.process.started, "success");
          navigate(runPath(run.id));
        })
        .catch((error: unknown) => notify(errorMessage(error), "danger"));
    });
  };

  const paintVersions = () => {
    versionScope.current.destroy();
    versionScope.current = new MountScope();
    const view = versionScope.current;
    versions.replaceChildren();
    if (!process.versions.length) {
      view.track(
        new XWUIEmpty(versions, {
          icon: "inbox",
          title: catalog.process.versionsEmpty,
          description: catalog.process.noVersion,
        }),
      );
      return;
    }
    view.track(
      new XWUIDataTable(versions, {
        columns: [
          { key: "version", title: catalog.process.versionColumn },
          { key: "published", title: catalog.process.publishedColumn },
          { key: "note", title: catalog.process.noteColumn },
          { key: "steps", title: catalog.processes.columns.steps },
        ],
        rows: [...process.versions].reverse().map((item) => ({
          id: item.id,
          version: formatVersion(item.number),
          published: formatWhen(item.publishedAt),
          note: item.note,
          steps: item.steps.length,
        })),
        actions: [
          {
            id: "view",
            label: catalog.process.viewVersion,
            onClick: (row: { id: string }) => {
              viewingVersionId = row.id;
              const match = process.versions.find((item) => item.id === row.id);
              const firstStep = match?.steps[0];
              selectedId = firstStep ? firstStep.id : null;
              tabs.setActiveTab("definition");
              paintDefinition();
            },
          },
        ],
      }),
    );
  };

  paint();
}

function openPublish(scope: MountScope, process: ProcessDetail, onPublished: (next: ProcessDetail) => void): void {
  const content = document.createElement("div");
  const noteHost = document.createElement("div");
  content.append(noteHost);
  const footer = document.createElement("div");
  footer.className = "xwflow-dialog-actions";
  const cancelHost = document.createElement("div");
  const submitHost = document.createElement("div");
  footer.append(cancelHost, submitHost);
  const dialog = scope.track(new XWUIDialog(document.body, { title: catalog.publishDialog.title, content, footer }));
  const note = scope.track(
    new XWUIInputTextarea(noteHost, {
      label: catalog.publishDialog.noteLabel,
      placeholder: catalog.publishDialog.notePlaceholder,
      variant: "outline",
      fullWidth: true,
      rows: 3,
    }),
  );
  const cancel = scope.track(new XWUIButton(cancelHost, { text: catalog.publishDialog.cancel }));
  cancel.onClick(() => dialog.close());
  const submit = scope.track(new XWUIButton(submitHost, { text: catalog.publishDialog.submit }, { variant: "primary" }));
  submit.onClick(() => {
    const value = note.getValue().trim();
    if (!value) {
      notify(catalog.publishDialog.noteRequired, "warning");
      return;
    }
    void publishProcess(process.id, { note: value })
      .then((next) => {
        dialog.close();
        notify(catalog.process.published, "success");
        onPublished(next);
      })
      .catch((error: unknown) => notify(errorMessage(error), "danger"));
  });
  dialog.open();
}
