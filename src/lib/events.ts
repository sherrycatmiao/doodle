import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export const CHANNEL_DATA_CHANGED = 'app://data-changed';
export const CHANNEL_SETTINGS_CHANGED = 'app://settings-changed';

/** Emit an event that ALL windows receive (via Rust backend broadcast) */
export function emitDataChanged() {
  invoke('notify_all', { channel: CHANNEL_DATA_CHANGED });
}

export function emitSettingsChanged() {
  invoke('notify_all', { channel: CHANNEL_SETTINGS_CHANGED });
}

export function onDataChanged(callback: () => void) {
  return listen(CHANNEL_DATA_CHANGED, callback);
}

export function onSettingsChanged(callback: () => void) {
  return listen(CHANNEL_SETTINGS_CHANGED, callback);
}
