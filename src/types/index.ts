export interface Block {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  show_on_desktop: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  block_id: string;
  content: string;
  item_type: string;
  priority: Priority;
  status: 'active' | 'completed' | 'cancelled';
  due_date: string | null;
  start_date: string | null;
  is_date_linked: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Priority = 'urgent_important' | 'important_not_urgent' | 'urgent_not_important' | 'neither';

export interface CreateItemInput {
  block_id: string;
  content: string;
  item_type?: string;
  priority?: string;
  due_date?: string | null;
  start_date?: string | null;
  is_date_linked?: boolean;
}

export interface UpdateItemInput {
  id: string;
  content?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  start_date?: string | null;
}

export interface CompletionRecord {
  id: string;
  item_id: string;
  original_block_id: string;
  completed_date: string;
  completed_at: string;
}

export interface CalendarDay {
  date: string;
  day_of_month: number;
  is_current_month: boolean;
  is_today: boolean;
  items: ItemWithCompletion[];
}

export interface ItemWithCompletion {
  item: Item;
  completed_on_this_date: boolean;
}

export interface CalendarMonthData {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface AiParseResult {
  content: string;
  date: string | null;
  item_type: string;
  priority: string;
  block_name: string;
  reason: string | null;
}

export type ThemeName = 'cartoon' | 'pixel' | 'tech';
export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  theme: ThemeName;
  mode: ThemeMode;
  widget_opacity: number;
  widget_primary_color: string;
  panel_primary_color: string;
  ai_api_key: string;
  ai_model: string;
  ai_endpoint: string;
}

export type IconName =
  | 'add' | 'delete' | 'edit' | 'calendar'
  | 'todo' | 'idea' | 'completed' | 'settings'
  | 'panel' | 'drag' | 'urgent' | 'check'
  | 'moon' | 'sun' | 'arrow-left' | 'arrow-right';
