import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invoke } from '@tauri-apps/api/core';
import { useBlocksStore } from '@/store/useBlocksStore';
import { useItemsStore } from '@/store/useItemsStore';
import { Sparkles, PanelRightOpen, Bot } from 'lucide-react';

interface Props {
  onOpenPanel?: () => void;
  year?: number;
  month?: number;
}

export const AIInputBar: React.FC<Props> = ({ onOpenPanel, year, month }) => {
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const blocks = useBlocksStore((s) => s.blocks);
  const fetchBlocks = useBlocksStore((s) => s.fetchBlocks);
  const createItem = useItemsStore((s) => s.createItem);
  const fetchCalendarMonth = useItemsStore((s) => s.fetchCalendarMonth);

  React.useEffect(() => {
    (window as any).__focusAIInput = () => inputRef.current?.focus();
  }, []);

  const getOrCreateBlock = (blockName: string) => {
    // Try exact match first
    let block = blocks.find(b => b.name === blockName);
    if (block) return block;

    // Try case-insensitive match
    block = blocks.find(b => b.name.toLowerCase() === blockName.toLowerCase());
    if (block) return block;

    // Try partial match: block name contains AI's result or vice versa
    block = blocks.find(b => blockName.includes(b.name) || b.name.includes(blockName));
    if (block) return block;

    // Try keyword matching — e.g. "买东西" matches block name "购物清单" via "买" keyword
    const keywords = blockName.replace(/[的了我]/g, '').split('').filter(c => c.match(/[一-鿿]/));
    for (const keyword of keywords) {
      block = blocks.find(b => b.name.includes(keyword));
      if (block) return block;
    }

    // Fall back to "待办" or first available
    block = blocks.find(b => b.name === '待办') || blocks[0];
    return block;
  };

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const results = await invoke<{ content: string; date: string | null; item_type: string; priority: string; block_name: string; reason: string | null }[]>('ai_parse', { text: text.trim() });
      for (const result of results) {
        const block = getOrCreateBlock(result.block_name);
        if (!block) continue;
        // If AI specified a date, always link to calendar
        const dueDate = result.date || null;
        await createItem({
          block_id: block.id, content: result.content, item_type: result.item_type,
          priority: result.priority, due_date: dueDate, is_date_linked: dueDate !== null,
        });
      }
      setText('');
      if (year && month) await fetchCalendarMonth(year, month);
      fetchBlocks();
    } catch (err) {
      console.error('AI parse error:', err);
      alert(`AI 解析失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel className="mx-2 mb-2">
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <Sparkles className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder="记录灵感、待办... (Alt+Space)"
          className="flex-1 h-8 bg-transparent border-0 shadow-none px-1 placeholder:text-muted-foreground/30" style={{ fontSize: '1em' }}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          size="sm"
          className="h-7 px-2.5 gap-1"
          style={{ fontSize: '0.85em' }}
        >
          {loading ? <span className="animate-pulse">...</span> : <><Sparkles className="h-3 w-3" /> 记录</>}
        </Button>
        <Button
          onClick={onOpenPanel}
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-foreground/50 hover:text-foreground"
          style={{ fontSize: '0.85em' }}
        >
          <PanelRightOpen className="h-3 w-3" />
        </Button>
        <Button
          onClick={() => invoke('open_aichat_window')}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-foreground/50 hover:text-foreground"
          title="AI 助手"
        >
          <Bot className="h-3.5 w-3.5" />
        </Button>
      </div>
    </GlassPanel>
  );
};
