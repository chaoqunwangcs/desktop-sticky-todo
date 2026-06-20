//! Desktop wallpaper embedding for Windows.
//!
//! Sends the undocumented `0x052C` message to the `Progman` window so that
//! the shell spawns a `WorkerW` layer between the wallpaper and the desktop
//! icons, then re-parents our window onto that layer. Once attached, the
//! window becomes part of the desktop surface: `Win+D` (Show Desktop) no
//! longer hides it, and it stays anchored to the wallpaper.
//!
//! References (cross-checked):
//! - DynamicWallpaper docs: https://dynamicwallpaper.readthedocs.io/en/docs/dev/make-wallpaper.html
//! - Stack Overflow: "Make WPF Window Ignore Show Desktop (Win+D)"
//! - Tauri issue #4261: display window behind desktop icons
//! - Win11 24H2 compatibility notes (WorkerW respawn behaviour)

#![cfg(windows)]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewWindow};
use tauri_plugin_store::StoreExt;
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, GetWindowLongW, SendMessageTimeoutW, SetParent,
    SetWindowLongW, ShowWindow, GWL_EXSTYLE, SMTO_NORMAL, SW_SHOW, WINDOW_LONG_PTR_INDEX,
    WS_EX_TOOLWINDOW,
};

/// Undocumented message that asks `Progman` to spawn the `WorkerW` wallpaper
/// layer (same constant used by Rainmeter, Wallpaper Engine, and the
/// electron-as-wallpaper bindings).
const WM_SPAWN_WORKER: u32 = 0x052C;

static ATTACHED: AtomicBool = AtomicBool::new(false);

fn to_hwnd(window: &WebviewWindow) -> Option<HWND> {
    window.hwnd().ok()
}

fn spawn_worker_w(progman: HWND) {
    // Two sends mirror what electron-as-wallpaper does. The first one with
    // wParam 0xD, lParam 0 is the documented trigger; the follow-up with
    // lParam 1 is belt-and-suspenders for older builds.
    unsafe {
        let _ = SendMessageTimeoutW(
            progman,
            WM_SPAWN_WORKER,
            WPARAM(0xD),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            None,
        );
        let _ = SendMessageTimeoutW(
            progman,
            WM_SPAWN_WORKER,
            WPARAM(0xD),
            LPARAM(1),
            SMTO_NORMAL,
            1000,
            None,
        );
    }
}

/// `EnumWindows` callback context: we write the found `WorkerW` HWND here.
struct WorkerFinder {
    found: Option<HWND>,
}

/// Locate the `WorkerW` that holds the `SHELLDLL_DefView` sibling. There can be
/// multiple `WorkerW` windows (especially on Win11); we want the one that lives
/// *after* the shell icon view in the Z order so we sit behind the icons.
fn find_worker_w() -> Option<HWND> {
    let mut finder = Box::new(WorkerFinder { found: None });
    let finder_ptr: *mut WorkerFinder = &mut *finder;

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let finder = &mut *(lparam.0 as *mut WorkerFinder);
        // For each top-level window, check if it hosts SHELLDLL_DefView.
        let def_view = FindWindowExW(
            Some(hwnd),
            None,
            windows::core::w!("SHELLDLL_DefView"),
            None,
        );
        if let Ok(def_view) = def_view {
            if !def_view.is_invalid() {
                // The WorkerW we want is the next sibling after this one.
                let worker =
                    FindWindowExW(None, Some(hwnd), windows::core::w!("WorkerW"), None);
                if let Ok(worker) = worker {
                    if !worker.is_invalid() {
                        finder.found = Some(worker);
                        return BOOL(0); // stop enumerating
                    }
                }
            }
        }
        BOOL(1) // keep going
    }

    let lparam = LPARAM(finder_ptr as isize);
    unsafe {
        let _ = EnumWindows(Some(enum_proc), lparam);
    }

    finder.found
}

/// Strip the taskbar app-window style so the widget never shows up in the
/// taskbar / Alt-Tab list even when re-parenting does not fully hide it.
fn hide_from_taskbar(hwnd: HWND) {
    unsafe {
        let ex = GetWindowLongW(hwnd, WINDOW_LONG_PTR_INDEX(GWL_EXSTYLE.0)) as u32;
        let new_ex = (ex | WS_EX_TOOLWINDOW.0) as i32;
        let _ = SetWindowLongW(hwnd, WINDOW_LONG_PTR_INDEX(GWL_EXSTYLE.0), new_ex);
    }
}

