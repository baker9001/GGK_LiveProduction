# System Theme & Color Guidelines

## Overview

This document defines the **official color scheme** and styling standards for the entire application. All developers must follow these guidelines to ensure visual consistency across the platform.

---

## Primary Brand Color: Green

**Color Value:** `#8CC63F`

This green color represents our brand identity and should be used for:
- ✅ Primary action buttons
- ✅ Active/selected states
- ✅ Hover states
- ✅ Success messages
- ✅ Progress indicators
- ✅ Links and interactive elements
- ✅ Badges and labels for positive states

---

## ⚠️ NEVER Use Blue for Primary Actions

**DO NOT** use blue colors for:
- ❌ Active states
- ❌ Primary buttons
- ❌ Selected items
- ❌ Hover effects on primary elements

**Blue should ONLY be used for:**
- ℹ️ Informational messages
- ℹ️ Secondary UI elements
- ℹ️ Icons representing information/help

---

## Implementation Methods

### Method 1: Using the Theme Configuration (Recommended)

Import from `src/lib/theme.ts`:

```typescript
import {
  ACTIVE_STATE_CLASS,
  PRIMARY_BUTTON_CLASS,
  SUCCESS_STATE_CLASS,
  getActiveStateClass,
  FOCUS_RING_CLASS
} from '../../lib/theme';

// Active state button
<button className={cn('px-4 py-2', isActive && ACTIVE_STATE_CLASS)}>
  Button
</button>

// Primary button
<button className={PRIMARY_BUTTON_CLASS}>
  Submit
</button>

// Success message
<div className={SUCCESS_STATE_CLASS}>
  Operation completed successfully
</div>

// With helper function
<button className={getActiveStateClass(isSelected, 'px-4 py-2 rounded')}>
  Select
</button>
```

### Method 2: Using Tailwind Classes Directly

Use the standard green color palette:

```jsx
// Light mode
<button className="bg-green-100 text-green-700 border-green-200">
  Active
</button>

// Dark mode
<button className="dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50">
  Active
</button>

// Combined (light + dark)
<button className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50">
  Active
</button>
```

### Method 3: Using Custom Brand Colors

Use the custom `brand` or `primary` colors defined in `tailwind.config.js`:

```jsx
<button className="bg-brand-primary hover:bg-brand-primary-dark">
  Primary Action
</button>

<button className="bg-primary-500 hover:bg-primary-600">
  Alternative Syntax
</button>
```

---

## Color Scheme Reference

### Light Mode

| Usage | Background | Text | Border | Example |
|-------|------------|------|--------|---------|
| **Active State** | `bg-green-100` | `text-green-700` | `border-green-200` | Selected toolbar buttons |
| **Hover State** | `hover:bg-green-50` | `hover:text-green-600` | `hover:border-green-300` | Buttons on hover |
| **Success** | `bg-green-50` | `text-green-700` | `border-green-200` | Success alerts |
| **Primary Button** | `bg-green-600` | `text-white` | `border-green-600` | Submit buttons |
| **Link** | - | `text-green-600` | - | Clickable links |
| **Icon** | - | `text-green-600` | - | Active icons |
| **Badge** | `bg-green-100` | `text-green-700` | - | Status badges |

### Dark Mode

| Usage | Background | Text | Border | Example |
|-------|------------|------|--------|---------|
| **Active State** | `dark:bg-green-900/40` | `dark:text-green-300` | `dark:border-green-700/50` | Selected toolbar buttons |
| **Hover State** | `dark:hover:bg-green-900/20` | `dark:hover:text-green-400` | `dark:hover:border-green-700` | Buttons on hover |
| **Success** | `dark:bg-green-900/20` | `dark:text-green-300` | `dark:border-green-700` | Success alerts |
| **Primary Button** | `dark:bg-green-600` | `text-white` | `dark:border-green-600` | Submit buttons |
| **Link** | - | `dark:text-green-400` | - | Clickable links |
| **Icon** | - | `dark:text-green-400` | - | Active icons |
| **Badge** | `dark:bg-green-900/30` | `dark:text-green-300` | - | Status badges |

---

## Complete Class Strings (Copy & Paste Ready)

### Active/Selected State
```
bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50
```

### Hover State
```
hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400
```

### Success State
```
bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700
```

### Primary Button
```
bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700
```

### Focus Ring
```
focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-600
```

---

## Real-World Examples

### Example 1: Toolbar Button with Active State

```typescript
import { ACTIVE_STATE_CLASS } from '@/lib/theme';
import { cn } from '@/lib/utils';

function ToolbarButton({ isActive, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 w-9 flex items-center justify-center rounded-md',
        'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700',
        'transition-colors duration-150',
        isActive && ACTIVE_STATE_CLASS
      )}
    >
      {children}
    </button>
  );
}
```

### Example 2: Primary Action Button

```typescript
import { PRIMARY_BUTTON_CLASS } from '@/lib/theme';
import { cn } from '@/lib/utils';

function SubmitButton({ children, disabled }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        PRIMARY_BUTTON_CLASS,
        'px-6 py-2 rounded-lg font-semibold',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
```

### Example 3: Success Alert

```typescript
import { SUCCESS_STATE_CLASS } from '@/lib/theme';
import { CheckCircle } from 'lucide-react';

function SuccessAlert({ message }) {
  return (
    <div className={cn(SUCCESS_STATE_CLASS, 'p-4 rounded-lg flex items-center gap-2')}>
      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      <span>{message}</span>
    </div>
  );
}
```

### Example 4: Tab/Navigation Item

```typescript
import { getActiveStateClass } from '@/lib/theme';

function TabItem({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={getActiveStateClass(
        isActive,
        'px-4 py-2 rounded-lg transition-colors'
      )}
    >
      {label}
    </button>
  );
}
```

---

## Migration Guide

If you find components using **blue** for active states, update them:

### ❌ Before (Incorrect - Blue)
```jsx
<button className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
  Active
</button>
```

### ✅ After (Correct - Green)
```jsx
<button className={ACTIVE_STATE_CLASS}>
  Active
</button>
```

Or:

```jsx
<button className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
  Active
</button>
```

---

## Testing Checklist

When implementing new features or updating existing ones:

- [ ] All active/selected states use **green** colors
- [ ] All primary action buttons use **green** colors
- [ ] Hover effects use **green** colors for primary elements
- [ ] Success messages use **green** colors
- [ ] Links use **green** colors
- [ ] Dark mode colors are properly defined
- [ ] Component imports from `src/lib/theme.ts` where appropriate
- [ ] No blue colors used for primary interactions

---

## Quick Reference

**Import Statement:**
```typescript
import { ACTIVE_STATE_CLASS, PRIMARY_BUTTON_CLASS, getActiveStateClass } from '@/lib/theme';
```

**Active State:**
```typescript
className={cn('base-classes', isActive && ACTIVE_STATE_CLASS)}
```

**Primary Button:**
```typescript
className={cn(PRIMARY_BUTTON_CLASS, 'additional-classes')}
```

**Helper Function:**
```typescript
className={getActiveStateClass(isActive, 'base-classes')}
```

---

## Support

For questions about theme implementation:
1. Check this guide first
2. Review `src/lib/theme.ts` for available utilities
3. Look at existing components using the theme system
4. Refer to `tailwind.config.js` for custom color definitions

---

**Last Updated:** 2025-11-21
**Maintained By:** Development Team
