/**
 * Widget title bar: drag region for the frameless widget window +
 * view switcher (待办 / 日历 / 分屏). No settings button — settings
 * live in the separate main window.
 */
import { isTauri } from "@tauri-apps/api/core";
import { ListTodo, CalendarDays, Columns2 } from "lucide-react";
import { useStore } from "../store";
import type { ViewMode } from "../types";
import { cn } from "../utils";

const VIEWS: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "todo", icon: <ListTodo size={14} />, label: "待办" },
  { mode: "calendar", icon: <CalendarDays size={14} />, label: "日历" },
  { mode: "split", icon: <Columns2 size={14} />, label: "分屏" },
];

export function TitleBar() {
  const { view, setView } = useStore();

  async function handleMouseDown() {
    if (isTauri()) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging().catch(() => {});
    }
  }

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.06] px-2"
    >
      {/* View switcher */}
      <div className="flex items-center gap-0.5" data-tauri-drag-region={false}>
        {VIEWS.map((v) => (
          <button
            key={v.mode}
            onClick={() => setView(v.mode)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors",
              view === v.mode
                ? "bg-white/[0.1] text-white/85"
                : "text-white/45 hover:bg-white/[0.05] hover:text-white/70",
            )}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      {/* Spacer — keeps the drag region balanced */}
      <div data-tauri-drag-region={false} />
    </div>
  );
}
