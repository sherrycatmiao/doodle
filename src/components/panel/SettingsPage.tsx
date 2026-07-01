import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useSettingsStore } from '@/store/useSettingsStore';
import { invoke } from '@tauri-apps/api/core';
import type { ThemeName } from '@/types';
import { THEMES, PRIORITY_COLORS, PRIORITY_LABELS } from '@/components/theme/themeConfig';
import { cn } from '@/lib/utils';
import {
  Paintbrush, Palette, Eye, ListChecks,
  Sun, Moon, Info, Save, CheckCircle2,
  AlertCircle, Keyboard,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { config, setTheme, setMode, setWidgetOpacity, setWidgetColor, setWidgetTextColor, setPanelColor, setWidgetFontSize, setAiKey, setSetting, setMdFilePath, setHotkeyShortcut } = useSettingsStore();
  const [apiKey, setApiKey] = useState(config.ai_api_key);
  const [aiModel, setAiModel] = useState(config.ai_model);
  const [aiEndpoint, setAiEndpoint] = useState(config.ai_endpoint);
  const [mdFilePath, setMdFilePathState] = useState(config.md_file_path);
  const [hotkeyShortcut, setHotkeyShortcutState] = useState(config.hotkey_shortcut);
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  /** Convert a KeyboardEvent into a "Mod1+Mod2+Key" string */
  const keyboardEventToShortcut = (e: React.KeyboardEvent<HTMLInputElement>): string => {
    // Ignore pure modifier key presses
    if (['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) return '';
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    // Normalize key name
    const key = e.code.startsWith('Digit') ? e.code.replace('Digit', '')
      : e.code.startsWith('Key') ? e.code.replace('Key', '')
      : e.code === 'Space' ? 'Space'
      : e.code === 'Escape' ? 'Escape'
      : e.code === 'Enter' ? 'Enter'
      : e.code === 'Backspace' ? 'Backspace'
      : e.code === 'Tab' ? 'Tab'
      : e.code;
    parts.push(key);
    return parts.join('+');
  };

  const handleShortcutKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Esc while recording: cancel
    if (e.key === 'Escape') {
      setRecordingShortcut(false);
      return;
    }

    // Enter while recording: confirm and save
    if (e.key === 'Enter') {
      setRecordingShortcut(false);
      try {
        await setHotkeyShortcut(hotkeyShortcut);
        showToast(`快捷键已设为 ${hotkeyShortcut}`, 'success');
      } catch (err) {
        showToast(`设置失败: ${err}`, 'error');
      }
      return;
    }

    // Record the pressed combination
    const shortcut = keyboardEventToShortcut(e);
    if (shortcut) {
      setHotkeyShortcutState(shortcut);
    }
  }, [hotkeyShortcut, setHotkeyShortcut, showToast]);

  const handleSaveAiConfig = async () => {
    setSaving(true);
    try {
      await setAiKey(apiKey);
      await setSetting('ai_model', aiModel);
      await setSetting('ai_endpoint', aiEndpoint);
      showToast('AI 配置已保存', 'success');
    } catch (err) {
      showToast(`保存失败: ${err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6 max-w-xl mx-auto pb-8">
        {/* Toast notification */}
        {toast && (
          <div
            className={cn(
              'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium shadow-lg animate-in slide-in-from-top-2',
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-destructive-foreground',
            )}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="h-3.5 w-3.5" />
              : <AlertCircle className="h-3.5 w-3.5" />
            }
            {toast.message}
          </div>
        )}

        {/* AI Config */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">AI 配置</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">模型</Label>
              <Input
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="deepseek-chat"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">接口地址</Label>
              <Input
                value={aiEndpoint}
                onChange={(e) => setAiEndpoint(e.target.value)}
                placeholder="https://api.deepseek.com"
                className="h-8 text-xs font-mono"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveAiConfig} disabled={saving} size="sm" className="gap-1.5">
              {saving ? (
                <span className="animate-pulse">保存中...</span>
              ) : (
                <><Save className="h-3.5 w-3.5" /> 保存 AI 配置</>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">主题</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">主题风格</Label>
              <Select value={config.theme} onValueChange={(v: ThemeName) => setTheme(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech" className="text-xs">商务科技</SelectItem>
                  <SelectItem value="cartoon" className="text-xs">卡通</SelectItem>
                  <SelectItem value="pixel" className="text-xs">像素风</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">明暗模式</Label>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={config.mode === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setMode('dark')}
                    >
                      <Moon className="h-3.5 w-3.5" /> 深色
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">深色模式</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={config.mode === 'light' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setMode('light')}
                    >
                      <Sun className="h-3.5 w-3.5" /> 浅色
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">浅色模式</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">外观</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">桌面透明度</Label>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {Math.round(config.widget_opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[config.widget_opacity]}
                min={0.1} max={0.9} step={0.05}
                onValueChange={([v]) => setWidgetOpacity(v)}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground/50">
                <span>10%</span>
                <span>90%</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">字体大小</Label>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {config.widget_font_size}px
                </span>
              </div>
              <Slider
                value={[config.widget_font_size]}
                min={9} max={18} step={1}
                onValueChange={([v]) => setWidgetFontSize(v)}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground/50">
                <span>9px</span>
                <span>18px</span>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">桌面主色</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={config.widget_primary_color}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="w-9 h-9 p-0.5 cursor-pointer"
                />
                <code className="text-xs text-muted-foreground font-mono">{config.widget_primary_color}</code>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">桌面文字色</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={config.widget_text_color || '#ffffff'}
                  onChange={(e) => setWidgetTextColor(e.target.value)}
                  className="w-9 h-9 p-0.5 cursor-pointer"
                />
                <code className="text-xs text-muted-foreground font-mono">{config.widget_text_color || '默认'}</code>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">面板主色</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={config.panel_primary_color}
                  onChange={(e) => setPanelColor(e.target.value)}
                  className="w-9 h-9 p-0.5 cursor-pointer"
                />
                <code className="text-xs text-muted-foreground font-mono">{config.panel_primary_color}</code>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Markdown 文件路径</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={mdFilePath}
                  onChange={(e) => setMdFilePathState(e.target.value)}
                  placeholder="例: F:\todo\backup.md"
                  className="h-8 text-xs font-mono flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={async () => {
                    try {
                      const picked = await invoke<string | null>('pick_md_file_path');
                      if (picked) setMdFilePathState(picked);
                    } catch { /* user cancelled */ }
                  }}
                >
                  浏览
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={async () => {
                    try {
                      await setMdFilePath(mdFilePath);
                      if (mdFilePath.trim()) {
                        const result = await invoke<string>('sync_to_markdown');
                        if (result.startsWith('no_md_path')) {
                          showToast('文件路径未配置', 'error');
                        } else {
                          showToast(`已同步到 ${result}`, 'success');
                        }
                      } else {
                        showToast('已清空文件路径（停止同步）', 'success');
                      }
                    } catch (err) {
                      showToast(`保存失败: ${err}`, 'error');
                    }
                  }}
                >
                  保存并同步
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground/50">
                设置后，所有待办数据变更会实时写入该 Markdown 文件。留空则不执行同步。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Global Shortcut */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">全局快捷键</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">呼出快捷键</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={hotkeyShortcut}
                    readOnly
                    placeholder={recordingShortcut ? '按下快捷键组合...' : '点击此处录制快捷键'}
                    className={`h-8 text-xs font-mono flex-1 cursor-pointer ${recordingShortcut ? 'ring-2 ring-primary border-primary' : ''}`}
                    onFocus={() => setRecordingShortcut(true)}
                    onBlur={() => setRecordingShortcut(false)}
                    onKeyDown={recordingShortcut ? handleShortcutKeyDown : undefined}
                  />
                  {recordingShortcut && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={async () => {
                    try {
                      await setHotkeyShortcut(hotkeyShortcut);
                      showToast(`快捷键已设为 ${hotkeyShortcut}`, 'success');
                    } catch (err) {
                      showToast(`设置失败: ${err}`, 'error');
                    }
                  }}
                >
                  应用
                </Button>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground/50">
              点击输入框后按下键盘组合即可录制（如 Alt+Space）。按 Enter 确认，Esc 取消。修改后即时生效。
            </p>
            {/* Conflict warnings */}
            {(() => {
              const conflicts: string[] = [];
              const s = hotkeyShortcut.toLowerCase();
              if (s === 'alt+space') {
                conflicts.push('Windows 系统菜单键（通常被 PowerToys Run / Flow Launcher 占用）');
              }
              if (s === 'ctrl+space') {
                conflicts.push('输入法切换键');
              }
              if (s === 'alt+f4') {
                conflicts.push('关闭窗口');
              }
              if (s === 'ctrl+c' || s === 'ctrl+v' || s === 'ctrl+x' || s === 'ctrl+z' || s === 'ctrl+a') {
                conflicts.push('系统常用快捷键，建议避免');
              }
              if (conflicts.length > 0) {
                return (
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-0.5">⚠️ 冲突警告</p>
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-[9px] text-amber-600/70 dark:text-amber-400/70">{c}</p>
                    ))}
                    <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                      推荐替代: <button className="underline font-mono hover:text-amber-800 dark:hover:text-amber-200" onClick={() => setHotkeyShortcutState('Ctrl+Alt+Space')}>Ctrl+Alt+Space</button> 或 <button className="underline font-mono hover:text-amber-800 dark:hover:text-amber-200" onClick={() => setHotkeyShortcutState('Alt+Shift+Space')}>Alt+Shift+Space</button>
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>

        {/* Priority Legend */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">优先级颜色</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-3 py-1.5 text-xs border-b border-border/30 last:border-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{PRIORITY_LABELS[key] || key}</span>
                <code className="text-[9px] text-muted-foreground/40 ml-auto font-mono">{color}</code>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Theme preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">当前主题预览</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              <div className="space-y-1">
                <div className="font-medium text-foreground">基本信息</div>
                <div>主题: {config.theme}</div>
                <div>模式: {config.mode}</div>
                <div>透明度: {Math.round(config.widget_opacity * 100)}% 透明</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-foreground">样式值</div>
                <div>字体: {THEMES[config.theme][config.mode].fontFamily}</div>
                <div>圆角: {THEMES[config.theme][config.mode].borderRadius}</div>
                <div>描边: {THEMES[config.theme][config.mode].iconStrokeWidth}px</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
