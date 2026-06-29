import { cn } from '@/lib/utils';
import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Frosted glass morphism panel with layered depth effect.
 * Uses backdrop blur + subtle gradient overlay for a premium glass look.
 */
export const GlassPanel: React.FC<Props> = ({ children, className = '', style, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] dark:from-white/[0.06] dark:to-white/[0.01] backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
};
