/**
 * File: /src/components/shared/Button.tsx
 * Dependencies: 
 *   - @/lib/utils
 *   - External: react, class-variance-authority
 * 
 * Preserved Features:
 *   - All original functionality (variants, sizes)
 *   - Left and right icon support
 *   - Tooltip support
 *   - Disabled state handling
 * 
 * Improvements:
 *   - Consistent green theme (#8CC63F) across all variants
 *   - Better contrast for text colors
 *   - Refined hover states with gradients
 *   - Consistent shadows and transitions
 *   - Better dark mode support
 *   - Added loading state support
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Tooltip } from './Tooltip';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-ggk-lg text-sm font-semibold transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ggk-primary-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98] relative overflow-hidden group',
  {
    variants: {
      variant: {
        default: cn(
          'bg-ggk-primary-600 text-white shadow-ggk-md',
          'hover:bg-ggk-primary-700 hover:shadow-ggk-lg active:bg-ggk-primary-800',
          'dark:bg-ggk-primary-500 dark:hover:bg-ggk-primary-600'
        ),
        secondary: cn(
          'bg-ggk-neutral-100 text-ggk-neutral-700 border border-ggk-neutral-200 shadow-ggk-sm',
          'hover:bg-ggk-neutral-200 hover:shadow-ggk-md',
          'dark:bg-ggk-neutral-800 dark:text-ggk-neutral-200 dark:border-ggk-neutral-700 dark:hover:bg-ggk-neutral-700'
        ),
        destructive: cn(
          'bg-red-500 text-white shadow-ggk-md',
          'hover:bg-red-600 hover:shadow-ggk-lg active:bg-red-700',
          'dark:bg-red-600 dark:hover:bg-red-700'
        ),
        outline: cn(
          'border-2 border-ggk-primary-600 text-ggk-primary-700 bg-transparent shadow-ggk-sm',
          'hover:bg-ggk-primary-50 hover:shadow-ggk-md',
          'dark:border-ggk-primary-500 dark:text-ggk-primary-400 dark:hover:bg-ggk-primary-950'
        ),
        ghost: cn(
          'text-ggk-neutral-600 bg-transparent',
          'hover:text-ggk-neutral-900 hover:bg-ggk-neutral-100',
          'dark:text-ggk-neutral-400 dark:hover:text-ggk-neutral-100 dark:hover:bg-ggk-neutral-800'
        ),
        link: cn(
          'text-ggk-primary-600 underline-offset-4 hover:underline hover:text-ggk-primary-700',
          'dark:text-ggk-primary-500 dark:hover:text-ggk-primary-400'
        ),
        success: cn(
          'bg-emerald-500 text-white shadow-ggk-md',
          'hover:bg-emerald-600 hover:shadow-ggk-lg active:bg-emerald-700'
        ),
        warning: cn(
          'bg-amber-500 text-white shadow-ggk-md',
          'hover:bg-amber-600 hover:shadow-ggk-lg active:bg-amber-700'
        ),
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-3.5 py-2 text-xs',
        lg: 'h-12 px-6 py-3 text-base',
        xl: 'h-14 px-8 py-3.5 text-lg',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
      rounded: {
        default: 'rounded-ggk-lg',
        full: 'rounded-full',
        none: 'rounded-none',
        sm: 'rounded-ggk-sm',
        md: 'rounded-ggk-md',
        lg: 'rounded-ggk-lg',
        xl: 'rounded-ggk-xl',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  tooltip?: string;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    rounded,
    leftIcon,
    rightIcon,
    children,
    tooltip,
    disabled,
    loading = false,
    loadingText,
    fullWidth = false,
    ...props
  }, ref) => {
    // Enhanced disabled state handling
    const isDisabled = disabled || loading || props.disabled;
    
    // Icon sizing based on button size
    const getIconSize = () => {
      switch (size) {
        case 'sm':
        case 'icon-sm':
          return 'h-3.5 w-3.5';
        case 'lg':
        case 'icon-lg':
          return 'h-5 w-5';
        case 'xl':
          return 'h-5 w-5';
        default:
          return 'h-4 w-4';
      }
    };

    const iconClass = getIconSize();

    const buttonContent = (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, rounded }),
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          fullWidth && 'w-full',
          'relative overflow-hidden',
          className
        )}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Hover effect overlay */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        {/* Button content */}
        <span className="relative flex items-center justify-center gap-2 z-10">
          {loading ? (
            <>
              <Loader2 className={cn(iconClass, 'animate-spin drop-shadow-sm')} />
              {loadingText && <span>{loadingText}</span>}
            </>
          ) : (
            <>
              {leftIcon && <span className={cn(iconClass, 'drop-shadow-sm transition-transform duration-200 group-hover:scale-110')}>{leftIcon}</span>}
              {children && <span className="font-semibold tracking-wide drop-shadow-sm">{children}</span>}
              {rightIcon && <span className={cn(iconClass, 'drop-shadow-sm transition-transform duration-200 group-hover:scale-110')}>{rightIcon}</span>}
            </>
          )}
        </span>
        
        {/* Ripple effect on click */}
        <span className="absolute inset-0 rounded-lg bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200 ease-out" />
      </button>
    );

    // Wrap with tooltip if provided
    if (tooltip) {
      return (
        <Tooltip content={tooltip} position="top" delay={200}>
          {buttonContent}
        </Tooltip>
      );
    }

    return buttonContent;
  }
);

Button.displayName = 'Button';

// Export button variants for external use
export { buttonVariants };

// Helper component for icon-only buttons with better accessibility
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { 'aria-label': string }
>(({ children, size = 'icon', ...props }, ref) => {
  return (
    <Button ref={ref} size={size} {...props}>
      {children}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

// Button Group component for related actions
export const ButtonGroup = ({ 
  children, 
  className,
  orientation = 'horizontal'
}: { 
  children: React.ReactNode; 
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) => {
  return (
    <div className={cn(
      'inline-flex gap-1 p-1 bg-card-elevated rounded-xl shadow-sm border border-theme',
      orientation === 'vertical' && 'flex-col',
      className
    )}>
      {children}
    </div>
  );
};

// Floating Action Button component
export const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' }
>(({ className, position = 'bottom-right', size = 'lg', rounded = 'full', ...props }, ref) => {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  };

  return (
    <Button
      ref={ref}
      size={size}
      rounded={rounded}
      className={cn(
        positionClasses[position],
        'z-50 shadow-2xl hover:shadow-3xl transition-all duration-300',
        'hover:scale-110 active:scale-95',
        className
      )}
      {...props}
    />
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default Button;