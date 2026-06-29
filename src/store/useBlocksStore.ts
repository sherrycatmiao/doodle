import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Block } from '../types';
import { emitDataChanged } from '@/lib/events';

interface BlocksState {
  blocks: Block[];
  loading: boolean;
  fetchBlocks: () => Promise<void>;
  createBlock: (name: string, icon: string, color: string) => Promise<Block>;
  updateBlock: (id: string, updates: Partial<Pick<Block, 'name' | 'icon' | 'color' | 'show_on_desktop'>>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
}

export const useBlocksStore = create<BlocksState>((set) => ({
  blocks: [],
  loading: false,
  fetchBlocks: async () => {
    set({ loading: true });
    const blocks = await invoke<Block[]>('get_blocks');
    set({ blocks, loading: false });
  },
  createBlock: async (name, icon, color) => {
    const block = await invoke<Block>('create_block', { name, icon, color });
    set((s) => ({ blocks: [...s.blocks, block] }));
    emitDataChanged();
    return block;
  },
  updateBlock: async (id, updates) => {
    const block = await invoke<Block>('update_block', { id, ...updates });
    set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? block : b)) }));
    emitDataChanged();
  },
  deleteBlock: async (id) => {
    await invoke('delete_block', { id });
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) }));
    emitDataChanged();
  },
}));
