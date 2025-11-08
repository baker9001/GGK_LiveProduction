# Design System Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Import the Components

```tsx
// At the top of your page file
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { FilterPanel, FilterRow, FilterGroup } from '@/components/shared/FilterPanel';
import { Badge, StatusBadge } from '@/components/shared/Badge';
```

### 2. Basic Page Template

Copy and paste this template for any new page:

```tsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900 p-24">
      {/* Page Header - Always include */}
      <PageHeader
        title="Your Page Title"
        subtitle="Brief description of what this page does"
        actions={
          <>
            <Button variant="secondary">Secondary Action</Button>
            <Button>Primary Action</Button>
          </>
        }
      />

      {/* Filters (optional - for list pages) */}
      <FilterPanel
        title="Filters"
        activeFilterCount={0}
        onClear={() => {/* clear filters */}}
        className="mb-24"
      >
        <FilterRow>
          <FilterGroup label="Status">
            {/* Your filter controls */}
          </FilterGroup>
        </FilterRow>
      </FilterPanel>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your content here */}
        </CardContent>
        <CardFooter align="right">
          <Button variant="secondary">Cancel</Button>
          <Button>Save</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### 3. Common Patterns

#### List Page with Table

```tsx
<PageHeader title="Users" subtitle="Manage system users" />

<FilterPanel activeFilterCount={2}>
  <FilterRow>
    <FilterGroup label="Search">
      <Input placeholder="Search users..." />
    </FilterGroup>
    <FilterGroup label="Status">
      <Select options={statusOptions} />
    </FilterGroup>
  </FilterRow>
</FilterPanel>

<Card>
  <CardContent>
    <DataTable
      columns={columns}
      data={users}
    />
  </CardContent>
</Card>
```

#### Form Page

```tsx
<PageHeader title="Create User" />

<Card>
  <CardHeader>
    <CardTitle>User Information</CardTitle>
  </CardHeader>

  <CardContent>
    <form className="space-y-16">
      <FormField label="Name" required>
        <Input name="name" />
      </FormField>

      <FormField label="Email" required>
        <Input type="email" name="email" />
      </FormField>

      <FormField label="Role">
        <Select options={roleOptions} />
      </FormField>
    </form>
  </CardContent>

  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button type="submit">Create User</Button>
  </CardFooter>
</Card>
```

#### Wizard/Multi-Step Flow

```tsx
import { Stepper } from '@/components/shared/Stepper';

const steps = [
  { id: '1', label: 'Upload', description: 'Select file' },
  { id: '2', label: 'Configure', description: 'Set options' },
  { id: '3', label: 'Review', description: 'Confirm' },
];

<PageHeader title="Import Wizard" />

<Card className="mb-24">
  <Stepper
    steps={steps}
    currentStep={currentStep}
    onStepClick={setCurrentStep}
  />
</Card>

<Card>
  <CardContent>
    {/* Step content based on currentStep */}
  </CardContent>
  <CardFooter align="between">
    <Button variant="secondary" onClick={handleBack}>
      Back
    </Button>
    <Button onClick={handleNext}>
      Continue
    </Button>
  </CardFooter>
</Card>
```

### 4. Quick Reference - Tailwind Classes

#### Colors
```tsx
// Backgrounds
className="bg-ggk-neutral-50"           // Page background
className="bg-white dark:bg-ggk-neutral-800"  // Card background
className="bg-ggk-primary-600"          // Primary button

// Text
className="text-ggk-neutral-900"        // Primary text
className="text-ggk-neutral-600"        // Secondary text
className="text-ggk-primary-600"        // Brand text
```

#### Spacing
```tsx
className="p-24"      // Padding 24px
className="gap-16"    // Gap between items 16px
className="mt-32"     // Margin top 32px
className="space-y-16" // Vertical spacing between children
```

#### Borders & Shadows
```tsx
className="rounded-ggk-2xl"       // Large rounded corners
className="shadow-ggk-md"         // Medium shadow
className="border border-ggk-neutral-200"  // Border
```

### 5. Button Variants Quick Guide

```tsx
// Primary action (default)
<Button>Save</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Delete/Remove
<Button variant="destructive">Delete</Button>

// Outlined
<Button variant="outline">View Details</Button>

// With icons
<Button leftIcon={<Plus />}>Add Item</Button>
<Button rightIcon={<ArrowRight />}>Next</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Loading state
<Button loading>Saving...</Button>
```

### 6. Badge Usage

```tsx
// Status badges
<StatusBadge status="completed" />
<StatusBadge status="pending" />
<StatusBadge status="error" />

// Custom badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Review Needed</Badge>
<Badge variant="danger">Critical</Badge>

// Count badges
<CountBadge count={5} variant="primary" />
```

### 7. Common Spacing Patterns

```tsx
// Between page sections
className="mb-32"

// Between form fields
className="space-y-16"

// Card content padding
<Card padding="lg">  // 32px

// Gap between buttons
className="flex gap-12"
```

### 8. Responsive Grid Layouts

```tsx
// Filter row (responsive)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-16">
  {/* Filter controls */}
</div>

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
  {/* Cards */}
</div>
```

## 📋 Migration Checklist

When updating an existing page:

- [ ] Add `PageHeader` at the top with title and subtitle
- [ ] Change page background to `bg-ggk-neutral-50`
- [ ] Wrap content sections in `Card` components
- [ ] Move filters into `FilterPanel`
- [ ] Update all buttons to use the `Button` component
- [ ] Replace status indicators with `StatusBadge` or `Badge`
- [ ] Update spacing to use 8px scale (8, 16, 24, 32)
- [ ] Change colors to use `ggk-*` classes
- [ ] Update border radius to `rounded-ggk-*`
- [ ] Update shadows to `shadow-ggk-*`
- [ ] Test in dark mode
- [ ] Check responsive breakpoints (md, lg, xl)

## 🎨 Visual Hierarchy Tips

1. **Page Title (H1)**: `PageHeader` component
2. **Section Title (H3)**: `CardTitle` component
3. **Body Text**: Default (16px)
4. **Helper Text**: `text-sm` (14px)
5. **Captions**: `text-xs` (12px)

## ⚡ Performance Tips

- Use `Card` padding variants to avoid nested spacing
- Leverage `FilterRow` for automatic responsive layout
- Use `Button` loading states for async operations
- Keep component hierarchy shallow

## 🎯 Common Mistakes to Avoid

❌ **Don't do this:**
```tsx
<div style={{ backgroundColor: '#f0f0f0', padding: '15px' }}>
```

✅ **Do this instead:**
```tsx
<Card className="bg-ggk-neutral-50 p-16">
```

---

❌ **Don't do this:**
```tsx
<button className="bg-green-500 px-4 py-2 rounded">
```

✅ **Do this instead:**
```tsx
<Button>Save</Button>
```

---

❌ **Don't do this:**
```tsx
<div className="mt-5 mb-7 px-3">
```

✅ **Do this instead:**
```tsx
<div className="mt-16 mb-24 px-12">
```

## 📚 Full Documentation

For complete documentation, see: `docs/DESIGN_SYSTEM.md`

## 🆘 Need Help?

1. Check the full documentation
2. Look at reference implementations in existing pages
3. Test your changes in both light and dark modes
4. Verify keyboard navigation works

---

**Quick Start Version:** 1.0.0
**Last Updated:** 2025-11-08
