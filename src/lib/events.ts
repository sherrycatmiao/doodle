import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export const CHANNEL_DATA_CHANGED = 'app://data-changed';
export const CHANNEL_SETTINGS_CHANGED = 'app://settings-changed';

/** Counter-based self-broadcast suppression.
 *  Each emit increments a counter; listeners decrement it.
 *  Only refetch when the counter is 0 (meaning the event came from another window).
 *  Cap at 16 — safety valve in case spurious events arrive. */
let _pendingLocalEmits = 0;
const MAX_PENDING = 16;
export function markLocalEmit() { _pendingLocalEmits = Math.min(_pendingLocalEmits + 1, MAX_PENDING); }
function consumeLocalEmit(): boolean {
  if (_pendingLocalEmits > 0) { _pendingLocalEmits--; return true; }
  return false;
}

export function emitDataChanged() {
  markLocalEmit();
  invoke('notify_all', { channel: CHANNEL_DATA_CHANGED });
}

export function emitSettingsChanged() {
  invoke('notify_all', { channel: CHANNEL_SETTINGS_CHANGED });
}

export function onDataChanged(callback: () => void) {
  return listen(CHANNEL_DATA_CHANGED, () => {
    if (consumeLocalEmit()) return;
    callback();
  });
}

export function onSettingsChanged(callback: () => void) {
  return listen(CHANNEL_SETTINGS_CHANGED, callback);
}
