import type { ThemeName } from '../../types';

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  light: ThemeColors;
  dark: ThemeColors;
}

interface ThemeColors {
  bg: string;
  bgAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  glassBg: string;
  glassBorder: string;
  fontFamily: string;
  borderRadius: string;
  iconStrokeWidth: number;
}

export const THEMES: Record<ThemeName, ThemeDefinition> = {
  cartoon: {
    name: 'cartoon',
    label: '卡通',
    light: {
      bg: '#fff7ed', bgAlt: '#ffffff', text: '#431407', textSecondary: '#9a3412',
      border: '#fed7aa', accent: '#f97316', glassBg: 'rgba(255, 247, 237, 0.7)',
      glassBorder: 'rgba(249, 115, 22, 0.2)', fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
      borderRadius: '16px', iconStrokeWidth: 3,
    },
    dark: {
      bg: '#1c1917', bgAlt: '#292524', text: '#ffedd5', textSecondary: '#fdba74',
      border: '#44403c', accent: '#fb923c', glassBg: 'rgba(28, 25, 23, 0.7)',
      glassBorder: 'rgba(251, 146, 60, 0.2)', fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
      borderRadius: '16px', iconStrokeWidth: 3,
    },
  },
  pixel: {
    name: 'pixel',
    label: '像素风',
    light: {
      bg: '#f0fdf0', bgAlt: '#ffffff', text: '#052e16', textSecondary: '#166534',
      border: '#bbf7d0', accent: '#22c55e', glassBg: 'rgba(240, 253, 240, 0.8)',
      glassBorder: 'rgba(34, 197, 94, 0.3)', fontFamily: '"Press Start 2P", "VT323", monospace',
      borderRadius: '0px', iconStrokeWidth: 2,
    },
    dark: {
      bg: '#0a0a0a', bgAlt: '#1a1a1a', text: '#a3e635', textSecondary: '#4ade80',
      border: '#1a2e1a', accent: '#4ade80', glassBg: 'rgba(10, 10, 10, 0.8)',
      glassBorder: 'rgba(74, 222, 128, 0.2)', fontFamily: '"Press Start 2P", "VT323", monospace',
      borderRadius: '0px', iconStrokeWidth: 2,
    },
  },
  tech: {
    name: 'tech',
    label: '商务科技',
    light: {
      bg: '#f8fafc', bgAlt: '#ffffff', text: '#0f172a', textSecondary: '#475569',
      border: '#e2e8f0', accent: '#6366f1', glassBg: 'rgba(248, 250, 252, 0.6)',
      glassBorder: 'rgba(99, 102, 241, 0.15)', fontFamily: '"Inter", "SF Pro", sans-serif',
      borderRadius: '8px', iconStrokeWidth: 1.5,
    },
    dark: {
      bg: '#0f172a', bgAlt: '#1e293b', text: '#f1f5f9', textSecondary: '#94a3b8',
      border: '#334155', accent: '#818cf8', glassBg: 'rgba(15, 23, 42, 0.7)',
      glassBorder: 'rgba(129, 140, 248, 0.15)', fontFamily: '"Inter", "SF Pro", sans-serif',
      borderRadius: '8px', iconStrokeWidth: 1.5,
    },
  },
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent_important: '#ef4444',
  important_not_urgent: '#f59e0b',
  urgent_not_important: '#f97316',
  neither: '#6b7280',
};

export const PRIORITY_LABELS: Record<string, string> = {
  urgent_important: '紧急重要',
  important_not_urgent: '重要不紧急',
  urgent_not_important: '紧急不重要',
  neither: '一般',
};
