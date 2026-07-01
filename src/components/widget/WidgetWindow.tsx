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
import { onSettingsChanged } from '@/lib/events';

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
  const [inputOverlayVisible, setInputOverlayVisible] = useState(false);
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
        win.setEffects({ effects: [Effect.Mica] }).catch(() => {});
      });
    } catch {
      // Not running in Tauri or API unavailable
    }
  }, []);

  // Listen for cross-window events.
  // Widget is the primary data source — settings changes need a refetch,
  // but data changes are already applied optimistically in the store.
  useEffect(() => {
    const unlistenSettings = onSettingsChanged(() => {
      fetchSettings();
    });
    return () => {
      unlistenSettings.then(fn => fn());
    };
  }, []);

  // Listen for global shortcut to show widget + focus AI input
  useEffect(() => {
    const unlisten = listen('focus-ai-input', () => {
      setInputOverlayVisible(true);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Global Esc handler: dismiss overlay and repin widget to desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inputOverlayVisible) {
        setInputOverlayVisible(false);
        invoke('repin_to_desktop').catch(() => {});
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputOverlayVisible]);

  // When overlay opens, auto-focus the AI input
  useEffect(() => {
    if (inputOverlayVisible) {
      const timer = setTimeout(() => {
        (window as any).__focusAIInput?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [inputOverlayVisible]);

  const days = calendarData?.days || [];
  const visibleBlocks = blocks.filter((b) => b.show_on_desktop);

  const bgAlpha = Math.max(0.15, 0.95 - config.widget_opacity * 0.90);
  const tintColor = config.widget_primary_color;

  const handleOpenPanel = () => { invoke('open_panel_window'); };

  const handleToggleComplete = useCallback(async (itemId: string, date: string, currentlyCompleted: boolean) => {
    if (currentlyCompleted) {
      await uncompleteItem(itemId, date);
    } else {
      await completeItem(itemId, date);
    }
    // Store handles optimistic update — no refetch needed
  }, [completeItem, uncompleteItem]);

  return (
    <ThemeProvider primaryColor={config.widget_primary_color}>
      <style>{`body { background: transparent !important; }`}</style>
      <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-transparent" style={{ fontSize: config.widget_font_size + 'px', color: config.widget_text_color || undefined }}>
        {/* Frosted glass background: tint color + blur + transparency — always visible for Acrylic blur effect */}
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

        {/* Esc hint — top-left corner, only visible in overlay mode */}
        {inputOverlayVisible && (
          <div className="absolute top-3 left-4 z-30 text-[10px] text-white/50 pointer-events-none select-none">
            Esc 退出
          </div>
        )}

        {/* AI input bar — full width at bottom */}
        <div className={`relative ${inputOverlayVisible ? 'z-30' : 'z-10'}`}>
          <AIInputBar
            onOpenPanel={handleOpenPanel}
            year={year}
            month={month}
          />
          {/* Extra "记录" hint when overlay is visible */}
          {inputOverlayVisible && (
            <div className="text-center pb-2 text-[10px] text-white/40 pointer-events-none select-none">
              回车记录
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};
