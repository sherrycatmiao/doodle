import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useItemsStore } from '@/store/useItemsStore';
import type { Block } from '@/types';
import { PRIORITY_COLORS } from '@/components/theme/themeConfig';
import { GripVertical } from 'lucide-react';

interface Props {
  block: Block;
}

export const BlockCard: React.FC<Props> = ({ block }) => {
  const items = useItemsStore((s) => s.items);
  const fetchItems = useItemsStore((s) => s.fetchItems);
  const completeItem = useItemsStore((s) => s.completeItem);
  const uncompleteItem = useItemsStore((s) => s.uncompleteItem);

  React.useEffect(() => {
    fetchItems();
  }, []);

  const blockItems = items
    .filter((i) => i.block_id === block.id && i.status === 'active')
    .slice(0, 8);

  const handleToggleComplete = async (itemId: string, currentlyCompleted: boolean) => {
    const today = new Date().toISOString().slice(0, 10);
    if (currentlyCompleted) {
      await uncompleteItem(itemId, today);
    } else {
      await completeItem(itemId, today);
    }
  };

  return (
    <div className="h-full flex flex-col rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] dark:from-white/[0.06] dark:to-white/[0.01] backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5">
      {/* Drag handle */}
      <div className="drag-handle flex items-center gap-1.5 px-2.5 pt-2 pb-1 cursor-grab active:cursor-grabbing select-none">
        <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
        <div className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/5" style={{ backgroundColor: block.color }} />
        <span className="font-medium text-card-foreground/80 truncate flex-1">{block.name}</span>
        <span className="text-muted-foreground/50 tabular-nums" style={{ fontSize: '0.85em' }}>{blockItems.length}</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-0.5 min-h-0">
        {blockItems.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 py-0.5">
            <Checkbox
              checked={false}
              onCheckedChange={() => handleToggleComplete(item.id, false)}
              className="h-3 w-3 rounded-full shrink-0 [&>span>svg]:h-[7px] [&>span>svg]:w-[7px]"
              style={{ borderColor: PRIORITY_COLORS[item.priority] || '#a3a3a3' }}
            />
            <span className="truncate leading-tight text-card-foreground/70">
              {item.content}
            </span>
            {item.due_date && (
              <span className="shrink-0 text-muted-foreground/40" style={{ fontSize: '0.75em' }}>
                {item.due_date.slice(5)}
              </span>
            )}
          </div>
        ))}
        {blockItems.length === 0 && (
          <div className="italic text-muted-foreground/30 py-1" style={{ fontSize: '0.85em' }}>暂无内容</div>
        )}
      </div>
    </div>
  );
};
