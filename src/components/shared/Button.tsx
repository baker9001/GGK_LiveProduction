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
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#99C93B]/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform active:scale-95 relative overflow-hidden group',
  {
    variants: {
      variant: {
        default: cn(
          'bg-gradient-to-r from-[#99C93B] to-[#7AB635] text-white shadow-md',
          'hover:from-[#7AB635] hover:to-[#5D7E23] hover:shadow-xl hover:shadow-[#99C93B]/30 hover:-translate-y-0.5',
          'dark:shadow-[#99C93B]/20 dark:hover:shadow-[#99C93B]/40',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
          'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full after:transition-transform after:duration-700 hover:after:translate-x-full'
        ),
        secondary: cn(
          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm',
          'hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-lg hover:-translate-y-0.5',
          'border border-gray-200 dark:border-gray-700',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-gray-200/50 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
        destructive: cn(
          'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md',
          'hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5',
          'dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
        outline: cn(
          'border-2 border-[#99C93B] bg-transparent text-[#5D7E23] shadow-sm',
          'hover:bg-[#99C93B]/10 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#7AB635]',
          'dark:border-[#99C93B] dark:text-[#99C93B] dark:hover:bg-[#99C93B]/20',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#99C93B]/10 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
        ghost: cn(
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#99C93B] dark:hover:text-[#99C93B] hover:shadow-md hover:-translate-y-0.5',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-gray-100/50 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
        link: cn(
          'text-[#99C93B] underline-offset-4 hover:underline hover:text-[#7AB635]',
          'dark:text-[#99C93B] dark:hover:text-[#AAD775] hover:shadow-sm'
        ),
        success: cn(
          'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md',
          'hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
        warning: cn(
          'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md',
          'hover:from-amber-600 hover:to-amber-700 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
        report: cn(
          'bg-white dark:bg-gray-800 text-[#99C93B] border-2 border-[#99C93B] shadow-sm',
          'hover:bg-[#99C93B]/5 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#7AB635]',
          'dark:border-[#99C93B] dark:text-[#99C93B] dark:hover:bg-[#99C93B]/10',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#99C93B]/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
        ),
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 px-4 text-xs',
        lg: 'h-12 px-7 text-base',
        xl: 'h-14 px-9 text-lg',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
        'icon-lg': 'h-11 w-11',
      },
      rounded: {
        default: 'rounded-lg',
        full: 'rounded-full',
        none: 'rounded-none',
        sm: 'rounded',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
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
      'inline-flex gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50',
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