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

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F]/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform active:scale-95',
  {
    variants: {
      variant: {
        default: cn(
          'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white',
          'hover:from-[#7AB635] hover:to-[#6DA52F] hover:shadow-lg hover:shadow-[#8CC63F]/20',
          'dark:shadow-[#8CC63F]/10'
        ),
        secondary: cn(
          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          'hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md',
          'border border-gray-200 dark:border-gray-700'
        ),
        destructive: cn(
          'bg-gradient-to-r from-red-500 to-red-600 text-white',
          'hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/20',
          'dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800'
        ),
        outline: cn(
          'border-2 border-[#8CC63F] bg-transparent text-[#8CC63F]',
          'hover:bg-[#8CC63F]/10 hover:shadow-md',
          'dark:border-[#8CC63F] dark:text-[#8CC63F] dark:hover:bg-[#8CC63F]/20'
        ),
        ghost: cn(
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#8CC63F] dark:hover:text-[#8CC63F]'
        ),
        link: cn(
          'text-[#8CC63F] underline-offset-4 hover:underline hover:text-[#7AB635]',
          'dark:text-[#8CC63F] dark:hover:text-[#9ED050]'
        ),
        success: cn(
          'bg-gradient-to-r from-green-500 to-green-600 text-white',
          'hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-500/20'
        ),
        warning: cn(
          'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
          'hover:from-amber-600 hover:to-amber-700 hover:shadow-lg hover:shadow-amber-500/20'
        ),
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-lg',
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
    
    return (
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
        title={tooltip}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Hover effect overlay */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
        
        {/* Button content */}
        <span className="relative flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className={cn(iconClass, 'animate-spin')} />
              {loadingText && <span>{loadingText}</span>}
            </>
          ) : (
            <>
              {leftIcon && <span className={iconClass}>{leftIcon}</span>}
              {children && <span>{children}</span>}
              {rightIcon && <span className={iconClass}>{rightIcon}</span>}
            </>
          )}
        </span>
      </button>
    );
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
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  return (
    <div className={cn('inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
      {children}
    </div>
  );
};

export default Button;