import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useItemsStore } from '@/store/useItemsStore';
import type { Block, Item, Priority } from '@/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/components/theme/themeConfig';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, ChevronDown, Check,
  ChevronRight, ArrowLeft, CalendarDays,
} from 'lucide-react';

interface Props {
  block: Block;
  onBack: () => void;
}

export const BlockDetailArea: React.FC<Props> = ({ block, onBack }) => {
  const items = useItemsStore((s) => s.items);
  const fetchItems = useItemsStore((s) => s.fetchItems);
  const createItem = useItemsStore((s) => s.createItem);
  const updateItem = useItemsStore((s) => s.updateItem);
  const deleteItem = useItemsStore((s) => s.deleteItem);
  const completeItem = useItemsStore((s) => s.completeItem);
  const uncompleteItem = useItemsStore((s) => s.uncompleteItem);

  const [newContent, setNewContent] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => { fetchItems(); }, [block.id]);

  const blockItems = items.filter((i) => i.block_id === block.id);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    await createItem({
      block_id: block.id,
      content: newContent.trim(),
      item_type: block.name === '灵感' ? 'idea' : 'todo',
    });
    setNewContent('');
    setShowInput(false);
    fetchItems();
  };

  const handleToggleComplete = async (item: Item) => {
    const today = new Date().toISOString().slice(0, 10);
    if (item.status === 'completed') {
      await uncompleteItem(item.id, today);
    } else {
      await completeItem(item.id, item.due_date || today);
    }
    fetchItems();
  };

  const handleEdit = async (item: Item) => {
    if (!editContent.trim()) return;
    await updateItem({ id: item.id, content: editContent.trim() });
    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (item: Item) => {
    await deleteItem(item.id);
    setDeleteTarget(null);
    fetchItems();
  };

  const handlePriorityChange = async (item: Item, priority: Priority) => {
    await updateItem({ id: item.id, priority });
    fetchItems();
  };

  const activeItems = blockItems.filter((i) => i.status === 'active');
  const completedItems = blockItems.filter((i) => i.status === 'completed');

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full max-w-2xl">
        {/* Header with back button */}
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">返回总览</TooltipContent>
          </Tooltip>
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5"
            style={{ backgroundColor: block.color }}
          />
          <h2 className="text-sm font-semibold tracking-tight">{block.name}</h2>
          <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 font-normal gap-1">
            {activeItems.length}/{blockItems.length}
          </Badge>
        </div>

        {/* Quick add */}
        {showInput ? (
          <Card className="p-2 mb-4 shrink-0 space-y-1.5 shadow-sm rounded-md border-border/60">
            <Input
              autoFocus
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="添加事项..."
              className="h-8 text-xs"
            />
            <div className="flex gap-1">
              <Button onClick={handleCreate} size="sm" className="h-7 flex-1 text-xs gap-1">
                <Plus className="h-3 w-3" />
                添加
              </Button>
              <Button
                onClick={() => { setShowInput(false); setNewContent(''); }}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                取消
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            onClick={() => setShowInput(true)}
            variant="outline"
            size="sm"
            className="text-xs w-full justify-start mb-4 h-9 text-muted-foreground border-dashed gap-1.5 hover:text-foreground hover:border-solid transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            添加事项
          </Button>
        )}

        {/* Active items */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-1">
            <div className="space-y-0.5">
              {activeItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  editContent={editContent}
                  setEditingId={setEditingId}
                  setEditContent={setEditContent}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                  onDelete={(it) => setDeleteTarget(it)}
                  onPriorityChange={handlePriorityChange}
                />
              ))}
              {activeItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Plus className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground/50">暂无活跃事项</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Completed items */}
        {completedItems.length > 0 && (
          <div className="shrink-0 mt-2 border-t border-border/50 pt-1.5">
            <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-[10px] text-muted-foreground gap-1 hover:text-foreground"
                >
                  <ChevronRight className={cn('h-3 w-3 transition-transform', completedOpen && 'rotate-90')} />
                  已完成 · {completedItems.length}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                  {completedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 py-1 px-1 rounded group hover:bg-accent/30">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => handleToggleComplete(item)}
                        className="h-4 w-4 shrink-0 bg-green-500 border-green-500"
                      />
                      <span className="text-[11px] line-through truncate text-muted-foreground/50 flex-1">
                        {item.content}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Delete dialog */}
        <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-[340px]">
            <DialogHeader>
              <DialogTitle>删除事项</DialogTitle>
              <DialogDescription>
                删除「{deleteTarget?.content}」？此操作不可撤销。
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

const PRIORITIES: Priority[] = ['urgent_important', 'important_not_urgent', 'urgent_not_important', 'neither'];

interface ItemRowProps {
  item: Item; editingId: string | null; editContent: string;
  setEditingId: (id: string | null) => void; setEditContent: (v: string) => void;
  onToggleComplete: (item: Item) => void; onEdit: (item: Item) => void;
  onDelete: (item: Item) => void; onPriorityChange: (item: Item, priority: Priority) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
  item, editingId, editContent, setEditingId, setEditContent,
  onToggleComplete, onEdit, onDelete, onPriorityChange,
}) => {
  const [priorityOpen, setPriorityOpen] = useState(false);

  if (editingId === item.id) {
    return (
      <div className="flex gap-1.5 py-1 px-1">
        <Input
          autoFocus
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEdit(item)}
          className="h-8 text-xs flex-1"
        />
        <Button onClick={() => onEdit(item)} size="sm" className="h-8 text-xs">保存</Button>
        <Button onClick={() => setEditingId(null)} variant="outline" size="sm" className="h-8 text-xs">取消</Button>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start gap-2 py-1.5 px-2 rounded-md group transition-colors',
      'hover:bg-accent/30',
    )}>
      <Checkbox
        checked={item.status === 'completed'}
        onCheckedChange={() => onToggleComplete(item)}
        className={cn(
          'h-4 w-4 mt-0.5 shrink-0',
          item.status === 'completed' && 'bg-green-500 border-green-500',
        )}
        style={item.status !== 'completed' ? { borderColor: PRIORITY_COLORS[item.priority] || '#a3a3a3' } : undefined}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/5 cursor-help"
                style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">{PRIORITY_LABELS[item.priority]}</TooltipContent>
          </Tooltip>
          <span
            className="text-xs truncate cursor-pointer leading-relaxed"
            onDoubleClick={() => { setEditingId(item.id); setEditContent(item.content); }}
            title="双击编辑"
          >
            {item.content}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 ml-3.5">
          <span className="text-[10px] text-muted-foreground/50">{PRIORITY_LABELS[item.priority]}</span>
          {item.due_date && (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
              <CalendarDays className="h-2.5 w-2.5" />
              {item.due_date}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end" sideOffset={4}>
            <div className="text-[10px] font-medium text-muted-foreground px-2 py-1">优先级</div>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => { onPriorityChange(item, p); setPriorityOpen(false); }}
                className={cn(
                  'flex items-center gap-2 w-full text-xs px-2 py-1.5 rounded-md transition-colors',
                  'hover:bg-accent',
                  item.priority === p && 'bg-accent font-medium',
                )}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                <span className="flex-1 text-left">{PRIORITY_LABELS[p]}</span>
                {item.priority === p && <Check className="h-3 w-3 text-foreground/70" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => onDelete(item)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">删除</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
