/**
 * Global application store backed by Zustand.
 *
 * Persistence uses the Tauri `store` plugin (JSON on disk) so data survives
 * across launches. On web (dev mode without Tauri) we fall back to
 * localStorage so the UI is still explorable in a browser.
 */
import { create } from "zustand";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import type { Settings, Todo, ViewMode } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { uid } from "./utils";

const STORE_FILE = "app-data.json";

interface StoreState {
  todos: Todo[];
  settings: Settings;
  view: ViewMode;
  selectedDate: string | null;
  loaded: boolean;
  /** Hydrate from disk on app start. */
  init: () => Promise<void>;
  setView: (view: ViewMode) => void;
  setSelectedDate: (date: string | null) => void;
  addTodo: (input: Partial<Todo> & { title: string }) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  removeTodo: (id: string) => void;
  toggleDone: (id: string) => void;
  togglePinned: (id: string) => void;
  reorder: (orderedIds: string[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

/** Open the Tauri store file with the required `defaults` field. */
async function openStore() {
  return load(STORE_FILE, { autoSave: false, defaults: {} });
}

/** Read persisted data from the Tauri store (or localStorage on web). */
async function readPersisted(): Promise<{ todos: Todo[]; settings: Settings } | null> {
  try {
    if (isTauri()) {
      const store = await openStore();
      const todos = (await store.get<Todo[]>("todos")) ?? [];
      const settingsRaw = (await store.get<Settings>("settings")) ?? DEFAULT_SETTINGS;
      return { todos, settings: { ...DEFAULT_SETTINGS, ...settingsRaw } };
    }
  } catch {
    // fall through to localStorage
  }
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("desktop-sticky-todo");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          todos: parsed.todos ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        };
      }
    } catch {
      /* ignore corrupt storage */
    }
  }
  return null;
}

/** Write persisted data to the Tauri store (or localStorage on web). */
async function writePersisted(todos: Todo[], settings: Settings): Promise<void> {
  try {
    if (isTauri()) {
      const store = await openStore();
      await store.set("todos", todos);
      await store.set("settings", settings);
      await store.save();
      return;
    }
  } catch {
    // fall through to localStorage
  }  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(
        "desktop-sticky-todo",
        JSON.stringify({ todos, settings }),
      );
    } catch {
      /* ignore quota errors */
    }
  }
}

export const useStore = create<StoreState>()((set, get) => ({
  todos: [],
  settings: DEFAULT_SETTINGS,
  view: DEFAULT_SETTINGS.defaultView,
  selectedDate: null,
  loaded: false,

  init: async () => {
    const data = await readPersisted();
    if (data) {
      set({
        todos: data.todos,
        settings: data.settings,
        view: data.settings.defaultView,
        loaded: true,
      });
    } else {
      set({ loaded: true });
    }
  },

  setView: (view) => set({ view }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  addTodo: (input) => {
    const now = new Date().toISOString();
    const minOrder = get().todos.reduce(
      (min, t) => (t.order < min ? t.order : min),
      0,
    );
    const todo: Todo = {
      id: uid(),
      title: input.title.trim(),
      notes: input.notes,
      tag: input.tag,
      dueDate: input.dueDate,
      createdAt: now,
      order: minOrder - 1,
      pinned: input.pinned,
      color: input.color,
    };
    const todos = [...get().todos, todo];
    set({ todos });
    void writePersisted(todos, get().settings);
  },

  updateTodo: (id, patch) => {
    const todos = get().todos.map((t) => (t.id === id ? { ...t, ...patch } : t));
    set({ todos });
    void writePersisted(todos, get().settings);
  },

  removeTodo: (id) => {
    const todos = get().todos.filter((t) => t.id !== id);
    set({ todos });
    void writePersisted(todos, get().settings);
  },

  toggleDone: (id) => {
    const now = new Date().toISOString();
    const todos = get().todos.map((t) =>
      t.id === id
        ? { ...t, completedAt: t.completedAt ? undefined : now }
        : t,
    );
    set({ todos });
    void writePersisted(todos, get().settings);
  },

  togglePinned: (id) => {
    const todos = get().todos.map((t) =>
      t.id === id ? { ...t, pinned: !t.pinned } : t,
    );
    set({ todos });
    void writePersisted(todos, get().settings);
  },

  reorder: (orderedIds) => {
    const map = new Map(get().todos.map((t) => [t.id, t]));
    const reordered: Todo[] = [];
    orderedIds.forEach((id, idx) => {
      const t = map.get(id);
      if (t) reordered.push({ ...t, order: idx });
    });
    // Append any todos not in orderedIds (shouldn't happen, but stay safe).
    for (const t of get().todos) {
      if (!orderedIds.includes(t.id)) reordered.push(t);
    }
    set({ todos: reordered });
    void writePersisted(reordered, get().settings);
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void writePersisted(get().todos, settings);
    // Sync click-through + autostart with the Rust side.
    if (patch.clickThrough !== undefined && isTauri()) {
      void invoke("set_click_through", { enabled: patch.clickThrough }).catch(
        () => {},
      );
    }
  },
}));
