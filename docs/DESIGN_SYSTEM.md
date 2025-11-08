# GGK Admin System - Design System Documentation

## Overview

The GGK Admin System design system provides a unified visual language with consistent components, tokens, and patterns. This system ensures visual hierarchy, professional appearance, and maintainable code across all modules.

---

## Design Tokens

### Colors

#### Primary Brand Colors
```tsx
import { colors } from '../lib/design-tokens';

colors.primary[50]  // #f4fae8 - Lightest green
colors.primary[500] // #8CC63F - Main brand green
colors.primary[600] // #7AB635 - Primary actions
colors.primary[900] // #4a6319 - Darkest green
```

**Usage:**
- Primary actions (buttons, links, active states)
- Brand elements and accents
- Focus states and highlights

#### Neutral Colors
```tsx
colors.neutral[0]   // #ffffff - Pure white
colors.neutral[50]  // #fafbfc - Page background
colors.neutral[100] // #f5f7fa - Card/section background
colors.neutral[500] // #6b7280 - Secondary text
colors.neutral[900] // #111827 - Primary text
```

**Usage:**
- Text hierarchy (900→700→500)
- Backgrounds and surfaces
- Borders and dividers

#### Semantic Colors
```tsx
colors.success.DEFAULT  // #10b981 - Green
colors.warning.DEFAULT  // #f59e0b - Amber
colors.danger.DEFAULT   // #ef4444 - Red
colors.info.DEFAULT     // #3b82f6 - Blue
```

**Usage:**
- Status indicators
- Alerts and notifications
- Validation feedback

### Spacing

Consistent spacing scale using 8px base unit:

```tsx
import { spacing } from '../lib/design-tokens';

spacing[8]  // 0.5rem (8px)
spacing[16] // 1rem (16px)
spacing[24] // 1.5rem (24px)
spacing[32] // 2rem (32px)
```

**Tailwind Classes:**
- `p-8` (padding: 8px)
- `gap-16` (gap: 16px)
- `mt-24` (margin-top: 24px)

### Border Radius

Rounded corners for modern UI:

```tsx
import { radius } from '../lib/design-tokens';

radius.sm   // 0.5rem (8px)
radius.md   // 0.75rem (12px)
radius.lg   // 1rem (16px)
radius['2xl'] // 1.5rem (24px)
```

**Tailwind Classes:**
- `rounded-ggk-sm` - Small radius (inputs, buttons)
- `rounded-ggk-lg` - Large radius (buttons, badges)
- `rounded-ggk-2xl` - Extra large (cards, modals)

### Shadows

Soft, neutral elevation shadows:

```tsx
import { shadows } from '../lib/design-tokens';

shadows.xs  // Subtle lift
shadows.sm  // Small components
shadows.md  // Cards and panels
shadows.lg  // Modals and overlays
```

**Tailwind Classes:**
- `shadow-ggk-xs`
- `shadow-ggk-sm`
- `shadow-ggk-md`
- `shadow-ggk-lg`

### Typography

Consistent text hierarchy:

```tsx
import { typography } from '../lib/design-tokens';

typography.h1 // 36px, weight 700, line-height 40px
typography.h3 // 24px, weight 600, line-height 32px
typography.body // 16px, weight 400, line-height 24px
typography.caption // 12px, weight 400, line-height 16px
```

**Usage:**
- H1: Page titles
- H2-H3: Section headers
- H4-H5: Card titles
- Body: Regular text
- Caption: Helper text, timestamps

---

## Components

### PageHeader

Consistent page header with title, subtitle, and actions.

```tsx
import { PageHeader } from '@/components/shared/PageHeader';

<PageHeader
  title="Admin Users"
  subtitle="Manage system administrators and their permissions"
  actions={
    <>
      <Button variant="secondary">Export</Button>
      <Button>Add User</Button>
    </>
  }
  accent={true} // Green accent underline
/>
```

