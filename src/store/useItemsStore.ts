import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Item, CreateItemInput, UpdateItemInput, CompletionRecord, CalendarMonthData } from '../types';
import { emitDataChanged } from '@/lib/events';

interface ItemsState {
  items: Item[];
  completions: CompletionRecord[];
  calendarData: CalendarMonthData | null;
  loading: boolean;
  /** Fetch ALL items (no blockId filter — sets the global items array) */
  fetchItems: () => Promise<void>;
  fetchCalendarMonth: (year: number, month: number) => Promise<void>;
  createItem: (input: CreateItemInput) => Promise<Item>;
  updateItem: (input: UpdateItemInput) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  completeItem: (itemId: string, date: string) => Promise<CompletionRecord>;
  uncompleteItem: (itemId: string, date: string) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
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
    return item;
  },
  updateItem: async (input) => {
    const item = await invoke<Item>('update_item', { input });
    set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) }));
    emitDataChanged();
    return item;
  },
  deleteItem: async (id) => {
    await invoke('delete_item', { id });
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    emitDataChanged();
  },
  completeItem: async (itemId, date) => {
    const record = await invoke<CompletionRecord>('complete_item', { itemId, date });
    set((s) => ({ completions: [...s.completions, record] }));
    // Refresh items and calendar
    get().fetchItems();
    const cd = get().calendarData;
    if (cd) get().fetchCalendarMonth(cd.year, cd.month);
    emitDataChanged();
    return record;
  },
  uncompleteItem: async (itemId, date) => {
    await invoke('uncomplete_item', { itemId, date });
    set((s) => ({ completions: s.completions.filter((c) => !(c.item_id === itemId && c.completed_date === date)) }));
    get().fetchItems();
    const cd = get().calendarData;
    if (cd) get().fetchCalendarMonth(cd.year, cd.month);
    emitDataChanged();
  },
}));
