/**
 * Widget window — the transparent, desktop-embedded panel showing the
 * todo list and calendar. This window is re-parented to the WorkerW
 * wallpaper layer so it survives Win+D.
 */
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { TitleBar } from "./components/TitleBar";
import { TodoWidget } from "./components/TodoWidget";
import { CalendarWidget } from "./components/CalendarWidget";
import { useStore } from "./store";
import { cn, accentRgbVariants } from "./utils";

export function WidgetApp() {
  const { view, settings, init, loaded } = useStore();

  useEffect(() => {
    void init();
  }, [init]);

  // Apply accent color CSS variables whenever settings change.
  useEffect(() => {
    const { base, soft, deep } = accentRgbVariants(settings.accentColor);
    document.documentElement.style.setProperty("--color-accent-rgb", base);
    document.documentElement.style.setProperty("--color-accent-soft-rgb", soft);
    document.documentElement.style.setProperty("--color-accent-deep-rgb", deep);
  }, [settings.accentColor]);

  // Listen for settings refresh from the main window.
  useEffect(() => {
    const unlistenP = listen("refresh-settings", () => {
      // Re-read persisted settings.
      void init();
    });
    return () => {
      void unlistenP.then((fn) => fn());
    };
  }, [init]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-white/30 text-sm">
        加载中…
      </div>
    );
  }

  const glassStyle: React.CSSProperties = {
    backgroundColor: `rgba(255, 255, 255, ${settings.opacity / 100})`,
    backdropFilter: `blur(${settings.blur}px)`,
    WebkitBackdropFilter: `blur(${settings.blur}px)`,
  };

  return (
    <div
      className="glass-panel flex h-full flex-col overflow-hidden"
      style={glassStyle}
    >
      <TitleBar />

      <div className="flex min-h-0 flex-1 gap-1 p-3">
        {(view === "todo" || view === "split") && (
          <div
            className={cn(
              "min-w-0 flex-1 animate-slide-up",
              view === "split" && "border-r border-white/[0.06] pr-3 flex-[3]",
            )}
          >
            <TodoWidget />
          </div>
        )}
        {(view === "calendar" || view === "split") && (
          <div className="min-w-0 flex-1 animate-slide-up flex-[2]">
            <CalendarWidget />
          </div>
        )}
      </div>
    </div>
  );
}
