import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Item, CreateItemInput, UpdateItemInput, CompletionRecord, CalendarMonthData } from '../types';
import { emitDataChanged } from '@/lib/events';

interface ItemsState {
  items: Item[];
  completions: CompletionRecord[];
  calendarData: CalendarMonthData | null;
  loading: boolean;
  fetchItems: () => Promise<void>;
  fetchCalendarMonth: (year: number, month: number) => Promise<void>;
  createItem: (input: CreateItemInput) => Promise<Item>;
  updateItem: (input: UpdateItemInput) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  completeItem: (itemId: string, date: string) => Promise<CompletionRecord>;
  uncompleteItem: (itemId: string, date: string) => Promise<Item>;
}

export const useItemsStore = create<ItemsState>((set) => ({
  items: [],
  completions: [],
  calendarData: null,
  loading: false,
  fetchItems: async () => {
    set({ loading: true });
    const items = await invoke<Item[]>('get_items', { blockId: null });
    set({ items, loading: false });
  },
  fetchCalendarMonth: async (year, month) => {
    const data = await invoke<CalendarMonthData>('get_calendar_month', { year, month });
    set({ calendarData: data });
  },
  createItem: async (input) => {
    const item = await invoke<Item>('create_item', { input });
    set((s) => ({ items: [item, ...s.items] }));
    emitDataChanged();
    invoke('sync_to_markdown').catch(() => {});
    return item;
  },
  updateItem: async (input) => {
    const item = await invoke<Item>('update_item', { input });
    set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) }));
    emitDataChanged();
    invoke('sync_to_markdown').catch(() => {});
    return item;
  },
  deleteItem: async (id) => {
    await invoke('delete_item', { id });
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    emitDataChanged();
    invoke('sync_to_markdown').catch(() => {});
  },
  completeItem: async (itemId, date) => {
    const record = await invoke<CompletionRecord>('complete_item', { itemId, date });
    set((s) => ({
      completions: [...s.completions, record],
      items: s.items.map((i) =>
        i.id === itemId
          ? { ...i, block_id: record.original_block_id, status: 'completed' as const, completed_at: record.completed_at }
          : i
      ),
      calendarData: s.calendarData ? {
        ...s.calendarData,
        days: s.calendarData.days.map((d) => ({
          ...d,
          items: d.items.map((iwc) =>
            iwc.item.id === itemId ? { ...iwc, completed_on_this_date: true } : iwc
          ),
        })),
      } : null,
    }));
    emitDataChanged();
    invoke('sync_to_markdown').catch(() => {});
    return record;
  },
  uncompleteItem: async (itemId, date) => {
    const restored = await invoke<Item>('uncomplete_item', { itemId, date });
    set((s) => ({
      completions: s.completions.filter((c) => c.item_id !== itemId),
      items: s.items.map((i) => (i.id === itemId ? restored : i)),
      calendarData: s.calendarData ? {
        ...s.calendarData,
        days: s.calendarData.days.map((d) => ({
          ...d,
          items: d.items.map((iwc) =>
            iwc.item.id === itemId ? { ...iwc, completed_on_this_date: false, item: restored } : iwc
          ),
        })),
      } : null,
    }));
    emitDataChanged();
    invoke('sync_to_markdown').catch(() => {});
    return restored;
  },
}));
