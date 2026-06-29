import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useBlocksStore } from '@/store/useBlocksStore';
import type { Block } from '@/types';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Trash2, Plus, Layers } from 'lucide-react';

interface Props {
  activeBlockId: string | null;
  onSelectBlock: (id: string) => void;
}

export const BlockSidebar: React.FC<Props> = ({ activeBlockId, onSelectBlock }) => {
  const blocks = useBlocksStore((s) => s.blocks);
  const updateBlock = useBlocksStore((s) => s.updateBlock);
  const [editing, setEditing] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const createBlock = useBlocksStore((s) => s.createBlock);
  const deleteBlock = useBlocksStore((s) => s.deleteBlock);
  const [deleteTarget, setDeleteTarget] = React.useState<Block | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createBlock(newName.trim(), 'todo', '#6366f1');
    setNewName('');
    setEditing(false);
  };

  const handleToggleShow = async (block: Block) => {
    await updateBlock(block.id, { show_on_desktop: !block.show_on_desktop });
  };

  const handleDelete = async (block: Block) => {
    await deleteBlock(block.id);
    setDeleteTarget(null);
  };

  const defaultNames = ['待办', '已完成', '灵感'];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Section header */}
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Layers className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[11px] font-medium text-muted-foreground/70 tracking-wider uppercase">区块</span>
          <span className="text-[10px] text-muted-foreground/30 ml-auto tabular-nums">{blocks.length}</span>
        </div>

        {/* Block list */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-0.5">
            {blocks.map((block) => (
              <div key={block.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBlock(block.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectBlock(block.id)}
                  className={cn(
                    'group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer',
                    'hover:bg-accent/60',
                    activeBlockId === block.id
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/5"
                    style={{ backgroundColor: block.color }}
                  />
                  <span className="truncate flex-1">{block.name}</span>

                  {/* Hover actions */}
                  <div className="hidden group-hover:flex items-center gap-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); handleToggleShow(block); }}
                        >
                          {block.show_on_desktop
                            ? <Eye className="h-3 w-3" />
                            : <EyeOff className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[10px] px-2 py-1">
                        {block.show_on_desktop ? '桌面隐藏' : '桌面显示'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            'inline-flex items-center justify-center h-5 w-5 rounded hover:bg-destructive/10 cursor-pointer',
                            defaultNames.includes(block.name) && 'opacity-30 cursor-not-allowed',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!defaultNames.includes(block.name)) setDeleteTarget(block);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive/70" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[10px] px-2 py-1">
                        {defaultNames.includes(block.name) ? '默认区块不可删除' : '删除'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Always show count when not hovered */}
                  <span className="group-hover:hidden text-[10px] text-muted-foreground/40 tabular-nums">
                    {blocks.filter(b => b.id === block.id).length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator className="my-2" />

        {/* New block */}
        {editing ? (
          <Card className="p-1.5 space-y-1.5 shadow-sm rounded-md">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="区块名称"
              className="h-7 text-xs"
            />
            <div className="flex gap-1">
              <Button onClick={handleCreate} size="sm" className="h-6 flex-1 text-[11px]">创建</Button>
              <Button onClick={() => { setEditing(false); setNewName(''); }} variant="outline" size="sm" className="h-6 text-[11px]">取消</Button>
            </div>
          </Card>
        ) : (
          <Button
            onClick={() => setEditing(true)}
            variant="secondary"
            size="sm"
            className="w-full h-7 text-[11px] gap-1.5"
          >
            <Plus className="h-3 w-3" />
            新建区块
          </Button>
        )}

        {/* Delete dialog */}
        <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-[340px]">
            <DialogHeader>
              <DialogTitle>删除区块</DialogTitle>
              <DialogDescription>
                删除「{deleteTarget?.name}」及其所有事项？此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
              <Button variant="destructive" size="sm" onClick={() => deleteTarget && handleDelete(deleteTarget)}>删除</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
