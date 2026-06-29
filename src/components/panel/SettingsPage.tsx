import React, { useState } from 'react';
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
import type { ThemeName } from '@/types';
import { THEMES, PRIORITY_COLORS, PRIORITY_LABELS } from '@/components/theme/themeConfig';
import { cn } from '@/lib/utils';
import {
  Paintbrush, Palette, Eye, ListChecks,
  Sun, Moon, Info, Save, CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { config, setTheme, setMode, setWidgetOpacity, setWidgetColor, setPanelColor, setWidgetFontSize, setAiKey, setSetting } = useSettingsStore();
  const [apiKey, setApiKey] = useState(config.ai_api_key);
  const [aiModel, setAiModel] = useState(config.ai_model);
  const [aiEndpoint, setAiEndpoint] = useState(config.ai_endpoint);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

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
                <input
                  type="color"
                  value={config.widget_primary_color}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-input bg-transparent p-0.5"
                />
                <code className="text-xs text-muted-foreground font-mono">{config.widget_primary_color}</code>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">面板主色</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.panel_primary_color}
                  onChange={(e) => setPanelColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-input bg-transparent p-0.5"
                />
                <code className="text-xs text-muted-foreground font-mono">{config.panel_primary_color}</code>
              </div>
            </div>
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
