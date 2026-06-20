/**
 * Desktop Sticky Todo — main application shell.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │ TitleBar (drag region + view tabs)  │
 *   ├──────────────┬──────────────────────┤
 *   │  TodoWidget  │   CalendarWidget     │   ← split mode
 *   └──────────────┴──────────────────────┘
 *
 * The whole panel is a transparent glass surface. The Rust side embeds it
 * onto the desktop wallpaper layer so it survives Win+D.
 */
import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TitleBar } from "./components/TitleBar";
import { TodoWidget } from "./components/TodoWidget";
import { CalendarWidget } from "./components/CalendarWidget";
import { SettingsPanel } from "./components/SettingsPanel";
import { useStore } from "./store";
import { cn } from "./utils";

export default function App() {
  const { view, settings, init, loaded } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  // Hydrate from disk + embed into desktop on mount.
  useEffect(() => {
    void init();
  }, [init]);

  // Listen for tray "open-settings" event.
  useEffect(() => {
    const unlistenP = listen("open-settings", () => setShowSettings(true));
    return () => {
      void unlistenP.then((fn) => fn());
    };
  }, []);

  // Embed window into desktop wallpaper layer once loaded.
  useEffect(() => {
    if (!loaded || !isTauri()) return;
    // Small delay lets the window paint before re-parenting.
    const t = setTimeout(() => {
      void invoke("embed_to_desktop").catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [loaded]);

  // Apply click-through whenever it changes.
  useEffect(() => {
    if (!isTauri()) return;
    void invoke("set_click_through", { enabled: settings.clickThrough }).catch(
      () => {},
    );
  }, [settings.clickThrough]);

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
      <TitleBar onOpenSettings={() => setShowSettings(true)} />

      <div className="flex min-h-0 flex-1 gap-1 p-3">
        {(view === "todo" || view === "split") && (
          <div
            className={cn(
              "min-w-0 flex-1 animate-slide-up",
              view === "split" && "border-r border-white/[0.06] pr-3",
            )}
          >
            <TodoWidget />
          </div>
        )}
        {(view === "calendar" || view === "split") && (
          <div className="min-w-0 flex-1 animate-slide-up">
            <CalendarWidget />
          </div>
        )}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
