//! Desktop Sticky Todo — Tauri application entry point.
//!
//! Two-window architecture:
//! - `main`  — Normal window (decorations, taskbar) for settings & visibility toggles.
//! - `widget` — Transparent, frameless, embedded to desktop wallpaper layer so
//!             it survives Win+D. Shows the todo list + calendar.
//!
//! Cross-window state is synced via the shared Tauri store plugin + events.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod desktop;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_store::StoreExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            desktop::embed_to_desktop,
            desktop::set_click_through,
            desktop::save_window_state,
            desktop::detach_from_desktop,
        ])
        .setup(|app| {
            // ── Tray ──────────────────────────────────────────────
            let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "主控台", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &settings, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("桌面待办与日历")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("widget") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                    "settings" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        if let Some(w) = app.get_webview_window("widget") {
                            let _ = desktop::save_window_state(app.clone(), w, "widget".to_string());
                        }
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = desktop::save_window_state(app.clone(), w, "main".to_string());
                        }
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // ── Widget window (desktop-embedded) ─────────────────
            // Create the widget window programmatically so we can embed it
            // after creation. The window starts hidden and we show it after
            // reading the persisted visibility settings.
            let widget = WebviewWindowBuilder::new(
                app,
                "widget",
                WebviewUrl::App("index.html".into()),
            )
            .title("widget")
            .inner_size(760.0, 620.0)
            .min_inner_size(380.0, 420.0)
            .decorations(false)
            .transparent(true)
            .resizable(true)
            .skip_taskbar(true)
            .shadow(false)
            .visible(false)
            .build()?;

            // Embed to desktop wallpaper layer so Win+D doesn't hide it.
            desktop::attach_to_desktop(&widget);

            // Restore widget geometry.
            desktop::restore_window_geometry(&widget, "widget");

            // ── Main window (settings) ───────────────────────────
            if let Some(main) = app.get_webview_window("main") {
                desktop::restore_window_geometry(&main, "main");
            }

            // ── Listen for visibility toggles from main window ───
            let widget_handle = widget.clone();
            app.listen("toggle-widget-visibility", move |event| {
                let payload: serde_json::Value =
                    serde_json::from_str(event.payload()).unwrap_or_default();
                let show = payload.get("visible").and_then(|v| v.as_bool()).unwrap_or(true);
                if show {
                    let _ = widget_handle.show();
                    let _ = widget_handle.set_focus();
                } else {
                    let _ = widget_handle.hide();
                }
            });

            // ── Listen for settings changes from main → widget ──
            let widget_handle2 = widget.clone();
            app.listen("settings-changed", move |_event| {
                // The widget window re-reads from the store on its own,
                // but we also emit a refresh event so it knows to re-read.
                let _ = widget_handle2.emit("refresh-settings", ());
            });

            // ── Read persisted settings to decide initial visibility ──
            if let Ok(store) = app.store("app-data.json") {
                if let Some(settings) = store.get("settings") {
                    let show_todo = settings
                        .get("showTodo")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(true);
                    let show_cal = settings
                        .get("showCalendar")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(true);
                    if show_todo || show_cal {
                        let _ = widget.show();
                    }
                } else {
                    // No persisted settings yet — show widget by default.
                    let _ = widget.show();
                }
            } else {
                let _ = widget.show();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let label = window.label().to_string();
                    // Main window: hide instead of close so user can reopen from tray.
                    if label == "main" {
                        api.prevent_close();
                        let _ = window.hide();
                        return;
                    }
                    // Widget window: save state before closing.
                    let app = window.app_handle();
                    if let Some(wv) = app.get_webview_window(&label) {
                        let _ = desktop::save_window_state(app.clone(), wv, label);
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
