# Mock Exam Wizard - Branch and Year Group Selection Fix

## Issue

The branches and year groups fields in the Mock Exam Creation Wizard were stuck in "Loading..." state and remained disabled, even after schools were selected.

## Root Cause

The MockExamCreationWizard component manages its own internal state (`formData`) for form fields. When schools were selected within the wizard:

1. The wizard's internal `formData.schools` was updated
2. However, the parent component's `formState.schools` remained empty
3. The React Query hooks `useBranches` and `useGradeLevels` were dependent on `formState.schools` from the parent
4. Since `formState.schools` was empty, the queries never triggered with valid school IDs
5. The fields showed "Loading..." but never actually fetched data

## Solution

Added callback props to the MockExamCreationWizard to notify the parent component when critical selections change:

### Changes Made

#### 1. Updated MockExamCreationWizard Interface

Added two optional callback props:

```typescript
interface MockExamCreationWizardProps {
  // ... existing props
  onSchoolsChange?: (schoolIds: string[]) => void;
  onSubjectChange?: (subjectId: string) => void;
}
```

#### 2. Updated School Selection Handler

When schools are selected in the wizard, notify the parent:

```typescript
onChange={values => {
  setFormData(prev => ({
    ...prev,
    schools: values,
    branches: [],
    gradeBands: [],
    sections: [],
    teachers: []
  }));
  onSchoolsChange?.(values); // ✅ Notify parent
}}
```

#### 3. Updated Subject Selection Handler

When a subject is selected, notify the parent for teacher filtering:

```typescript
onChange={value => {
  // ... set form data
  onSubjectChange?.(ds.subject_id); // ✅ Notify parent
}}
```

#### 4. Updated Parent Component

The parent page now listens to these callbacks and updates its form state:

```typescript
<MockExamCreationWizard
  // ... other props
  onSchoolsChange={(schoolIds) => {
    setFormState(prev => ({
      ...prev,
      schools: schoolIds,
      branches: [],
      gradeBands: [],
      sections: []
    }));
  }}
  onSubjectChange={(subjectId) => {
    setFormState(prev => ({
      ...prev,
      subjectId
    }));
  }}
/>
```

## How It Works Now

1. User opens the Mock Exam Creation Wizard
2. User selects schools in Step 2 (Scope & Cohort)
3. The wizard's `onSchoolsChange` callback fires
4. Parent component updates its `formState.schools`
5. React Query hooks detect the change in dependencies
6. `useBranches(formState.schools)` triggers with the selected school IDs
7. `useGradeLevels(formState.schools)` triggers with the selected school IDs
8. Data is fetched and the dropdowns are populated
9. Fields become enabled and show the available options

## Benefits

- ✅ Branches and year groups load correctly when schools are selected
- ✅ No changes to database or RLS policies needed
- ✅ Maintains separation of concerns between wizard and parent
- ✅ Leverages existing React Query caching and refetching logic
- ✅ Teachers are filtered by subject when subject is selected

## Files Modified

1. `src/app/entity-module/mock-exams/components/MockExamCreationWizard.tsx`
   - Added callback props to interface
   - Updated school selection handler
   - Updated subject selection handler

2. `src/app/entity-module/mock-exams/page.tsx`
   - Added callback implementations to MockExamCreationWizard usage

## Testing

To verify the fix:

1. Navigate to Mock Exams page as Entity Admin
2. Click "Create Mock Exam"
3. Complete Step 1 (Basic Info)
4. Move to Step 2 (Scope & Cohort)
5. Select one or more schools
6. Verify that:
   - Branches dropdown loads and becomes enabled (if branches exist)
   - Year groups dropdown loads and becomes enabled
   - Both show appropriate options or helpful messages
7. Select year groups
8. Verify that class sections load correctly
9. Complete the wizard and save

## Future Enhancements

Consider these improvements for better UX:

1. Add loading skeleton states instead of "Loading..." text
2. Show progress indicators during data fetching
3. Add error states with retry buttons if queries fail
4. Prefetch branches/grades when hovering over schools
5. Cache recently selected combinations for faster subsequent loads

## Related Code

- React Query hooks: `src/hooks/useMockExams.ts`
- MockExam service: `src/services/mockExamService.ts`
- SearchableMultiSelect component: `src/components/shared/SearchableMultiSelect.tsx`