/// Attach the given window to the desktop wallpaper layer.
///
/// After this returns the window:
/// - stays visible when the user presses `Win+D`
/// - sits behind desktop icons (not on top of them)
/// - is excluded from the taskbar and Alt+Tab
///
/// Returns `true` on success. Subsequent calls are no-ops (the window is
/// already attached).
pub fn attach_to_desktop(window: &WebviewWindow) -> bool {
    if ATTACHED.load(Ordering::SeqCst) {
        return true;
    }

    let hwnd = match to_hwnd(window) {
        Some(h) => h,
        None => return false,
    };

    unsafe {
        let progman = match FindWindowW(windows::core::w!("Progman"), None) {
            Ok(p) => p,
            Err(_) => return false,
        };
        if progman.is_invalid() {
            return false;
        }

        spawn_worker_w(progman);

        match find_worker_w() {
            Some(worker) => {
                let _ = SetParent(hwnd, Some(worker));
            }
            None => {
                // Fallback: parent directly to Progman. Less ideal (icons may
                // render on top of us) but keeps the widget on the desktop
                // layer on builds where WorkerW refuses to spawn.
                let _ = SetParent(hwnd, Some(progman));
            }
        }

        hide_from_taskbar(hwnd);
        let _ = ShowWindow(hwnd, SW_SHOW);
    }

    ATTACHED.store(true, Ordering::SeqCst);
    true
}

/// Tauri command wrapper for `attach_to_desktop`.
#[tauri::command]
pub fn embed_to_desktop(window: WebviewWindow) -> bool {
    attach_to_desktop(&window)
}

/// Set click-through state: when enabled, mouse events pass through the window
/// to whatever is behind it. Implemented via the layered `WS_EX_TRANSPARENT`
/// style toggling so the widget stays visible but stops intercepting input.
#[tauri::command]
pub fn set_click_through(window: WebviewWindow, enabled: bool) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT,
    };

    let hwnd = match to_hwnd(&window) {
        Some(h) => h,
        None => return false,
    };

    unsafe {
        let ex = GetWindowLongW(hwnd, WINDOW_LONG_PTR_INDEX(GWL_EXSTYLE.0)) as u32;
        // Need WS_EX_LAYERED for WS_EX_TRANSPARENT to take effect on a normal
        // window; Tauri transparent windows already have it.
        let with_layered = ex | WS_EX_LAYERED.0;
        let new_ex = if enabled {
            with_layered | WS_EX_TRANSPARENT.0
        } else {
            with_layered & !WS_EX_TRANSPARENT.0
        };
        let _ = SetWindowLongW(hwnd, WINDOW_LONG_PTR_INDEX(GWL_EXSTYLE.0), new_ex as i32);
    }

    true
}

/// Persist the current window position/size so we can restore it on next launch.
#[tauri::command]
pub fn save_window_state(app: AppHandle, window: WebviewWindow) -> bool {
    let Ok(pos) = window.outer_position() else {
        return false;
    };
    let Ok(size) = window.outer_size() else {
        return false;
    };
    let scale = window.scale_factor().unwrap_or(1.0);

    let payload = serde_json::json!({
        "x": pos.x,
        "y": pos.y,
        "width": size.width,
        "height": size.height,
        "scale": scale,
    });

    // Stash into the store plugin so the frontend can read it next boot.
    // `Manager::store()` returns the store directly (no trait dance).
    if let Ok(store) = app.store("window-state.json") {
        let _ = store.set("window", payload);
        let _ = store.save();
    }

    true
}

/// Re-apply a previously saved window geometry on startup.
pub fn restore_window_geometry(window: &WebviewWindow) {
    let app = window.app_handle();
    let Ok(store) = app.store("window-state.json") else {
        return;
    };
    let Some(entry) = store.get("window") else {
        return;
    };

    if let Some(obj) = entry.as_object() {
        let x = obj.get("x").and_then(|v| v.as_i64()).unwrap_or(100) as i32;
        let y = obj.get("y").and_then(|v| v.as_i64()).unwrap_or(100) as i32;
        let w = obj.get("width").and_then(|v| v.as_i64()).unwrap_or(760) as u32;
        let h = obj.get("height").and_then(|v| v.as_i64()).unwrap_or(620) as u32;

        let _ = window.set_size(LogicalSize::new(w, h));
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}
