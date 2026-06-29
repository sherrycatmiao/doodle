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
  setPanelColor: (color: string) => Promise<void>;
  setAiKey: (key: string) => Promise<void>;
}

const defaultConfig: ThemeConfig = {
  theme: 'tech',
  mode: 'dark',
  widget_opacity: 0.85,
  widget_primary_color: '#6366f1',
  panel_primary_color: '#6366f1',
  ai_api_key: '',
  ai_model: 'claude-sonnet-4-6',
  ai_endpoint: 'https://api.anthropic.com/v1/messages',
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
        case 'panel_primary_color': config.panel_primary_color = value; break;
        case 'ai_api_key': config.ai_api_key = value; break;
        case 'ai_model': config.ai_model = value; break;
        case 'ai_endpoint': config.ai_endpoint = value; break;
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
  setPanelColor: async (color) => { await get().setSetting('panel_primary_color', color); },
  setAiKey: async (key) => { await get().setSetting('ai_api_key', key); },
}));
