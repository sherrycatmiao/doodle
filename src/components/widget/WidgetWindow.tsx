import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, Effect } from '@tauri-apps/api/window';
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

/** Convert hex to rgba */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

  // Enable Windows Acrylic backdrop for native frosted glass effect
  useEffect(() => {
    try {
      const win = getCurrentWindow();
      win.setEffects({ effects: [Effect.Acrylic] }).catch(() => {
        // Fallback: Mica on Windows 11 if acrylic isn't available
        win.setEffects({ effects: [Effect.Mica] }).catch(() => {});
      });
    } catch {
      // Not running in Tauri or API unavailable
    }
  }, []);

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

  // Background tint: use widget_primary_color as the frosted glass tint color
  // Transparency slider: higher = more transparent
  // Maps slider 0.1→0.9 to alpha 0.85→0.15
  const bgAlpha = Math.max(0.15, 0.95 - config.widget_opacity * 0.90);
  const tintColor = config.widget_primary_color;

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
    <ThemeProvider primaryColor={config.widget_primary_color}>
      <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-transparent" style={{ fontSize: config.widget_font_size + 'px' }}>
        {/* Frosted glass background: tint color + blur + transparency */}
        <div className="absolute inset-0 backdrop-blur-2xl" />
        <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(tintColor, bgAlpha) }} />

        {/* Content layer */}
        <div className="relative z-10 flex-1 flex flex-row overflow-hidden min-h-0">
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
              <div className="flex items-center justify-center h-full text-muted-foreground" style={{ fontSize: '0.85em' }}>
                没有可见区块，打开主面板添加
              </div>
            )}
          </div>
        </div>

        {/* AI input bar — full width at bottom */}
        <div className="relative z-10">
          <AIInputBar onOpenPanel={handleOpenPanel} year={year} month={month} />
        </div>
      </div>
    </ThemeProvider>
  );
};
