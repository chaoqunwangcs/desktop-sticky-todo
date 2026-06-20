/**
 * Settings panel: opacity, blur, accent color, click-through, auto-start,
 * first day of week, default view. Slides in from the right as an overlay.
 */
import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { X, MousePointerClick, Power, Palette, Eye, Calendar } from "lucide-react";
import { useStore } from "../store";
import type { ViewMode } from "../types";
import { cn } from "../utils";

interface Props {
  onClose: () => void;
}

const ACCENT_PRESETS = [
  "#fbbf24", // amber (yynote-like)
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#a855f7", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#64748b", // slate
];

export function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useStore();
  const [autoStart, setAutoStart] = useState(settings.autoStart);

  // Sync autostart with the OS on toggle.
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      try {
        const enabled = await isEnabled();
        if (autoStart && !enabled) await enable();
        if (!autoStart && enabled) await disable();
      } catch {
        /* ignore — not critical */
      }
    })();
  }, [autoStart]);

  // Apply click-through immediately when toggled.
  useEffect(() => {
    if (!isTauri()) return;
    void invoke("set_click_through", { enabled: settings.clickThrough }).catch(
      () => {},
    );
  }, [settings.clickThrough]);

  return (
    <div className="absolute inset-0 z-50 flex animate-fade-in justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="glass-panel relative m-2 flex w-[280px] flex-col overflow-y-auto scrollbar-thin p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">设置</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
          >
            <X size={16} />
          </button>
        </div>

        {/* Appearance */}
        <Section icon={<Palette size={13} />} title="外观">
          <Field label="背景透明度">
            <Slider
              value={settings.opacity}
              min={0}
              max={30}
              onChange={(v) => updateSettings({ opacity: v })}
            />
          </Field>
          <Field label="背景模糊">
            <Slider
              value={settings.blur}
              min={0}
              max={60}
              onChange={(v) => updateSettings({ blur: v })}
            />
          </Field>
          <Field label="强调色">
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateSettings({ accentColor: c })}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110",
                    settings.accentColor === c && "ring-2 ring-white/60 ring-offset-2 ring-offset-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
          </Field>
        </Section>

        {/* Behavior */}
        <Section icon={<MousePointerClick size={13} />} title="交互">
          <Toggle
            label="鼠标穿透"
            desc="点击穿过到下层窗口"
            checked={settings.clickThrough}
            onChange={(v) => updateSettings({ clickThrough: v })}
          />
          <Toggle
            label="显示已完成区"
            desc="折叠展示已归档待办"
            checked={settings.showArchive}
            onChange={(v) => updateSettings({ showArchive: v })}
          />
        </Section>

        {/* System */}
        <Section icon={<Power size={13} />} title="系统">
          <Toggle
            label="开机自启"
            desc="登录时自动启动"
            checked={autoStart}
            onChange={setAutoStart}
          />
        </Section>

        {/* Calendar */}
        <Section icon={<Calendar size={13} />} title="日历">
          <Field label="默认视图">
            <div className="flex gap-1">
              {(["todo", "calendar", "split"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => updateSettings({ defaultView: v })}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs transition-colors",
                    settings.defaultView === v
                      ? "bg-accent/20 text-accent"
                      : "bg-white/[0.05] text-white/50 hover:bg-white/10",
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
                  onClick={() =>
                    updateSettings({ firstDayOfWeek: d as 0 | 1 })
                  }
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs transition-colors",
                    settings.firstDayOfWeek === d
                      ? "bg-accent/20 text-accent"
                      : "bg-white/[0.05] text-white/50 hover:bg-white/10",
                  )}
                >
                  {d === 0 ? "周日" : "周一"}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-white/25">
          <Eye size={10} />
          设置自动保存
        </div>
      </div>
    </div>
  );
}

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
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
        {icon}
        {title}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-white/50">{label}</div>
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
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
      />
      <span className="w-8 text-right text-[11px] text-white/40">{value}</span>
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
      className="flex w-full items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]"
    >
      <div>
        <div className="text-xs text-white/70">{label}</div>
        {desc && <div className="text-[10px] text-white/30">{desc}</div>}
      </div>
      <div
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-accent/80" : "bg-white/15",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}
