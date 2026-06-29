import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIState {
  messages: ChatMessage[];
  loading: boolean;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  aiChat: (text: string) => Promise<string>;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  loading: false,
  addMessage: (role, content) => {
    set((s) => ({ messages: [...s.messages, { role, content }] }));
  },
  aiChat: async (text) => {
    // Add user message immediately for UI responsiveness
    const userMsg: ChatMessage = { role: 'user', content: text };
    set((s) => ({ messages: [...s.messages, userMsg], loading: true }));

    try {
      const allMessages = [...get().messages];
      const reply = await invoke<string>('ai_chat', {
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        loading: false,
      }));
      return reply;
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `请求失败: ${err}`,
      };
      set((s) => ({
        messages: [...s.messages, errorMsg],
        loading: false,
      }));
      return '';
    }
  },
  clearMessages: () => set({ messages: [] }),
}));