**Props:**
- `title` (required): Main page heading
- `subtitle`: Optional description
- `actions`: Action buttons (right-aligned)
- `accent`: Show green accent line (default: true)

---

### Card Components

Elevated container with consistent styling.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/shared/Card';

<Card variant="elevated" padding="lg">
  <CardHeader accent>
    <CardTitle>User Details</CardTitle>
    <CardDescription>
      Update user information and permissions
    </CardDescription>
  </CardHeader>

  <CardContent>
    {/* Form fields or content */}
  </CardContent>

  <CardFooter align="right">
    <Button variant="secondary">Cancel</Button>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

**Variants:**
- `default`: Standard card with shadow
- `outlined`: Border instead of shadow
- `elevated`: Stronger shadow with hover effect

**Padding:**
- `none`: No padding (for full-width content)
- `sm`: 16px
- `md`: 24px (default)
- `lg`: 32px

---

### Button

Primary action component with multiple variants.

```tsx
import { Button } from '@/components/shared/Button';

// Primary action
<Button>Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// With icons
<Button leftIcon={<Plus />}>Add User</Button>
<Button rightIcon={<ArrowRight />}>Continue</Button>

// Loading state
<Button loading loadingText="Saving...">Save</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Icon-only
<Button size="icon"><Settings /></Button>
```

**Variants:**
- `default`: Primary green button
- `secondary`: Neutral button
- `destructive`: Red for delete/remove
- `outline`: Bordered transparent
- `ghost`: Text-only
- `link`: Underlined link style
- `success`: Green
- `warning`: Amber

---

### Stepper

Horizontal or vertical wizard step indicator.

```tsx
import { Stepper, VerticalStepper } from '@/components/shared/Stepper';

const steps = [
  { id: '1', label: 'Upload JSON', description: 'Select file' },
  { id: '2', label: 'Configure', description: 'Set parameters' },
  { id: '3', label: 'Review', description: 'Verify data' },
];

// Horizontal
<Stepper
  steps={steps}
  currentStep={1}
  onStepClick={(index) => setStep(index)}
  allowClickPrevious={true}
/>

// Vertical (for sidebars)
<VerticalStepper
  steps={steps}
  currentStep={1}
  variant="compact"
/>
```

**Features:**
- Visual progress indication
- Clickable previous steps
- Custom icons per step
- Responsive design

---

### FilterPanel

Collapsible filter container for tables and lists.

```tsx
import { FilterPanel, FilterGroup, FilterRow } from '@/components/shared/FilterPanel';

<FilterPanel
  title="Filters"
  activeFilterCount={3}
  onClear={handleClearFilters}
  defaultOpen={true}
>
  <FilterRow>
    <FilterGroup label="Status">
      <Select options={statusOptions} />
    </FilterGroup>

    <FilterGroup label="Date Range">
      <DatePicker />
    </FilterGroup>

    <FilterGroup label="Search">
      <Input placeholder="Search users..." />
    </FilterGroup>
  </FilterRow>
</FilterPanel>
```

**Features:**
- Collapsible with animation
- Active filter count badge
- Clear all button
- Responsive grid layout

---

### Badge

Status indicators and labels.

```tsx
import { Badge, StatusBadge, CountBadge, DotBadge } from '@/components/shared/Badge';

// Standard badge
<Badge variant="primary">New</Badge>

// Status badge
<StatusBadge status="completed" />
<StatusBadge status="pending" />
<StatusBadge status="error" />

// Count badge
<CountBadge count={5} variant="danger" />
<CountBadge count={150} max={99} /> // Shows "99+"

// Dot indicator
<DotBadge variant="success" pulse />
```

**Variants:**
- `default`: Neutral gray
- `primary`: Brand green
- `success`: Emerald
- `warning`: Amber
- `danger`: Red
- `info`: Blue

**Sizes:** `sm`, `md`, `lg`

---

## Global Page Scaffolding

