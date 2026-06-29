import React, { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { THEMES } from './themeConfig';

/** Convert hex color to HSL string for shadcn CSS variables */
function hexToHsl(hex: string): string {
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = useSettingsStore((s) => s.config);
  const theme = THEMES[config.theme] || THEMES.tech;
  const colors = config.mode === 'dark' ? theme.dark : theme.light;
  const accentColor = config.widget_primary_color || colors.accent;

  useEffect(() => {
    const root = document.documentElement;

    // Only set the accent color as shadcn primary
    const primaryHsl = hexToHsl(accentColor);
    const primaryFg = isLight(accentColor) ? hexToHsl('#0a0a0a') : hexToHsl('#fafafa');
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--primary-foreground', primaryFg);
    root.style.setProperty('--ring', primaryHsl);

    // Toggle dark class
    root.classList.toggle('dark', config.mode === 'dark');
  }, [config.theme, config.mode, config.widget_primary_color]);

  return <>{children}</>;
};
