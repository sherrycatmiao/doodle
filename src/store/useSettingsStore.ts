	import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ThemeConfig, ThemeName, ThemeMode } from '../types';
import { emitSettingsChanged } from '@/lib/events';

interface SettingsState {
  config: ThemeConfig;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  setTheme: (theme: ThemeName) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  setWidgetOpacity: (opacity: number) => Promise<void>;
  setWidgetColor: (color: string) => Promise<void>;
  setWidgetTextColor: (color: string) => Promise<void>;
  setPanelColor: (color: string) => Promise<void>;
  setWidgetFontSize: (size: number) => Promise<void>;
  setAiKey: (key: string) => Promise<void>;
  setMdFilePath: (path: string) => Promise<void>;
  setHotkeyShortcut: (shortcut: string) => Promise<void>;
}

const defaultConfig: ThemeConfig = {
  theme: 'tech',
  mode: 'dark',
  widget_opacity: 0.85,
  widget_primary_color: '#6366f1',
  widget_text_color: '',
  panel_primary_color: '#6366f1',
  widget_font_size: 11,
  ai_api_key: '',
  ai_model: 'claude-sonnet-4-6',
  ai_endpoint: 'https://api.anthropic.com/v1/messages',
  md_file_path: '',
  hotkey_shortcut: 'Alt+Space',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: defaultConfig,
  loading: false,
  fetchSettings: async () => {
    const pairs = await invoke<[string, string][]>('get_all_settings');
    const config = { ...defaultConfig };
    for (const [key, value] of pairs) {
      switch (key) {
        case 'widget_opacity': config.widget_opacity = parseFloat(value); break;
        case 'theme': config.theme = value as ThemeName; break;
        case 'mode': config.mode = value as ThemeMode; break;
        case 'widget_primary_color': config.widget_primary_color = value; break;
        case 'widget_text_color': config.widget_text_color = value; break;
        case 'panel_primary_color': config.panel_primary_color = value; break;
        case 'widget_font_size': config.widget_font_size = parseInt(value, 10); break;
        case 'ai_api_key': config.ai_api_key = value; break;
        case 'ai_model': config.ai_model = value; break;
        case 'ai_endpoint': config.ai_endpoint = value; break;
        case 'md_file_path': config.md_file_path = value; break;
        case 'hotkey_shortcut': config.hotkey_shortcut = value; break;
      }
    }
    set({ config });
  },
  setSetting: async (key, value) => {
    await invoke('set_setting', { key, value });
    set((s) => ({ config: { ...s.config, [key]: value } }));
    emitSettingsChanged();
  },
  setTheme: async (theme) => { await get().setSetting('theme', theme); },
  setMode: async (mode) => { await get().setSetting('mode', mode); },
  setWidgetOpacity: async (opacity) => { await get().setSetting('widget_opacity', opacity.toString()); },
  setWidgetColor: async (color) => { await get().setSetting('widget_primary_color', color); },
  setWidgetTextColor: async (color) => { await get().setSetting('widget_text_color', color); },
  setPanelColor: async (color) => { await get().setSetting('panel_primary_color', color); },
  setWidgetFontSize: async (size) => { await get().setSetting('widget_font_size', size.toString()); },
  setAiKey: async (key) => { await get().setSetting('ai_api_key', key); },
  setMdFilePath: async (path) => { await get().setSetting('md_file_path', path); },
  setHotkeyShortcut: async (shortcut) => {
    const oldShortcut = get().config.hotkey_shortcut;
    await get().setSetting('hotkey_shortcut', shortcut);
    // Re-register the global shortcut in Rust
    try {
      await invoke('register_global_shortcut', {
        shortcutStr: shortcut,
        oldShortcut: oldShortcut || null,
      });
    } catch (err) {
      console.error('Failed to re-register shortcut:', err);
      // Revert on failure
      await get().setSetting('hotkey_shortcut', oldShortcut);
      throw err;
    }
  },
}));
