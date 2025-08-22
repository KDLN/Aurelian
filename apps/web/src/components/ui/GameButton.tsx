import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'link';
type ButtonSize = 'default' | 'small' | 'mobile';

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  href?: string;
  className?: string;
}

const buttonVariants = {
  default: 'game-btn',
  primary: 'game-btn game-btn-primary',
  secondary: 'game-btn game-btn-secondary', 
  danger: 'game-btn game-btn-danger',
  warning: 'game-btn game-btn-warning',
  link: 'game-btn-link'
};

const buttonSizes = {
  default: '',
  small: 'game-btn-small',
  mobile: 'game-btn-mobile'
};

export default function GameButton({
  variant = 'default',
  size = 'default',
  children,
  href,
  className,
  ...props
}: GameButtonProps) {
  const baseClasses = buttonVariants[variant];
  const sizeClasses = buttonSizes[size];
  const combinedClassName = cn(baseClasses, sizeClasses, className);

  if (href) {
    return (
      <a href={href} className={combinedClassName}>
        {children}
      </a>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}