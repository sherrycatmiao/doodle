import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { ItemWithCompletion } from '@/types';
import { PRIORITY_COLORS } from '@/components/theme/themeConfig';
import { cn } from '@/lib/utils';

interface Props {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: ItemWithCompletion[];
  onToggleComplete?: (itemId: string, date: string, currentlyCompleted: boolean) => void;
}

export const CalendarCell: React.FC<Props> = ({ date, dayOfMonth, isCurrentMonth, isToday, items, onToggleComplete }) => {
  if (dayOfMonth === 0) return <div className="min-h-[85px]" />;

  const urgentCount = items.filter(i => i.item.priority === 'urgent_important' && !i.completed_on_this_date).length;

  return (
    <div
      className={cn(
        'min-h-[85px] p-0.5 rounded border text-[10px] flex flex-col overflow-hidden transition-colors',
        isToday && 'bg-accent/15 border-accent/30',
        !isCurrentMonth && 'opacity-20',
        isCurrentMonth && !isToday && 'border-transparent hover:bg-accent/10',
        urgentCount > 0 && 'border-destructive/40 shadow-[0_0_4px_rgba(239,68,68,0.15)]',
      )}
    >
      <div
        className={cn(
          'font-medium leading-tight mb-px px-0.5',
          isToday ? 'text-primary' : 'text-foreground/70',
        )}
      >
        {dayOfMonth}
      </div>
      <div className="flex-1 space-y-px overflow-hidden">
        {items.slice(0, 6).map((iwc) => (
          <div
            key={iwc.item.id}
            className="flex items-center gap-1 rounded-sm hover:bg-accent/20 px-0.5 py-px cursor-pointer"
            onClick={() => onToggleComplete?.(iwc.item.id, date, iwc.completed_on_this_date)}
            title={iwc.item.content}
          >
            <Checkbox
              checked={iwc.completed_on_this_date}
              className="h-3 w-3 border shrink-0 [&>span>svg]:h-[7px] [&>span>svg]:w-[7px]"
              style={{
                borderColor: iwc.completed_on_this_date ? '#22c55e' : (PRIORITY_COLORS[iwc.item.priority] || '#737373'),
              }}
            />
            <span
              className={cn(
                'truncate leading-tight',
                iwc.completed_on_this_date && 'line-through text-muted-foreground/40',
              )}
            >
              {iwc.item.content}
            </span>
          </div>
        ))}
        {items.length > 6 && (
          <div className="text-[8px] pl-3 text-muted-foreground/50">
            +{items.length - 6}
          </div>
        )}
      </div>
    </div>
  );
};