Every page should follow this structure:

```tsx
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/shared/Card';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { Button } from '@/components/shared/Button';

function MyPage() {
  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900">
      {/* Page Header */}
      <PageHeader
        title="Page Title"
        subtitle="Brief description of the page purpose"
        actions={<Button>Primary Action</Button>}
      />

      {/* Filters (if applicable) */}
      <FilterPanel>
        {/* Filter controls */}
      </FilterPanel>

      {/* Main Content */}
      <Card>
        <CardContent>
          {/* Table, form, or content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Usage Guidelines

### Do's ✓

- **Use design tokens** for all colors, spacing, and shadows
- **Apply consistent spacing** between sections (24px-32px)
- **Use Card components** for elevated content sections
- **Group related filters** in FilterPanel above tables
- **Right-align primary actions** in footers
- **Show loading states** on async actions
- **Provide clear visual feedback** on interactions

### Don'ts ✗

- **Don't use arbitrary colors** - always use token colors
- **Don't mix spacing values** - stick to the 8px scale
- **Don't create flat layouts** - use cards for elevation
- **Don't hide actions** - keep CTAs visible and accessible
- **Don't skip empty states** - show helpful messages
- **Don't ignore dark mode** - test both themes

---

## Accessibility

### AA Contrast Requirements

All text must meet WCAG AA standards:
- **Normal text (16px)**: 4.5:1 contrast ratio
- **Large text (24px+)**: 3:1 contrast ratio

Our token colors are pre-validated for AA compliance.

### Interactive Elements

- All buttons have focus rings (`focus-visible:ring-2`)
- Icon buttons must have `aria-label`
- Form fields have associated labels
- Status changes announced to screen readers

### Keyboard Navigation

- Tab order follows visual flow
- Escape closes modals and dropdowns
- Enter/Space activate buttons
- Arrow keys navigate lists and steppers

---

## Migration Checklist

### For Existing Pages:

- [ ] Replace page background with `bg-ggk-neutral-50`
- [ ] Add PageHeader at the top
- [ ] Wrap content sections in Card components
- [ ] Move filters into FilterPanel
- [ ] Update buttons to use Button component
- [ ] Replace status text with Badge/StatusBadge
- [ ] Apply consistent spacing (16px, 24px, 32px)
- [ ] Update colors to use ggk-* classes
- [ ] Test in dark mode
- [ ] Verify keyboard navigation
- [ ] Check AA contrast

### For New Features:

- [ ] Start with page scaffolding template
- [ ] Use design tokens for all values
- [ ] Reference existing components
- [ ] Follow spacing scale
- [ ] Include empty states
- [ ] Add loading states
- [ ] Test responsive breakpoints
- [ ] Document any new patterns

---

## Color Reference Table

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `ggk-primary-600` | #7AB635 | #8CC63F | Primary actions |
| `ggk-neutral-50` | #fafbfc | #111827 | Page background |
| `ggk-neutral-900` | #111827 | #fafbfc | Primary text |
| `text-ggk-neutral-600` | #4b5563 | #9ca3af | Secondary text |

---

## Spacing Reference

| Class | Value | Usage |
|-------|-------|-------|
| `p-16` | 16px | Compact padding |
| `p-24` | 24px | Standard card padding |
| `gap-16` | 16px | Form field spacing |
| `mt-32` | 32px | Section separation |

---

## Examples

See reference implementations in:
- **List Page**: `/src/app/system-admin/admin-users/page.tsx`
- **Form Page**: `/src/app/system-admin/learning/materials/page.tsx`
- **Wizard**: `/src/app/system-admin/learning/practice-management/papers-setup/page.tsx`

---

## Support

For questions or suggestions about the design system, please:
1. Review this documentation
2. Check reference implementations
3. Test in both light and dark modes
4. Verify accessibility with keyboard navigation

---

**Last Updated:** 2025-11-08
**Version:** 1.0.0
