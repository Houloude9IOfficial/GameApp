import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-ui select-none';

  const variantStyles = {
    primary: 'bg-accent text-primary hover:brightness-110 active:brightness-90',
    secondary: 'bg-surface border border-card-border text-text-primary hover:bg-surface-hover active:bg-surface-active',
    ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-active',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 active:bg-danger/30',
    accent: 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 active:bg-accent/30',
  };

  const sizeStyles = {
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
  };

  return (
    <motion.button
      whileTap={{ scale: 1 }}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon}
      {children}
    </motion.button>
  );
}
