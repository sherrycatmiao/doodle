import React, { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

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

  useEffect(() => {
    const root = document.documentElement;

    // Toggle dark class — this lets index.css :root/.dark rules set shadcn defaults
    root.classList.toggle('dark', config.mode === 'dark');

    // Only override primary + ring when a primaryColor is explicitly passed.
    // This lets Panel/Welcome pick the user's accent while keeping shadcn's
    // default neutral palette for all other variables.
    if (primaryColor) {
      root.style.setProperty('--primary', hexToHsl(primaryColor));
      root.style.setProperty('--ring', hexToHsl(primaryColor));
      root.style.setProperty(
        '--primary-foreground',
        isLight(primaryColor) ? hexToHsl('#0a0a0a') : hexToHsl('#fafafa'),
      );
    }

    // Widget-only overrides: font size & text colour (harmless on Panel)
    root.style.setProperty('--widget-font-size', `${config.widget_font_size}px`);
    if (config.widget_text_color) {
      root.style.setProperty('--widget-text-color', config.widget_text_color);
    } else {
      root.style.removeProperty('--widget-text-color');
    }
  }, [config.mode, config.widget_font_size, config.widget_text_color, primaryColor]);

  return <>{children}</>;
};
