import React from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlockSidebar } from './BlockSidebar';
import { BlockDetailArea } from './BlockDetailArea';
import { BlockCardGrid } from './BlockCardGrid';
import { SettingsPage } from './SettingsPage';
import { useBlocksStore } from '@/store/useBlocksStore';
import { useItemsStore } from '@/store/useItemsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { onDataChanged, onSettingsChanged } from '@/lib/events';
import { NotebookPen, LayoutDashboard, Settings } from 'lucide-react';

export const PanelWindow: React.FC = () => {
  const [tab, setTab] = React.useState('blocks');
  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(null);
  const blocks = useBlocksStore((s) => s.blocks);
  const config = useSettingsStore((s) => s.config);
  const fetchBlocks = useBlocksStore((s) => s.fetchBlocks);
  const fetchItems = useItemsStore((s) => s.fetchItems);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const activeBlock = blocks.find((b) => b.id === activeBlockId) || null;

  // Listen for cross-window data changes
  React.useEffect(() => {
    const unlisten = onDataChanged(() => {
      fetchBlocks();
      fetchItems();
    });
    const unlistenSettings = onSettingsChanged(() => {
      fetchSettings();
    });
    return () => {
      unlisten.then(fn => fn());
      unlistenSettings.then(fn => fn());
    };
  }, []);

  const handleSelectBlock = (id: string) => {
    setActiveBlockId(id);
  };

  const handleBack = () => {
    setActiveBlockId(null);
  };

  return (
    <ThemeProvider primaryColor={config.panel_primary_color}>
      <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center justify-between h-11 px-4 shrink-0 border-b border-border">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-foreground/70" />
            <span className="text-sm font-semibold tracking-tight">嘟豆</span>
            <span className="text-[10px] text-muted-foreground/40 font-mono">v0.1</span>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="blocks" className="text-xs gap-1.5 px-3">
                <LayoutDashboard className="h-3.5 w-3.5" />
                区块
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs gap-1.5 px-3">
                <Settings className="h-3.5 w-3.5" />
                设置
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {/* Content */}
        {tab === 'blocks' ? (
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-52 shrink-0 border-r border-border bg-muted/20 flex flex-col p-3">
              <BlockSidebar
                activeBlockId={activeBlockId}
                onSelectBlock={handleSelectBlock}
              />
            </aside>
            <main className="flex-1 overflow-y-auto p-4">
              {activeBlock ? (
                <BlockDetailArea block={activeBlock} onBack={handleBack} />
              ) : (
                <BlockCardGrid onSelectBlock={handleSelectBlock} />
              )}
            </main>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 bg-muted/20">
            <SettingsPage />
          </main>
        )}
      </div>
    </ThemeProvider>
  );
};
