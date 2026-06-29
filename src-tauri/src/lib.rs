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
    /// Then after 3 seconds re-pin to desktop so Win+D still works.
    pub fn bring_to_front(hwnd: HWND) {
        unsafe {
            SetParent(hwnd, std::ptr::null_mut());
            SetWindowPos(
                hwnd,
                HWND_NOTOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW,
            );
            SetForegroundWindow(hwnd);
            BringWindowToTop(hwnd);
        }

        // Deferred re-pin to desktop background
        let parent = unsafe { DESKTOP_HWND };
        if !parent.is_null() {
            let raw = hwnd as usize;
            let par = parent as usize;
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                unsafe {
                    SetParent(raw as HWND, par as HWND);
                    SetWindowPos(
                        raw as HWND,
                        HWND_TOP,
                        0,
                        0,
                        0,
                        0,
                        SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW,
                    );
                }
            });
        }
    }
}

use db::init_database;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

#[tauri::command]
fn open_panel_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("panel") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed
                        && shortcut.matches(Modifiers::ALT, Code::Space)
                    {
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
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_panel_window,
            open_aichat_window,
            notify_all,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
