/**
 * Main settings window — normal decorated window with appearance,
 * visibility, and system settings. Controls the widget window
 * visibility via Tauri events.
 */
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { Palette, Eye, Power, Calendar, Monitor } from "lucide-react";
import { useStore } from "./store";
import type { ViewMode } from "./types";
import { cn } from "./utils";

const ACCENT_PRESETS = [
  "#fbbf24", // amber
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#a855f7", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#64748b", // slate
];

export default function App() {
  const { settings, updateSettings, init, loaded } = useStore();
  const [autoStart, setAutoStart] = useState(settings.autoStart);

  useEffect(() => {
    void init();
  }, [init]);

  // Sync autostart with OS.
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      try {
        const enabled = await isEnabled();
        if (autoStart && !enabled) await enable();
        if (!autoStart && enabled) await disable();
      } catch {
        /* ignore */
      }
    })();
  }, [autoStart]);

  // When settings change, notify the widget window.
  function handleUpdate(patch: Partial<typeof settings>) {
    updateSettings(patch);
    // Notify widget window to refresh.
    void emit("settings-changed", {}).catch(() => {});
  }

  // Toggle widget visibility.
  function handleToggleWidget(visible: boolean) {
    void emit("toggle-widget-visibility", { visible }).catch(() => {});
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        加载中…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            桌面待办与日历
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            设置
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Visibility */}
        <Section icon={<Monitor size={14} />} title="显示">
          <Toggle
            label="显示待办清单"
            desc="在桌面上显示待办清单窗口"
            checked={settings.showTodo}
            onChange={(v) => {
              handleUpdate({ showTodo: v });
              handleToggleWidget(v || settings.showCalendar);
            }}
          />
          <Toggle
            label="显示日历"
            desc="在桌面上显示日历窗口"
            checked={settings.showCalendar}
            onChange={(v) => {
              handleUpdate({ showCalendar: v });
              handleToggleWidget(settings.showTodo || v);
            }}
          />
        </Section>

        {/* Appearance */}
        <Section icon={<Palette size={14} />} title="外观">
          <Field label="背景透明度">
            <Slider
              value={settings.opacity}
              min={0}
              max={30}
              onChange={(v) => handleUpdate({ opacity: v })}
            />
          </Field>
          <Field label="背景模糊">
            <Slider
              value={settings.blur}
              min={0}
              max={60}
              onChange={(v) => handleUpdate({ blur: v })}
            />
          </Field>
          <Field label="强调色">
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleUpdate({ accentColor: c })}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110",
                    settings.accentColor === c &&
                      "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-gray-400",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
          </Field>
        </Section>

        {/* Calendar */}
        <Section icon={<Calendar size={14} />} title="日历">
          <Field label="默认视图">
            <div className="flex gap-1">
              {(["todo", "calendar", "split"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => handleUpdate({ defaultView: v })}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    settings.defaultView === v
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
                  )}
                >
                  {v === "todo" ? "待办" : v === "calendar" ? "日历" : "分屏"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="每周起始">
            <div className="flex gap-1">
              {[0, 1].map((d) => (
                <button
                  key={d}
                  onClick={() => handleUpdate({ firstDayOfWeek: d as 0 | 1 })}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    settings.firstDayOfWeek === d
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
                  )}
                >
                  {d === 0 ? "周日" : "周一"}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* System */}
        <Section icon={<Power size={14} />} title="系统">
          <Toggle
            label="开机自启"
            desc="登录时自动启动"
            checked={autoStart}
            onChange={setAutoStart}
          />
        </Section>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
          <Eye size={10} />
          设置自动保存
        </div>
      </div>
    </div>
  );
}

/* ── Reusable layout primitives ─────────────────────────────── */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </div>
      {children}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700 accent-amber-500"
      />
      <span className="w-8 text-right text-xs text-gray-400 dark:text-gray-500 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
    >
      <div>
        <div className="text-sm text-gray-700 dark:text-gray-200">{label}</div>
        {desc && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {desc}
          </div>
        )}
      </div>
      <div
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors shrink-0",
          checked ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}
