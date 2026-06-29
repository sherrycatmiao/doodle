import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBlocksStore } from '@/store/useBlocksStore';
import { useItemsStore } from '@/store/useItemsStore';
import { PRIORITY_COLORS } from '@/components/theme/themeConfig';
import { Inbox } from 'lucide-react';

interface Props {
  onSelectBlock: (id: string) => void;
}

export const BlockCardGrid: React.FC<Props> = ({ onSelectBlock }) => {
  const blocks = useBlocksStore((s) => s.blocks);
  const items = useItemsStore((s) => s.items);
  const fetchItems = useItemsStore((s) => s.fetchItems);

  React.useEffect(() => {
    fetchItems();
  }, []);

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <Inbox className="h-10 w-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground/50">还没有区块</p>
        <p className="text-xs text-muted-foreground/30">在左侧栏新建一个区块开始使用</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max">
      {blocks.map((block) => {
        const blockItems = items.filter(
          (i) => i.block_id === block.id && i.status === 'active'
        );
        const count = blockItems.length;

        return (
          <Card
            key={block.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 active:scale-[0.98]"
            onClick={() => onSelectBlock(block.id)}
          >
            <CardHeader className="p-3 pb-0 flex-row items-center gap-2 space-y-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5"
                style={{ backgroundColor: block.color }}
              />
              <CardTitle className="text-xs font-medium flex-1 truncate">
                {block.name}
              </CardTitle>
              <Badge variant="secondary" className="text-[9px] h-4 px-1 font-normal">
                {count}
              </Badge>
            </CardHeader>
            <CardContent className="p-3 pt-1.5 space-y-0.5 min-h-[3rem]">
              {blockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[item.priority] || '#a3a3a3' }}
                  />
                  <span className="truncate text-muted-foreground">{item.content}</span>
                  {item.due_date && (
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">
                      {item.due_date.slice(5)}
                    </span>
                  )}
                </div>
              ))}
              {blockItems.length === 0 && (
                <div className="text-[10px] italic text-muted-foreground/30 py-1">暂无事项</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
