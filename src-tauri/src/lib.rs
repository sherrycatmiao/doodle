mod commands;
mod db;
mod models;

#[cfg(target_os = "windows")]
mod desktop_pin {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use tauri::WebviewWindow;

    type HWND = *mut std::ffi::c_void;

    extern "system" {
        fn FindWindowA(lpClassName: *const u8, lpWindowName: *const u8) -> HWND;
        fn FindWindowExA(
            hWndParent: HWND,
            hWndChildAfter: HWND,
            lpszClass: *const u8,
            lpszWindow: *const u8,
        ) -> HWND;
        fn SetParent(hWndChild: HWND, hWndNewParent: HWND) -> HWND;
        fn SendMessageA(hWnd: HWND, Msg: u32, wParam: usize, lParam: isize) -> isize;
        fn SetWindowPos(
            hWnd: HWND,
            hWndInsertAfter: HWND,
            X: i32,
            Y: i32,
            cx: i32,
            cy: i32,
            uFlags: u32,
        ) -> i32;
        fn ShowWindow(hWnd: HWND, nCmdShow: i32) -> i32;
        fn SetForegroundWindow(hWnd: HWND) -> i32;
        fn BringWindowToTop(hWnd: HWND) -> i32;
    }

    const HWND_TOP: HWND = 0isize as HWND;
    const HWND_NOTOPMOST: HWND = -2isize as HWND;
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_SHOWWINDOW: u32 = 0x0040;
    const SW_SHOW: i32 = 5;

    // Keep the parent HWND so we can re-pin after Alt+Space
    static mut DESKTOP_HWND: HWND = std::ptr::null_mut();

    pub fn get_hwnd(window: &WebviewWindow) -> Option<HWND> {
        let handle = window.window_handle().ok()?;
        match handle.as_ref() {
            RawWindowHandle::Win32(h) => Some(h.hwnd.get() as HWND),
            _ => None,
        }
    }

    /// Pin widget window to the Windows desktop, so it survives Win+D (Show Desktop)
    /// using the classic Progman → WorkerW technique.
    pub fn pin_to_desktop(hwnd: HWND) {
        unsafe {
            let progman = FindWindowA("Progman\0".as_ptr(), std::ptr::null_mut());
            if progman.is_null() {
                return;
            }

            SendMessageA(progman, 0x052C, 0, 0);

            let mut workerw: HWND = std::ptr::null_mut();
            loop {
                workerw = FindWindowExA(
                    std::ptr::null_mut(),
                    workerw,
                    "WorkerW\0".as_ptr(),
                    std::ptr::null_mut(),
                );
                if workerw.is_null() {
                    break;
                }
                let child = FindWindowExA(
                    workerw,
                    std::ptr::null_mut(),
                    "SHELLDLL_DefView\0".as_ptr(),
                    std::ptr::null_mut(),
                );
                if !child.is_null() {
                    break;
                }
            }

            let parent = if !workerw.is_null() {
                workerw
            } else {
                progman
            };
            DESKTOP_HWND = parent;

            SetParent(hwnd, parent);
            SetWindowPos(
                hwnd,
                HWND_TOP,
                0,
                0,
                0,
                0,
                SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW,
            );
            ShowWindow(hwnd, SW_SHOW);
        }
    }

    /// Bring widget to front: unparent from desktop, show, move to top.
    /// Does NOT auto-repin — frontend calls `repin_to_desktop` when done.
    pub fn bring_to_front(hwnd: HWND) {
        unsafe {
            SetParent(hwnd, std::ptr::null_mut());
            SetWindowPos(
                hwnd,
                HWND_TOP,
                0,
                0,
                0,
                0,
                SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW,
            );
            SetForegroundWindow(hwnd);
            BringWindowToTop(hwnd);
        }
    }

    /// Re-pin widget back to desktop after user action (e.g. pressing Esc).
    pub fn repin_to_desktop(hwnd: HWND) {
        let parent = unsafe { DESKTOP_HWND };
        if parent.is_null() {
            return;
        }
        unsafe {
            SetParent(hwnd, parent);
            SetWindowPos(
                hwnd,
                HWND_TOP,
                0,
                0,
                0,
                0,
                SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW,
            );
        }
    }
}

use db::init_database;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Parse a "Modifier+Key" shortcut string like "Alt+Space" into tauri Shortcut
fn parse_shortcut(s: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = s.split('+').collect();
    if parts.len() < 2 {
        let code = parse_code(parts[0]);
        return code.map(|c| Shortcut::new(None, c));
    }
    let key_str = parts.last()?.trim();
    let code = parse_code(key_str)?;
    let mut modifier = Modifiers::empty();
    for m_str in &parts[..parts.len() - 1] {
        match m_str.trim().to_lowercase().as_str() {
            "alt" => modifier |= Modifiers::ALT,
            "ctrl" => modifier |= Modifiers::CONTROL,
            "shift" => modifier |= Modifiers::SHIFT,
            "meta" | "win" | "super" | "cmd" => modifier |= Modifiers::META,
            _ => {}
        }
    }
    Some(Shortcut::new(Some(modifier), code))
}

