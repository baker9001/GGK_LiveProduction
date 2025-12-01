# LoadingSpinner Quick Reference Guide

## Import

```typescript
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';
```

## Basic Usage

### Simple Spinner
```typescript
<LoadingSpinner />
```

### With Message
```typescript
<LoadingSpinner size="lg" message="Loading data..." />
```

### Button Loading State
```typescript
<Button disabled={loading}>
  {loading ? (
    <>
      <LoadingSpinner size="sm" inline centered={false} />
      <span className="ml-2">Saving...</span>
    </>
  ) : (
    'Save'
  )}
</Button>
```

### Full Page Overlay
```typescript
{isProcessing && (
  <LoadingOverlay message="Processing your request..." />
)}
```

## Size Reference

| Size | Height | Use Case |
|------|--------|----------|
| xs   | 16px   | Tiny inline elements |
| sm   | 24px   | Buttons, small cards |
| md   | 40px   | Default cards, forms (default) |
| lg   | 64px   | Page sections, tabs |
| xl   | 96px   | Full page loading |
| full | 128px  | Initial app load |

## Animation Styles

| Style  | Description | Best For |
|--------|-------------|----------|
| spin   | Continuous rotation | Fast operations |
| pulse  | Breathing effect | Intermittent updates |
| bounce | Gentle bounce | Playful contexts |
| hybrid | Spin + scale (default) | General use ⭐ |

## Speed Options

| Speed  | Duration | Use Case |
|--------|----------|----------|
| slow   | 2000ms   | Heavy processing |
| normal | 1000ms   | Default operations (default) |
| fast   | 500ms    | Quick updates |

## Common Patterns

### Page Loading
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" message="Loading page..." />
    </div>
  );
}
```

### Section Loading
```typescript
{loadingSection ? (
  <LoadingSpinner size="md" message="Loading content..." />
) : (
  <YourContent />
)}
```

### Async Operation
```typescript
const handleSave = async () => {
  setLoading(true);
  try {
    await saveData();
  } finally {
    setLoading(false);
  }
};

return (
  <>
    {loading && <LoadingOverlay message="Saving changes..." />}
    <YourForm />
  </>
);
```

### Table Loading
```typescript
{loading ? (
  <DataTableSkeleton columns={5} rows={10} />
) : (
  <DataTable data={data} />
)}
```

## Props Reference

### LoadingSpinner Props

```typescript
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';  // default: 'md'
  message?: string;                                    // optional text below spinner
  animation?: 'spin' | 'pulse' | 'bounce' | 'hybrid'; // default: 'spin'
  speed?: 'slow' | 'normal' | 'fast';                 // default: 'normal'
  className?: string;                                  // additional CSS classes
  showLogo?: boolean;                                  // default: true
  centered?: boolean;                                  // default: true
  inline?: boolean;                                    // default: false
}
```

### LoadingOverlay Props

```typescript
interface LoadingOverlayProps {
  message?: string;                                    // optional loading message
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';  // default: 'xl'
  animation?: 'spin' | 'pulse' | 'bounce' | 'hybrid'; // default: 'hybrid'
  speed?: 'slow' | 'normal' | 'fast';                 // default: 'normal'
  blur?: boolean;                                      // backdrop blur, default: true
  className?: string;                                  // additional CSS classes
  portal?: boolean;                                    // render in portal, default: false
  transparent?: boolean;                               // transparent bg, default: false
  zIndex?: number;                                     // default: 50
}
```

## Migration from Loader2

### Before (Old Pattern)
```typescript
import { Loader2 } from 'lucide-react';

<div className="flex items-center">
  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
  <span className="ml-2">Loading...</span>
</div>
```

### After (New Pattern)
```typescript
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

<LoadingSpinner size="sm" message="Loading..." />
```

### Button Before
```typescript
<Button disabled={loading}>
  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  {loading ? 'Saving...' : 'Save'}
</Button>
```

### Button After
```typescript
<Button disabled={loading}>
  {loading ? (
    <>
      <LoadingSpinner size="sm" inline centered={false} />
      <span className="ml-2">Saving...</span>
    </>
  ) : (
    'Save'
  )}
</Button>
```

## Accessibility

The LoadingSpinner automatically includes:
- `role="status"` for semantic meaning
- `aria-live="polite"` for screen reader announcements
- `aria-label` with the message or default text
- Hidden span with descriptive text for screen readers
- Respects `prefers-reduced-motion` user setting

## Best Practices

### ✅ DO
- Use consistent sizes across similar contexts
- Provide meaningful messages for long operations
- Use LoadingOverlay for blocking operations
- Respect user's motion preferences
- Test with screen readers

### ❌ DON'T
- Mix Loader2 and LoadingSpinner in same view
- Use xl/full sizes for small components
- Forget to set loading=false after operations
- Use without a loading message for long waits
- Nest multiple spinners

## Examples by Context

### Authentication
```typescript
<LoadingSpinner size="sm" inline centered={false} />
<span className="ml-2">Signing in...</span>
```

### Data Import
```typescript
<LoadingOverlay
  message="Importing questions..."
  size="xl"
  animation="hybrid"
/>
```

### Form Submission
```typescript
<LoadingSpinner size="sm" inline centered={false} />
```

### Page Navigation
```typescript
<LoadingSpinner size="lg" message="Loading page..." />
```

### Modal/Dialog
```typescript
<LoadingSpinner size="md" message="Loading details..." />
```

## Troubleshooting

### Spinner Not Showing
- Check if `showLogo={true}` (default)
- Verify logo file exists at `/Go Green Knowledge Logo-01 - Copy.png`
- Check parent container has sufficient height

### Animation Not Working
- Ensure custom animations are in `index.css`
- Check browser DevTools for CSS issues
- Verify no CSS conflicts with `animate-*` classes

### Wrong Size
- Double-check size prop value
- Verify parent container isn't constraining size
- Check if `inline` prop affects layout

## Support

For issues or questions:
1. Check this guide first
2. Review implementation in updated pages
3. Check console for errors
4. Verify props are correctly passed

## Related Components

- **DataTableSkeleton**: For table loading states
- **ProgressBar**: For deterministic progress
- **StatusBadge**: For status indicators

---

**Version:** 1.0.0
**Last Updated:** December 2025
**Maintainer:** Development Team
