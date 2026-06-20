//! Desktop Sticky Todo — Tauri application entry point.
//!
//! Wires up:
//! - the `store` plugin (local JSON persistence)
//! - the `autostart` plugin (launch on login)
//! - the `opener` plugin (URL / file opening from the UI)
//! - Rust commands implemented in `desktop.rs` (wallpaper embedding,
//!   click-through toggle, window state persistence)
//! - a minimal system tray with show/hide/quit actions

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod desktop;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

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
        ])
        .setup(|app| {
            // Build the tray menu. Keep it minimal: toggle, settings, quit.
            let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &settings, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("桌面待办与日历")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("open-settings", ());
                        }
                    }
                    "quit" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = desktop::save_window_state(
                                app.clone(),
                                window.clone(),
                            );
                        }
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Restore geometry on launch.
            if let Some(window) = app.get_webview_window("main") {
                desktop::restore_window_geometry(&window);
                // Defer embedding until the window has actually rendered once;
                // SetParent needs a real HWND that has been shown. We attach
                // on the first focus or resize event — both fire shortly after
                // the window becomes visible.
                let w = window.clone();
                window.on_window_event(move |event| {
                    if matches!(event, WindowEvent::Focused(_) | WindowEvent::Resized(_)) {
                        let _ = desktop::attach_to_desktop(&w);
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Persist geometry on close so we can restore next boot.
            if let WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = desktop::save_window_state(app.clone(), win);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
