import React from 'react';

interface ProgressBarProps {
  value: number;          // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  size = 'md',
  color = 'accent',
  showLabel = false,
  animated = true,
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorStyles = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-surface-active rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`h-full rounded-full ${colorStyles[color]} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-secondary font-medium min-w-[3rem] text-right">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
