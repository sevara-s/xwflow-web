export interface BoardState {
  query: string;
  status: string;
  folder: string;
  tab: string;
  sampleRows: boolean;
  collapsed: boolean;
  chatId: string;
}

const state: BoardState = {
  query: "",
  status: "",
  folder: "",
  tab: "flows",
  sampleRows: true,
  collapsed: false,
  chatId: "",
};

const storageKey = "xwflow.board";

try {
  const raw = sessionStorage.getItem(storageKey);
  if (raw) {
    const saved = JSON.parse(raw) as Partial<BoardState>;
    if (typeof saved.sampleRows === "boolean") state.sampleRows = saved.sampleRows;
    if (typeof saved.collapsed === "boolean") state.collapsed = saved.collapsed;
  }
} catch {
  /* a blocked storage starts from the pictured studio */
}

const listeners = new Set<() => void>();

function persist(): void {
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ sampleRows: state.sampleRows, collapsed: state.collapsed }),
    );
  } catch {
    /* the in-memory board still serves this page */
  }
}

export function boardState(): BoardState {
  return state;
}

export function patchBoard(partial: Partial<BoardState>): void {
  Object.assign(state, partial);
  persist();
  for (const listener of listeners) listener();
}

export function watchBoard(listener: () => void, scope: { track(item: { destroy(): void }): void }): void {
  listeners.add(listener);
  scope.track({
    destroy() {
      listeners.delete(listener);
    },
  });
}
