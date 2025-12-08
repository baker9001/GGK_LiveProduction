# Dynamic Answer Field Adaptation - Quick Start Guide

## For Developers

### What This Feature Does

When a user changes the **answer format** (e.g., from "Single Word" to "Calculation") or **answer requirement** (e.g., from "Single Choice" to "Any 2 From"), the system now:

1. ✅ **Detects the change** automatically
2. ✅ **Analyzes compatibility** (can answers be migrated?)
3. ✅ **Shows a dialog** if user confirmation needed
4. ✅ **Migrates the answers** based on user choice
5. ✅ **Provides undo** for 30 seconds

---

## Files Created

```
src/
├── services/
│   └── answerFieldMigrationService.ts      # Migration logic
├── hooks/
│   └── useAnswerFormatSync.ts              # Change detection
└── components/shared/
    ├── FormatChangeDialog.tsx              # Format change UI
    ├── RequirementChangeDialog.tsx         # Requirement change UI
    └── InlineAnswerAdaptor.tsx             # Success notifications
```

---

## How to Use in Your Component

### Step 1: Import the Hook and Components

```typescript
import { useAnswerFormatSync } from '@/hooks/useAnswerFormatSync';
import { FormatChangeDialog } from '@/components/shared/FormatChangeDialog';
import { RequirementChangeDialog } from '@/components/shared/RequirementChangeDialog';
import { InlineAnswerAdaptor } from '@/components/shared/InlineAnswerAdaptor';
```

### Step 2: Initialize the Hook

```typescript
const formatSync = useAnswerFormatSync({
  currentFormat: question.answer_format,
  currentRequirement: question.answer_requirement,
  currentAnswers: question.correct_answers || [],
  onFormatChange: async (format) => {
    // Update format in database
    await updateField({ questionId, field: 'answer_format', value: format });
  },
  onRequirementChange: async (requirement) => {
    // Update requirement in database
    await updateField({ questionId, field: 'answer_requirement', value: requirement });
  },
  onAnswersUpdate: async (answers) => {
    // Update answers in database
    await updateCorrectAnswers({ questionId, correctAnswers: answers });
  },
  autoAdapt: false, // Set to true for silent migrations
  enabled: !readOnly // Only enable when editing allowed
});
```

### Step 3: Render the Components

```tsx
return (
  <>
    {/* Format Change Dialog */}
    {formatSync.state.showFormatDialog && formatSync.state.pendingFormatChange && (
      <FormatChangeDialog
        isOpen={formatSync.state.showFormatDialog}
        oldFormat={formatSync.state.pendingFormatChange.oldFormat}
        newFormat={formatSync.state.pendingFormatChange.newFormat}
        compatibility={formatSync.state.pendingFormatChange.compatibility}
        currentAnswerCount={question.correct_answers?.length || 0}
        onConfirm={formatSync.confirmFormatChange}
        onCancel={formatSync.cancelFormatChange}
      />
    )}

    {/* Requirement Change Dialog */}
    {formatSync.state.showRequirementDialog && formatSync.state.pendingRequirementChange && (
      <RequirementChangeDialog
        isOpen={formatSync.state.showRequirementDialog}
        oldRequirement={formatSync.state.pendingRequirementChange.oldRequirement}
        newRequirement={formatSync.state.pendingRequirementChange.newRequirement}
        compatibility={formatSync.state.pendingRequirementChange.compatibility}
        currentAnswers={question.correct_answers || []}
        onConfirm={formatSync.confirmRequirementChange}
        onCancel={formatSync.cancelRequirementChange}
      />
    )}

    {/* Your main content */}
    <div>
      {/* Inline notification */}
      <InlineAnswerAdaptor
        isVisible={formatSync.state.showInlineAdaptor}
        formatChange={formatSync.state.pendingFormatChange}
        requirementChange={formatSync.state.pendingRequirementChange}
        canUndo={formatSync.state.canUndo}
        onDismiss={formatSync.dismissInlineAdaptor}
        onUndo={formatSync.undo}
      />

      {/* Rest of your component */}
    </div>
  </>
);
```

---

## Migration Service API

### Check Compatibility

```typescript
import { answerFieldMigrationService } from '@/services/answerFieldMigrationService';

const compatibility = answerFieldMigrationService.checkFormatCompatibility(
  'single_word',      // old format
  'calculation',      // new format
  currentAnswers      // existing answers
);

// Returns:
// {
//   isCompatible: true,
//   requiresConfirmation: true,
//   canAutoMigrate: false,
//   warnings: ['Text answers may not be valid numbers'],
//   suggestedStrategy: 'preserve'
// }
```

### Migrate Answers

