/**
 * Core domain types for the desktop todo + calendar widget.
 */

/** A single todo item. */
export interface Todo {
  /** Stable unique id (crypto.randomUUID). */
  id: string;
  /** User-visible text. */
  title: string;
  /** Optional longer description / notes. */
  notes?: string;
  /** Optional tag for grouping (without the brackets). */
  tag?: string;
  /** ISO date string (yyyy-MM-dd) when the todo is scheduled, or undefined for unscheduled. */
  dueDate?: string;
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Completion timestamp (ISO 8601), or undefined if not done. */
  completedAt?: string;
  /** Sort order within its bucket. Lower = higher up. */
  order: number;
  /** Whether the item is pinned to the top regardless of order. */
  pinned?: boolean;
  /** Optional accent color override (CSS color string). */
  color?: string;
}

/** User-facing application settings. */
export interface Settings {
  /** Background opacity 0–100. */
  opacity: number;
  /** Background blur strength in px. */
  blur: number;
  /** Accent color (hex). */
  accentColor: string;
  /** Whether the widget is click-through (mouse passes to windows behind). */
  clickThrough: boolean;
  /** Launch on system startup. */
  autoStart: boolean;
  /** Show completed items in a collapsed archive section. */
  showArchive: boolean;
  /** Which view to show on launch: "todo" | "calendar" | "split". */
  defaultView: ViewMode;
  /** First day of week: 0 = Sunday, 1 = Monday. */
  firstDayOfWeek: 0 | 1;
}

export type ViewMode = "todo" | "calendar" | "split";

/** Shape of the entire persisted state. */
export interface AppData {
  todos: Todo[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  opacity: 6,
  blur: 24,
  accentColor: "#fbbf24",
  clickThrough: false,
  autoStart: false,
  showArchive: true,
  defaultView: "split",
  firstDayOfWeek: 1,
};

export const EMPTY_DATA: AppData = {
  todos: [],
  settings: DEFAULT_SETTINGS,
};
