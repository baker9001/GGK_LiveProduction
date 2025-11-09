# Design System Migration Strategy & Best Practices

## Executive Summary

**Status**: 1 of 60 pages (1.7%) fully migrated to Modern EdTech Design System
**Goal**: Migrate all 59 remaining pages following best practices
**Average Current Adoption**: 20.1%

---

## Migration Philosophy

### Core Principles

1. **Consistency Over Perfection**: All pages should feel like one cohesive application
2. **Progressive Enhancement**: Maintain functionality while improving aesthetics
3. **Component Reuse**: Never duplicate - always use shared components
4. **Token-Driven Design**: All colors, spacing, shadows from design tokens
5. **Accessibility First**: Maintain WCAG AA compliance throughout

### Migration Priorities

**Phase 1: Critical User Journeys** (High Impact)
- Module landing pages (primary navigation hubs)
- Auth flow pages (first user impression)
- Dashboard pages (daily usage)

**Phase 2: Feature Pages** (Medium Impact)
- Configuration & management pages
- Content creation & editing pages
- Analytics & reporting pages

**Phase 3: Public Pages** (Lower Impact)
- Landing pages (marketing content)
- Legal pages (infrequent access)

---

## Best Practices Checklist

### 1. Page Structure Pattern

Every page MUST follow this exact structure:

```tsx
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { Button } from '@/components/shared/Button';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900">
      {/* 1. Page Header - ALWAYS first */}
      <PageHeader
        title="Page Title"
        subtitle="Clear description of page purpose"
        actions={<Button>Primary Action</Button>}
        accent={true}
      />

      {/* 2. Filters - ONLY if page has filterable data */}
      <div className="px-24 py-16">
        <FilterPanel
          title="Filters"
          onClear={handleClearFilters}
          activeFilterCount={activeFilters}
        >
          {/* Filter controls in FilterRow/FilterGroup */}
        </FilterPanel>
      </div>

      {/* 3. Main Content - Cards with proper spacing */}
      <div className="px-24 pb-32 space-y-24">
        <Card variant="elevated">
          <CardHeader accent>
            <CardTitle>Section Title</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Content here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 2. Design Token Usage Rules

**ALWAYS use design tokens. NEVER use arbitrary values.**

✅ **Correct**:
```tsx
<div className="bg-ggk-neutral-100 text-ggk-neutral-900 p-24 rounded-ggk-lg shadow-ggk-md">
```

❌ **Incorrect**:
```tsx
<div className="bg-gray-100 text-gray-900 p-6 rounded-lg shadow-md">
```

### 3. Spacing System (8px base unit)

| Value | Class | Usage |
|-------|-------|-------|
| 8px | `gap-8`, `p-8` | Tight spacing (icon-text gaps) |
| 16px | `gap-16`, `p-16` | Form field spacing |
| 24px | `gap-24`, `p-24` | Card padding, section spacing |
| 32px | `gap-32`, `p-32` | Major section separation |
| 48px | `gap-48`, `p-48` | Module separation |

### 4. Color Application

**Background Hierarchy**:
- Page: `bg-ggk-neutral-50`
- Card: `bg-white` or `bg-ggk-neutral-0`
- Nested sections: `bg-ggk-neutral-100`

**Text Hierarchy**:
- Primary: `text-ggk-neutral-900`
- Secondary: `text-ggk-neutral-700`
- Tertiary: `text-ggk-neutral-500`
- Disabled: `text-ggk-neutral-400`

**Interactive Elements**:
- Primary actions: `bg-ggk-primary-600 hover:bg-ggk-primary-700`
- Success: `bg-ggk-success-500`
- Danger: `bg-ggk-danger-500`
- Warning: `bg-ggk-warning-500`

### 5. Component Selection Guide

| Use Case | Component | Required Props |
|----------|-----------|----------------|
| Page title area | `PageHeader` | `title`, `subtitle`, `actions` |
| Content container | `Card` | `variant="elevated"` |
| Data filtering | `FilterPanel` | `title`, `onClear` |
| Primary action | `Button` | `variant="default"` |
| Secondary action | `Button` | `variant="secondary"` |
| Delete/remove | `Button` | `variant="destructive"` |
| Status indicator | `StatusBadge` | `status` |
| Count display | `CountBadge` | `count`, `variant` |
| Progress wizard | `Stepper` | `steps`, `currentStep` |
| Data display | `DataTable` | `columns`, `data` |

### 6. Responsive Design Requirements

All pages MUST be responsive:

```tsx
// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">

// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-16">

// Hide on mobile, show on desktop
<div className="hidden md:block">

// Responsive padding
<div className="px-16 md:px-24 lg:px-32">
```

### 7. Dark Mode Support

ALWAYS provide dark mode variants:

```tsx
<div className="bg-white dark:bg-ggk-neutral-800">
  <h1 className="text-ggk-neutral-900 dark:text-ggk-neutral-50">
  <div className="border-ggk-neutral-200 dark:border-ggk-neutral-700">