```typescript
const result = answerFieldMigrationService.migrateAnswerFormat(
  'single_word',      // old format
  'calculation',      // new format
  currentAnswers,     // existing answers
  'preserve'          // strategy: 'preserve' | 'extract' | 'reset' | 'auto'
);

// Returns:
// {
//   success: true,
//   migratedAnswers: [...],
//   warnings: [...],
//   requiresUserInput: true,
//   lossOfData: false
// }
```

### Validate Structure

```typescript
const validation = answerFieldMigrationService.validateAnswerStructure(
  'calculation',      // format
  'any_2_from',      // requirement
  currentAnswers     // answers to validate
);

// Returns:
// {
//   valid: true,
//   errors: [],
//   warnings: ['Answer 2 may not be a valid number']
// }
```

---

## Migration Strategies

### 1. Preserve Data (Default)
- Keeps all existing answers
- Adapts to new format structure
- Best for compatible format changes

### 2. Extract Main Answer
- Takes primary answer only
- Removes complex structure
- Best for simplifying formats

### 3. Reset
- Clears all answers
- Starts fresh
- Best when formats are incompatible

### 4. Auto
- Seamless migration
- No user interaction
- Best for same-category changes

---

## Common Patterns

### Pattern 1: Silent Auto-Migration

```typescript
const formatSync = useAnswerFormatSync({
  // ... other props
  autoAdapt: true,  // ✅ Enable auto-migration
  enabled: true
});

// Format changes between compatible types (e.g., single_word → single_line)
// will migrate automatically without showing dialogs
```

### Pattern 2: Manual Confirmation Only

```typescript
const formatSync = useAnswerFormatSync({
  // ... other props
  autoAdapt: false, // ✅ Always show dialogs
  enabled: true
});

// All format/requirement changes will show confirmation dialogs
```

### Pattern 3: Read-Only Mode

```typescript
const formatSync = useAnswerFormatSync({
  // ... other props
  enabled: !readOnly // ✅ Disable when read-only
});

// No migration logic runs when enabled=false
```

### Pattern 4: Validate Before Save

```typescript
const validation = formatSync.validateAnswerStructure();

if (!validation.valid) {
  toast.error(`Cannot save: ${validation.errors.join(', ')}`);
  return;
}

// Proceed with save
await saveQuestion();
```

---

## Testing Your Integration

### Manual Test Checklist

**Format Changes:**
- [ ] Change from single_word to calculation
- [ ] Dialog appears with strategy selection
- [ ] Select "Preserve Data" and confirm
- [ ] Answers are migrated correctly
- [ ] Undo button appears for 30 seconds
- [ ] Click undo, format reverts

**Requirement Changes:**
- [ ] Change from single_choice to any_2_from
- [ ] Dialog shows answer selection
- [ ] Select 2 answers and confirm
- [ ] Unselected answers are removed
- [ ] Undo button works

**Edge Cases:**
- [ ] Change requirement with insufficient answers → Blocked
- [ ] Compatible format change → Auto-migrates
- [ ] Incompatible format → Shows reset option
- [ ] Undo after 30 seconds → Button disabled

---

## Troubleshooting

### Dialog Not Appearing

**Issue:** Format changes but no dialog shows
**Cause:** `enabled: false` or `autoAdapt: true` with compatible change
**Solution:** Check hook configuration

```typescript
// Debug: Log state changes
console.log('Format Sync State:', formatSync.state);
```

### Answers Not Updating

**Issue:** Migration completes but answers don't update
**Cause:** `onAnswersUpdate` callback not firing or failing
**Solution:** Check mutation function

```typescript
onAnswersUpdate: async (answers) => {
  console.log('Updating answers:', answers);
  try {
    await updateCorrectAnswers({ questionId, correctAnswers: answers });
    console.log('Update successful');
  } catch (error) {
    console.error('Update failed:', error);
  }
}
```

### Undo Not Working

**Issue:** Undo button appears but doesn't revert
**Cause:** Callback not connected or timeout expired
**Solution:** Check timing and connection

```typescript
// Undo available for 30 seconds only
console.log('Can Undo:', formatSync.state.canUndo);
console.log('Undo State:', formatSync.state.undoState);
```

### Build Errors

**Issue:** TypeScript errors after adding feature
**Cause:** Missing imports or type mismatches
**Solution:** Check imports and types

```typescript
// Ensure all imports are correct
import { useAnswerFormatSync } from '@/hooks/useAnswerFormatSync';
import { FormatChangeDialog } from '@/components/shared/FormatChangeDialog';
// etc.
```

---

## Performance Tips

### 1. Lazy Load Dialogs

