import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export const CalendarHeader: React.FC<Props> = ({ year, month, onPrevMonth, onNextMonth }) => {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 select-none" data-tauri-drag-region>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/70 hover:text-foreground" onClick={onPrevMonth}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="font-medium text-foreground/80 min-w-[7rem] text-center select-none" style={{ fontSize: '1.1em' }}>
          {year}年 {MONTH_NAMES[month - 1]}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/70 hover:text-foreground" onClick={onNextMonth}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
