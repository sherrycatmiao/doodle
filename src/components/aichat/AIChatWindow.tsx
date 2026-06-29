import { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIStore } from '@/store/useAIStore';
import { useBlocksStore } from '@/store/useBlocksStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { invoke } from '@tauri-apps/api/core';
import type { Item } from '@/types';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const AIChatWindow: React.FC = () => {
  const { messages, loading, aiChat, addMessage, clearMessages } = useAIStore();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // On mount, show greeting with context
  useEffect(() => {
    const initChat = async () => {
      if (messages.length > 0) return;

      addMessage('assistant', '你好！我是嘟豆 AI 助手。我可以帮你管理待办事项、回答问题、提供建议。跟我说说你想做什么吧 😊');

      const blocks = useBlocksStore.getState().blocks;
      if (blocks.length > 0) {
        const blockNames = blocks.map((b) => b.name).join('、');
        const activeItems = await invoke<Item[]>('get_items', { blockId: null });
        const active = activeItems.filter((i) => i.status === 'active');
        if (active.length > 0) {
          const itemList = active
            .slice(0, 20)
            .map((i) => `- ${i.content}${i.due_date ? ` (${i.due_date})` : ''}`)
            .join('\n');
          addMessage('assistant', `当前区块：${blockNames}\n\n你当前有 ${active.length} 个待办事项：\n\n${itemList}\n\n有什么需要帮忙的吗？`);
        }
      }
    };
    initChat();
  }, []);

  const handleSend = async () => {
    if (!text.trim() || loading) return;
    const msg = text.trim();
    setText('');
    await aiChat(msg);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    const win = getCurrentWindow();
    win.hide();
  };

  return (
    <ThemeProvider primaryColor={useSettingsStore.getState().config.panel_primary_color}>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0" data-tauri-drag-region>
          <Bot className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight flex-1">AI 助手</h1>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border/40 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-[75%] rounded-xl rounded-tl-sm px-3.5 py-2.5 bg-card border border-border/40">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Sentinel for auto-scroll */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="输入消息... (Enter 发送)"
              className="text-xs h-9"
              disabled={loading}
              autoFocus
            />
            <Button
              onClick={handleSend}
              disabled={loading || !text.trim()}
              size="sm"
              className="h-9 px-3 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              发送
            </Button>
          </div>
          <div className="flex justify-center mt-2">
            <Button
              onClick={clearMessages}
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground/40 hover:text-muted-foreground gap-1"
            >
              <Sparkles className="h-3 w-3" />
              清空对话
            </Button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};
