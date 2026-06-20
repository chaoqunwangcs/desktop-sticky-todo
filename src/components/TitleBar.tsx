/**
 * Custom title bar: drag region for the frameless window + view switcher
 * (待办 / 日历 / 分屏) + settings button. Uses Tauri's startDragging so the
 * user can move the window by dragging the bar even when embedded on the
 * desktop layer.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { Settings, ListTodo, CalendarDays, Columns2 } from "lucide-react";
import { useStore } from "../store";
import type { ViewMode } from "../types";
import { cn } from "../utils";

const VIEWS: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "todo", icon: <ListTodo size={14} />, label: "待办" },
  { mode: "calendar", icon: <CalendarDays size={14} />, label: "日历" },
  { mode: "split", icon: <Columns2 size={14} />, label: "分屏" },
];

interface Props {
  onOpenSettings: () => void;
}

export function TitleBar({ onOpenSettings }: Props) {
  const { view, setView } = useStore();

  async function handleDragStart() {
    if (isTauri()) {
      await invoke("set_click_through", { enabled: false }).catch(() => {});
    }
  }

  async function handleMouseDown() {
    if (isTauri()) {
      // startDragging is called via the plugin-less core API on the window.
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging().catch(() => {});
    }
  }

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.06] px-2"
    >
      {/* View switcher */}
      <div className="flex items-center gap-0.5" data-tauri-drag-region={false}>
        {VIEWS.map((v) => (
          <button
            key={v.mode}
            onClick={() => setView(v.mode)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
              view === v.mode
                ? "bg-white/[0.1] text-white/85"
                : "text-white/40 hover:bg-white/[0.05] hover:text-white/65",
            )}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-0.5" data-tauri-drag-region={false}>
        <button
          onClick={onOpenSettings}
          className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          aria-label="设置"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
