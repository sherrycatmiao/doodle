import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { BlockCard } from './BlockCard';
import { AIInputBar } from './AIInputBar';
import { useBlocksStore } from '@/store/useBlocksStore';
import { useItemsStore } from '@/store/useItemsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { invoke } from '@tauri-apps/api/core';
import { onDataChanged, onSettingsChanged } from '@/lib/events';

export const WidgetWindow = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const blocks = useBlocksStore((s) => s.blocks);
  const fetchBlocks = useBlocksStore((s) => s.fetchBlocks);
  const calendarData = useItemsStore((s) => s.calendarData);
  const fetchCalendarMonth = useItemsStore((s) => s.fetchCalendarMonth);
  const completeItem = useItemsStore((s) => s.completeItem);
  const uncompleteItem = useItemsStore((s) => s.uncompleteItem);
  const config = useSettingsStore((s) => s.config);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => { fetchBlocks(); }, []);
  useEffect(() => { fetchCalendarMonth(year, month); }, [year, month]);

  // Listen for cross-window events (panel changes sync)
  useEffect(() => {
    const unlisten = onDataChanged(() => {
      fetchBlocks();
      fetchCalendarMonth(year, month);
    });
    const unlistenSettings = onSettingsChanged(() => {
      fetchSettings();
    });
    return () => {
      unlisten.then(fn => fn());
      unlistenSettings.then(fn => fn());
    };
  }, [year, month]);

  // Listen for Alt+Space global shortcut to focus AI input
  useEffect(() => {
    const unlisten = listen('focus-ai-input', () => {
      (window as any).__focusAIInput?.();
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const days = calendarData?.days || [];
  const visibleBlocks = blocks.filter((b) => b.show_on_desktop);

  const handleOpenPanel = () => { invoke('open_panel_window'); };

  const handleToggleComplete = useCallback(async (itemId: string, date: string, currentlyCompleted: boolean) => {
    if (currentlyCompleted) {
      await uncompleteItem(itemId, date);
    } else {
      await completeItem(itemId, date);
    }
    fetchCalendarMonth(year, month);
    fetchBlocks();
  }, [year, month, completeItem, uncompleteItem, fetchCalendarMonth, fetchBlocks]);

  return (
    <ThemeProvider>
      <div className="w-screen h-screen flex flex-col overflow-hidden bg-transparent" style={{ opacity: config.widget_opacity }}>
        {/* Main content: left-right split */}
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
          {/* Left: Calendar (~60%) */}
          <div style={{ flex: '3' }} className="flex flex-col overflow-hidden min-w-0">
            <GlassPanel className="mx-2 mt-2 flex-1 flex flex-col overflow-hidden">
              <CalendarHeader
                year={year} month={month}
                onPrevMonth={() => setMonth(m => m === 1 ? (setYear(y => y - 1), 12) : m - 1)}
                onNextMonth={() => setMonth(m => m === 12 ? (setYear(y => y + 1), 1) : m + 1)}
              />
              <div className="flex-1 overflow-y-auto">
                <MonthView days={days} onToggleComplete={handleToggleComplete} />
              </div>
            </GlassPanel>
          </div>

          {/* Right: Blocks (~40%) */}
          <div style={{ flex: '2' }} className="overflow-y-auto px-2 pb-1 min-h-0">
            {visibleBlocks.length > 0 ? (
              <div className="space-y-2 pt-2">
                {visibleBlocks.map((block) => (
                  <BlockCard key={block.id} block={block} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                没有可见区块，打开主面板添加
              </div>
            )}
          </div>
        </div>

        {/* AI input bar — full width at bottom */}
        <AIInputBar onOpenPanel={handleOpenPanel} year={year} month={month} />
      </div>
    </ThemeProvider>
  );
};
