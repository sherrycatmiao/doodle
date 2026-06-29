import { cn } from '@/lib/utils';
import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Glass morphism panel — kept for the widget's translucent window effect.
 * Uses shadcn Card-like styling with backdrop blur.
 */
export const GlassPanel: React.FC<Props> = ({ children, className = '', style, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg bg-card/80 backdrop-blur-xl border border-border/50',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
};