fn parse_code(key: &str) -> Option<Code> {
    match key.trim().to_lowercase().as_str() {
        "space" => Some(Code::Space),
        "enter" | "return" => Some(Code::Enter),
        "escape" | "esc" => Some(Code::Escape),
        "backspace" => Some(Code::Backspace),
        "tab" => Some(Code::Tab),
        "delete" => Some(Code::Delete),
        "insert" => Some(Code::Insert),
        "home" => Some(Code::Home), "end" => Some(Code::End),
        "pageup" => Some(Code::PageUp), "pagedown" => Some(Code::PageDown),
        "arrowup" | "up" => Some(Code::ArrowUp), "arrowdown" | "down" => Some(Code::ArrowDown),
        "arrowleft" | "left" => Some(Code::ArrowLeft), "arrowright" | "right" => Some(Code::ArrowRight),
        "f1" => Some(Code::F1), "f2" => Some(Code::F2), "f3" => Some(Code::F3),
        "f4" => Some(Code::F4), "f5" => Some(Code::F5), "f6" => Some(Code::F6),
        "f7" => Some(Code::F7), "f8" => Some(Code::F8), "f9" => Some(Code::F9),
        "f10" => Some(Code::F10), "f11" => Some(Code::F11), "f12" => Some(Code::F12),
        s if s.len() == 1 => {
            let c = s.chars().next().unwrap();
            if c.is_ascii_alphanumeric() {
                let upper = c.to_ascii_uppercase();
                match upper {
                    'A' => Some(Code::KeyA), 'B' => Some(Code::KeyB), 'C' => Some(Code::KeyC),
                    'D' => Some(Code::KeyD), 'E' => Some(Code::KeyE), 'F' => Some(Code::KeyF),
                    'G' => Some(Code::KeyG), 'H' => Some(Code::KeyH), 'I' => Some(Code::KeyI),
                    'J' => Some(Code::KeyJ), 'K' => Some(Code::KeyK), 'L' => Some(Code::KeyL),
                    'M' => Some(Code::KeyM), 'N' => Some(Code::KeyN), 'O' => Some(Code::KeyO),
                    'P' => Some(Code::KeyP), 'Q' => Some(Code::KeyQ), 'R' => Some(Code::KeyR),
                    'S' => Some(Code::KeyS), 'T' => Some(Code::KeyT), 'U' => Some(Code::KeyU),
                    'V' => Some(Code::KeyV), 'W' => Some(Code::KeyW), 'X' => Some(Code::KeyX),
                    'Y' => Some(Code::KeyY), 'Z' => Some(Code::KeyZ),
                    '0' => Some(Code::Digit0), '1' => Some(Code::Digit1), '2' => Some(Code::Digit2),
                    '3' => Some(Code::Digit3), '4' => Some(Code::Digit4), '5' => Some(Code::Digit5),
                    '6' => Some(Code::Digit6), '7' => Some(Code::Digit7), '8' => Some(Code::Digit8),
                    '9' => Some(Code::Digit9),
                    _ => None,
                }
            } else {
                None
            }
        }
        _ => None,
    }
}

#[tauri::command]
fn open_panel_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("panel") {
        // If the webview was destroyed (user closed), rebuild it
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn open_aichat_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("aichat") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Broadcast an event to ALL webview windows (cross-window sync)
#[tauri::command]
fn notify_all(app: tauri::AppHandle, channel: String) -> Result<(), String> {
    app.emit(&channel, ()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Register/replace the global shortcut for widget quick access
#[tauri::command]
fn register_global_shortcut(
    app: tauri::AppHandle,
    shortcut_str: String,
    _old_shortcut: Option<String>,
) -> Result<String, String> {
    // Unregister ALL shortcuts first, then register the new one.
    // Using unregister_all because unregister() re-creates a HotKey
    // with a different ID, so it doesn't match the existing registration.
    let _ = app.global_shortcut().unregister_all();

    let shortcut = parse_shortcut(&shortcut_str)
        .ok_or_else(|| format!("Cannot parse shortcut: {}", shortcut_str))?;

    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut_str, e))?;

    Ok(shortcut_str)
}

/// Re-pin the widget window back to the desktop background (call when dismissing the overlay).
#[tauri::command]
fn repin_to_desktop(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    if let Some(window) = app.get_webview_window("widget") {
        if let Some(hwnd) = desktop_pin::get_hwnd(&window) {
            desktop_pin::repin_to_desktop(hwnd);
        }
    }
    let _ = app;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("widget") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            #[cfg(target_os = "windows")]
                            if let Some(hwnd) = desktop_pin::get_hwnd(&window) {
                                desktop_pin::bring_to_front(hwnd);
                            }
                            let _ = window.emit("focus-ai-input", ());
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            init_database(app.handle()).expect("Database initialization failed");

            // Register Alt+Space global shortcut
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
                if let Err(e) = app.global_shortcut().register(Shortcut::new(
                    Some(Modifiers::ALT),
                    Code::Space,
                )) {
                    eprintln!("Failed to register Alt+Space shortcut: {}", e);
                }
            }

            // Pin widget to desktop background on Windows
            #[cfg(target_os = "windows")]
            {
                if let Some(widget) = app.get_webview_window("widget") {
                    if let Some(hwnd) = desktop_pin::get_hwnd(&widget) {
                        desktop_pin::pin_to_desktop(hwnd);
                    }
                }

                // Intercept panel close: hide instead of destroying
                if let Some(panel) = app.get_webview_window("panel") {
                    let panel_clone = panel.clone();
                    let _ = panel.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            // Hide instead of destroying, so it remains available for show()
                            api.prevent_close();
                            let _ = panel_clone.hide();
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_panel_window,
            open_aichat_window,
            notify_all,
            register_global_shortcut,
            repin_to_desktop,
            commands::ai::ai_parse,
            commands::ai::ai_chat,
            commands::blocks::get_blocks,
            commands::blocks::create_block,
            commands::blocks::update_block,
            commands::blocks::delete_block,
            commands::items::get_items,
            commands::items::get_items_by_date,
            commands::items::get_calendar_month,
            commands::items::create_item,
            commands::items::update_item,
            commands::items::delete_item,
            commands::items::run_auto_rollover,
            commands::completions::complete_item,
            commands::completions::uncomplete_item,
            commands::completions::get_completions,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            commands::sync_md::sync_to_markdown,
            commands::sync_md::pick_md_file_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
