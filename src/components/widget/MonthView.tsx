import React from 'react';
import { CalendarCell } from './CalendarCell';
import type { CalendarDay } from '../../types';

interface Props {
  days: CalendarDay[];
  onToggleComplete?: (itemId: string, date: string, currentlyCompleted: boolean) => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export const MonthView: React.FC<Props> = ({ days, onToggleComplete }) => {
  return (
    <div className="px-2 pb-2">
      <div className="grid grid-cols-7 text-[10px] text-center mb-1 text-muted-foreground/50">
        {WEEKDAYS.map((d) => (<div key={d}>{d}</div>))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <CalendarCell
            key={day.date}
            date={day.date}
            dayOfMonth={day.day_of_month}
            isCurrentMonth={day.is_current_month}
            isToday={day.is_today}
            items={day.items}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    </div>
  );
};