```

### 8. Accessibility Requirements

- All interactive elements must have focus rings
- All icon buttons must have `aria-label`
- Form fields must have associated labels
- Status changes must be announced (use `role="status"`)
- Maintain WCAG AA contrast ratios (4.5:1 for text)

### 9. Performance Best Practices

**Component Imports**: Use named imports
```tsx
import { Button } from '@/components/shared/Button';
```

**Conditional Rendering**: Use early returns
```tsx
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorState />;
```

**Memoization**: Use for expensive calculations
```tsx
const filteredData = useMemo(() =>
  data.filter(item => item.status === filter),
  [data, filter]
);
```

### 10. Empty States & Loading States

**ALWAYS provide**:
```tsx
{isLoading ? (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-ggk-primary-500" />
  </div>
) : data.length === 0 ? (
  <EmptyState
    icon={Inbox}
    title="No items found"
    description="Try adjusting your filters or create a new item."
    action={<Button>Create Item</Button>}
  />
) : (
  <DataTable data={data} columns={columns} />
)}
```

---

## Module-Specific Guidelines

### System Admin Pages
- Heavy data focus - prioritize FilterPanel and DataTable
- Use elevated Cards for important sections
- Show system health indicators prominently
- Include export/import actions in PageHeader

### Entity Module Pages
- Organizational hierarchy visualizations
- Multi-tab layouts with Tabs component
- Relationship indicators (parent-child)
- Bulk action support

### Teachers Module Pages
- Student-centric data views
- Calendar and scheduling components
- Material upload and management
- Progress tracking visualizations

### Student Module Pages
- Simplified, focus-driven interfaces
- Large, clear CTAs for primary actions
- Progress indicators and achievements
- Personal profile management

### Landing Pages
- Hero sections with gradient backgrounds
- Feature showcases with icons
- Social proof and testimonials
- Clear conversion paths

### Auth Pages
- Clean, centered layouts (max-w-md)
- Clear error messaging
- Password visibility toggles
- Remember me / Stay signed in options

---

## Migration Process

### For Each Page:

1. **Analyze Current State**
   - Identify existing components
   - Map data flows
   - Note any special functionality

2. **Apply Design System**
   - Add PageHeader at top
   - Wrap sections in Cards
   - Replace buttons with Button component
   - Apply design tokens to all colors/spacing
   - Add FilterPanel if applicable

3. **Test Thoroughly**
   - Verify all functionality works
   - Test responsive breakpoints
   - Check dark mode
   - Verify keyboard navigation
   - Test loading & empty states

4. **Verify Build**
   - Run `npm run build`
   - Fix any TypeScript errors
   - Resolve any linting issues

---

## Quality Gates

Before marking a page as "migrated":

- [ ] Uses PageHeader component
- [ ] Uses Card components for sections
- [ ] Uses Button component (not raw <button>)
- [ ] All colors from design tokens (ggk-*)
- [ ] All spacing follows 8px scale
- [ ] Responsive at all breakpoints
- [ ] Dark mode implemented
- [ ] Loading states present
- [ ] Empty states present
- [ ] Accessibility verified (keyboard nav, focus rings, labels)
- [ ] Build passes without errors
- [ ] No console errors in browser

---

## Anti-Patterns to Avoid

❌ **Don't**:
- Mix design tokens with arbitrary Tailwind classes
- Create inline styles with `style={{...}}`
- Use raw HTML buttons/inputs
- Duplicate component code
- Skip empty/loading states
- Ignore mobile breakpoints
- Use purple/indigo colors (unless explicitly requested)
- Create pages without PageHeader

✅ **Do**:
- Reuse existing shared components
- Follow the page structure pattern
- Use design tokens consistently
- Test at all breakpoints
- Provide clear user feedback
- Maintain accessibility
- Document any new patterns

---

## Success Metrics

### Target State (End of Migration):
- **100% pages** using PageHeader
- **100% pages** using Card components
- **100% pages** using design tokens
- **100% pages** responsive
- **100% pages** dark mode ready
- **0 build errors**
- **Average adoption score: 95%+**

### Current State:
- ✅ Dashboard: 90% adoption (reference implementation)
- 🔶 License Management: 60% adoption
- ❌ 58 pages: 0-40% adoption

---

## Reference Implementation

**Gold Standard**: `/src/app/system-admin/dashboard/page.tsx`

This page demonstrates:
- Perfect PageHeader usage
- Proper Card hierarchy
- FilterPanel implementation
- Design token consistency
- Responsive grid layouts
- Loading & empty states
- Dark mode support

Study this implementation before starting each migration.

---

## Support & Questions

When in doubt:
1. Reference the dashboard implementation
2. Check `/docs/DESIGN_SYSTEM.md`
3. Review design tokens in `/src/lib/design-tokens.ts`
4. Test with real data in browser

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Applies To**: All 60 application pages
