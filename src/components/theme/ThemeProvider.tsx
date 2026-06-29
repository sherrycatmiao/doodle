import React, { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { THEMES } from './themeConfig';

/** Convert hex color to HSL string for shadcn CSS variables */
export function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

interface Props {
  children: React.ReactNode;
  /** Which primary color to use. Pass config.panel_primary_color for panel, config.widget_primary_color for widget */
  primaryColor?: string;
}

export const ThemeProvider: React.FC<Props> = ({ children, primaryColor }) => {
  const config = useSettingsStore((s) => s.config);
  const theme = THEMES[config.theme] || THEMES.tech;
  const colors = config.mode === 'dark' ? theme.dark : theme.light;
  const accentColor = primaryColor || colors.accent;

  useEffect(() => {
    const root = document.documentElement;

    // Inject ALL theme colors as CSS variables so shadcn Tailwind classes pick them up
    const vars: Record<string, string> = {
      '--background': hexToHsl(colors.bg),
      '--foreground': hexToHsl(colors.text),
      '--card': hexToHsl(colors.bgAlt),
      '--card-foreground': hexToHsl(colors.text),
      '--popover': hexToHsl(colors.bgAlt),
      '--popover-foreground': hexToHsl(colors.text),
      '--muted': hexToHsl(colors.bgAlt),
      '--muted-foreground': hexToHsl(colors.textSecondary),
      '--accent': hexToHsl(colors.accent),
      '--accent-foreground': hexToHsl(colors.text),
      '--secondary': hexToHsl(colors.bgAlt),
      '--secondary-foreground': hexToHsl(colors.text),
      '--border': hexToHsl(colors.border),
      '--input': hexToHsl(colors.border),
      '--ring': hexToHsl(accentColor),
      '--primary': hexToHsl(accentColor),
      '--primary-foreground': isLight(accentColor) ? hexToHsl('#0a0a0a') : hexToHsl('#fafafa'),
    };

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    // Set widget font size
    root.style.setProperty('--widget-font-size', `${config.widget_font_size}px`);

    // Toggle dark class
    root.classList.toggle('dark', config.mode === 'dark');
  }, [colors, accentColor, config.mode, config.widget_font_size]);

  return <>{children}</>;
};
