import React from 'react';
import { Card } from '@/components/ui/card';
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
    <Card className="h-full flex flex-col bg-card/70 backdrop-blur-sm border-border/40 shadow-none">
      {/* Drag handle */}
      <div className="drag-handle flex items-center gap-1.5 px-2.5 pt-2 pb-1 cursor-grab active:cursor-grabbing select-none">
        <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
        <div className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/5" style={{ backgroundColor: block.color }} />
        <span className="text-xs font-medium text-card-foreground/80 truncate flex-1">{block.name}</span>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums">{blockItems.length}</span>
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
            <span className="text-[11px] truncate leading-tight text-card-foreground/70">
              {item.content}
            </span>
            {item.due_date && (
              <span className="text-[9px] shrink-0 text-muted-foreground/40">
                {item.due_date.slice(5)}
              </span>
            )}
          </div>
        ))}
        {blockItems.length === 0 && (
          <div className="text-[10px] italic text-muted-foreground/30 py-1">暂无内容</div>
        )}
      </div>
    </Card>
  );
};
