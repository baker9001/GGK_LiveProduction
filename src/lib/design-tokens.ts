/**
 * GGK Admin System - Design Tokens
 *
 * Centralized design system tokens for colors, spacing, typography,
 * shadows, and border radius. Use these tokens throughout the application
 * for consistent visual design.
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
  // Primary Brand Colors (Green)
  primary: {
    50: '#f4fae8',
    100: '#e8f5dc',
    200: '#d4edc4',
    300: '#b8e197',
    400: '#9ed050',
    500: '#8CC63F',
    600: '#7AB635',
    700: '#6AA52D',
    800: '#5d7e23',
    900: '#4a6319',
  },

  // Neutral Colors
  neutral: {
    0: '#ffffff',
    50: '#fafbfc',
    100: '#f5f7fa',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#0a0e14',
  },

  // Semantic Colors
  success: {
    light: '#d1fae5',
    DEFAULT: '#10b981',
    dark: '#059669',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
  },
  danger: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#2563eb',
  },

  // Icon Action Colors
  iconView: {
    DEFAULT: '#3b82f6',
    hover: '#2563eb',
  },
  iconEdit: {
    DEFAULT: '#f59e0b',
    hover: '#d97706',
  },
  iconDelete: {
    DEFAULT: '#ef4444',
    hover: '#dc2626',
  },
  iconCreate: {
    DEFAULT: '#10b981',
    hover: '#059669',
  },
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const spacing = {
  0: '0px',
  2: '0.125rem',    // 2px
  4: '0.25rem',     // 4px
  6: '0.375rem',    // 6px
  8: '0.5rem',      // 8px
  10: '0.625rem',   // 10px
  12: '0.75rem',    // 12px
  16: '1rem',       // 16px
  20: '1.25rem',    // 20px
  24: '1.5rem',     // 24px
  32: '2rem',       // 32px
  40: '2.5rem',     // 40px
  48: '3rem',       // 48px
  64: '4rem',       // 64px
} as const;

// ============================================================================
// RADIUS TOKENS
// ============================================================================

export const radius = {
  none: '0',
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const typography = {
  h1: {
    fontSize: '2.25rem',      // 36px
    lineHeight: '2.5rem',     // 40px
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: '1.875rem',     // 30px
    lineHeight: '2.25rem',    // 36px
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  h3: {
    fontSize: '1.5rem',       // 24px
    lineHeight: '2rem',       // 32px
    fontWeight: '600',
    letterSpacing: '-0.0125em',
  },
  h4: {
    fontSize: '1.25rem',      // 20px
    lineHeight: '1.75rem',    // 28px
    fontWeight: '600',
    letterSpacing: '-0.0125em',
  },
  h5: {
    fontSize: '1.125rem',     // 18px
    lineHeight: '1.5rem',     // 24px
    fontWeight: '600',
    letterSpacing: '0',
  },
  h6: {
    fontSize: '1rem',         // 16px
    lineHeight: '1.5rem',     // 24px
    fontWeight: '600',
    letterSpacing: '0',
  },
  body: {
    fontSize: '1rem',         // 16px
    lineHeight: '1.5rem',     // 24px
    fontWeight: '400',
    letterSpacing: '0',
  },
  'body-sm': {
    fontSize: '0.875rem',     // 14px
    lineHeight: '1.25rem',    // 20px
    fontWeight: '400',
    letterSpacing: '0',
  },
  caption: {
    fontSize: '0.75rem',      // 12px
    lineHeight: '1rem',       // 16px
    fontWeight: '400',
    letterSpacing: '0.025em',
  },
  label: {
    fontSize: '0.875rem',     // 14px
    lineHeight: '1.25rem',    // 20px
    fontWeight: '500',
    letterSpacing: '0',
  },
} as const;

// ============================================================================
// TRANSITION TOKENS
// ============================================================================

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export const components = {
  card: {
    padding: spacing[24],
    radius: radius['2xl'],
    shadow: shadows.md,
  },
  button: {
    paddingX: spacing[20],
    paddingY: spacing[10],
    radius: radius.lg,
    fontSize: typography['body-sm'].fontSize,
    fontWeight: typography.label.fontWeight,
  },
  input: {
    paddingX: spacing[12],
    paddingY: spacing[10],
    radius: radius.md,
    fontSize: typography.body.fontSize,
    borderWidth: '1px',
  },
  modal: {
    radius: radius['2xl'],
    shadow: shadows['2xl'],
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color with opacity
 * @param color - Base color in hex format
 * @param opacity - Opacity value between 0 and 1
 */
export function withOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * CSS custom properties for design tokens
 */
export const cssVariables = `
  :root {
    /* Primary Colors */
    --ggk-primary: ${colors.primary[600]};
    --ggk-primary-foreground: ${colors.neutral[0]};
    --ggk-primary-light: ${colors.primary[100]};
    --ggk-primary-dark: ${colors.primary[800]};

    /* Surface Colors */
    --ggk-surface: ${colors.neutral[0]};
    --ggk-bg: ${colors.neutral[50]};
    --ggk-muted: ${colors.neutral[100]};

    /* Text Colors */
    --ggk-text-primary: ${colors.neutral[900]};
    --ggk-text-secondary: ${colors.neutral[600]};
    --ggk-text-muted: ${colors.neutral[500]};

    /* Border Colors */
    --ggk-border: ${colors.neutral[200]};
    --ggk-border-strong: ${colors.neutral[300]};

    /* Status Colors */
    --ggk-success: ${colors.success.DEFAULT};
    --ggk-warning: ${colors.warning.DEFAULT};
    --ggk-danger: ${colors.danger.DEFAULT};
    --ggk-info: ${colors.info.DEFAULT};

    /* Icon Action Colors */
    --ggk-icon-view: ${colors.iconView.DEFAULT};
    --ggk-icon-view-hover: ${colors.iconView.hover};
    --ggk-icon-edit: ${colors.iconEdit.DEFAULT};
    --ggk-icon-edit-hover: ${colors.iconEdit.hover};
    --ggk-icon-delete: ${colors.iconDelete.DEFAULT};
    --ggk-icon-delete-hover: ${colors.iconDelete.hover};
    --ggk-icon-create: ${colors.iconCreate.DEFAULT};
    --ggk-icon-create-hover: ${colors.iconCreate.hover};

    /* Shadows */
    --ggk-shadow-xs: ${shadows.xs};
    --ggk-shadow-sm: ${shadows.sm};
    --ggk-shadow-md: ${shadows.md};
    --ggk-shadow-lg: ${shadows.lg};
  }

  .dark {
    /* Primary Colors - Dark Mode */
    --ggk-primary: ${colors.primary[500]};
    --ggk-primary-foreground: ${colors.neutral[900]};
    --ggk-primary-light: ${colors.primary[900]};
    --ggk-primary-dark: ${colors.primary[400]};

    /* Surface Colors - Dark Mode */
    --ggk-surface: ${colors.neutral[800]};
    --ggk-bg: ${colors.neutral[900]};
    --ggk-muted: ${colors.neutral[800]};

    /* Text Colors - Dark Mode */
    --ggk-text-primary: ${colors.neutral[50]};
    --ggk-text-secondary: ${colors.neutral[300]};
    --ggk-text-muted: ${colors.neutral[400]};

    /* Border Colors - Dark Mode */
    --ggk-border: ${colors.neutral[700]};
    --ggk-border-strong: ${colors.neutral[600]};
  }
`;

// ============================================================================
// EXPORTS
// ============================================================================

export const designTokens = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  transitions,
  components,
} as const;

export default designTokens;
