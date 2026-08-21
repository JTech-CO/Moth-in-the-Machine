import { forwardRef, type ButtonHTMLAttributes } from 'react';

import styles from '@/components/ui/Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, size = 'md', type = 'button', variant = 'secondary', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(' ')}
      type={type}
      {...props}
    />
  );
});
