/**
 * Small pure helpers shared across widgets.
 * No side-effects, no framework imports — easy to unit test.
 */
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Todo } from "./types";

/** Class name combiner — tiny clsx alternative. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Generate a UUID. Falls back to a timestamp-based id if crypto is missing. */
export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Today's date as yyyy-MM-dd in local time. */
export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Format an ISO date string as yyyy-MM-dd (safe for undefined). */
export function toDateKey(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return undefined;
  }
}

/** Human-friendly countdown label, e.g. "还有 3 天" / "已过 2 天" / "今天". */
export function countdownLabel(dueDate?: string): string | null {
  if (!dueDate) return null;
  try {
    const target = parseISO(dueDate);
    const diff = differenceInCalendarDays(target, new Date());
    if (diff === 0) return "今天";
    if (diff > 0) return `还有 ${diff} 天`;
    return `已过 ${-diff} 天`;
  } catch {
    return null;
  }
}

/** Stable sort by (pinned desc, order asc, createdAt desc). Returns a new array. */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    if (a.order !== b.order) return a.order - b.order;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Partition todos into active / completed buckets. */
export function partitionTodos(todos: Todo[]): { active: Todo[]; done: Todo[] } {
  const active = sortTodos(todos.filter((t) => !t.completedAt));
  const done = sortTodos(
    todos.filter((t) => t.completedAt).sort((a, b) =>
      (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
    ),
  );
  return { active, done };
}

/** Group active todos by their due date key (yyyy-MM-dd). Unscheduled go to "__none__". */
export function groupByDate(todos: Todo[]): Record<string, Todo[]> {
  const out: Record<string, Todo[]> = {};
  for (const t of todos) {
    if (t.completedAt) continue;
    const key = t.dueDate ?? "__none__";
    (out[key] ??= []).push(t);
  }
  return out;
}

/** Convert a hex color (e.g. "#fbbf24") to RGB components string "251 191 36". */
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Derive soft (lighter) and deep (darker) RGB from a hex color. */
export function accentRgbVariants(hex: string): { base: string; soft: string; deep: string } {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Soft: lighten by blending with white
  const softR = Math.min(255, r + 40);
  const softG = Math.min(255, g + 40);
  const softB = Math.min(255, b + 40);
  // Deep: darken by reducing
  const deepR = Math.max(0, r - 60);
  const deepG = Math.max(0, g - 60);
  const deepB = Math.max(0, b - 60);
  return {
    base: `${r} ${g} ${b}`,
    soft: `${softR} ${softG} ${softB}`,
    deep: `${deepR} ${deepG} ${deepB}`,
  };
}