```typescript
// Import dialogs only when needed (code splitting)
const FormatChangeDialog = lazy(() => import('@/components/shared/FormatChangeDialog'));
```

### 2. Memoize Compatibility Checks

```typescript
// In migration service, results are deterministic
// Consider caching compatibility checks for same format pairs
```

### 3. Debounce Format Changes

```typescript
// If format selector allows rapid changes, debounce
const debouncedFormatChange = useMemo(
  () => debounce(onFormatChange, 300),
  [onFormatChange]
);
```

### 4. Optimize Answer Updates

```typescript
// Batch answer updates if migrating multiple questions
const batchUpdateAnswers = async (updates) => {
  // Update all in single transaction
  await supabase.rpc('batch_update_answers', { updates });
};
```

---

## Integration Points

### Already Integrated
✅ **QuestionCard** (Question Review page)
- Located: `/src/app/system-admin/learning/practice-management/questions-setup/components/QuestionCard.tsx`
- Usage: Main question editing interface

### Future Integration Opportunities
🔄 **QuestionImportReviewWorkflow** (JSON Import)
- Location: `/src/components/shared/QuestionImportReviewWorkflow.tsx`
- Benefit: Migrate during import process

🔄 **EnhancedQuestionCard** (Other views)
- Location: Various question display components
- Benefit: Consistent migration UX everywhere

🔄 **BulkQuestionEdit** (Bulk operations)
- Location: Future bulk edit modal
- Benefit: Migrate multiple questions at once

---

## API Reference

### Hook: useAnswerFormatSync

**Parameters:**
```typescript
{
  currentFormat: string | null,
  currentRequirement: string | null,
  currentAnswers: CorrectAnswer[],
  onFormatChange: (format: string | null) => Promise<void>,
  onRequirementChange: (requirement: string | null) => Promise<void>,
  onAnswersUpdate: (answers: CorrectAnswer[]) => Promise<void>,
  autoAdapt?: boolean,  // default: false
  enabled?: boolean     // default: true
}
```

**Returns:**
```typescript
{
  state: FormatSyncState,
  confirmFormatChange: (strategy: MigrationStrategy) => Promise<MigrationResult>,
  confirmRequirementChange: (selectedAnswers?: CorrectAnswer[]) => Promise<void>,
  cancelFormatChange: () => Promise<void>,
  cancelRequirementChange: () => Promise<void>,
  dismissInlineAdaptor: () => void,
  undo: () => Promise<void>,
  validateAnswerStructure: () => ValidationResult,
  getSuggestedAnswerCount: () => number
}
```

### Service: answerFieldMigrationService

**Methods:**
- `checkFormatCompatibility(old, new, answers): CompatibilityCheck`
- `checkRequirementCompatibility(old, new, answers): CompatibilityCheck`
- `migrateAnswerFormat(old, new, answers, strategy): MigrationResult`
- `validateAnswerStructure(format, requirement, answers): ValidationResult`
- `suggestAnswerCount(requirement): number`
- `extractMainAnswer(complexAnswer): string`

---

## Best Practices

### 1. Always Enable in Edit Mode Only

```typescript
enabled: canEdit && !readOnly
```

### 2. Provide Clear Feedback

```typescript
// Show toast after successful migration
toast.success('Answer format updated successfully');
```

### 3. Log Important Events

```typescript
// Log migrations for debugging/analytics
console.log('Format migrated:', {
  old: oldFormat,
  new: newFormat,
  strategy: selectedStrategy,
  answerCount: migratedAnswers.length
});
```

### 4. Handle Errors Gracefully

```typescript
try {
  await formatSync.confirmFormatChange('preserve');
} catch (error) {
  console.error('Migration failed:', error);
  toast.error('Failed to migrate answers. Please try again.');
}
```

### 5. Test Edge Cases

- Empty answers array
- Null format/requirement values
- Network failures during migration
- Concurrent user edits

---

## Getting Help

### Documentation
- Full implementation details: `DYNAMIC_ANSWER_FIELD_ADAPTATION_IMPLEMENTATION_COMPLETE.md`
- Architecture overview: See "Technical Architecture" section in main doc

### Code Examples
- Primary example: `QuestionCard.tsx` lines 89-118, 477-501, 693-701
- Service usage: `answerFieldMigrationService.ts`
- Hook usage: `useAnswerFormatSync.ts`

### Common Issues
- Check `TROUBLESHOOTING` section above
- Review build logs for TypeScript errors
- Inspect browser console for runtime errors
- Use React DevTools to debug state

---

**Quick Start Version:** 1.0
**Last Updated:** Implementation Complete
**Status:** Ready for Development Use
