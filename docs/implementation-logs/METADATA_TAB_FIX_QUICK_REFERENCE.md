# Metadata Tab Error Fix - Quick Reference

## Problem
"Missing Entity IDs from Previous Step" error appears when navigating from Structure tab to Metadata tab.

## Root Cause
React state not refreshed after database update. StructureTab saves entity_ids to database correctly, but page.tsx doesn't refresh the importSession state before navigating to MetadataTab.

## Solution Applied
Updated `handleStructureComplete()` in `page.tsx` to refresh import session from database before navigation.

## File Modified
- **src/app/system-admin/learning/practice-management/papers-setup/page.tsx** (lines 1692-1732)

## Key Changes

### BEFORE
```typescript
const handleStructureComplete = async () => {
  setStructureComplete(true);
  setTabStatuses(prev => ({
    ...prev,
    structure: 'completed',
    metadata: 'active',
  }));
  handleTabChange('metadata', { message: 'Configuring paper metadata workspace...' });
};
```

### AFTER
```typescript
const handleStructureComplete = async () => {
  try {
    // Refresh import session from database to get updated entity_ids
    if (importSession?.id) {
      const { data: refreshedSession, error: refreshError } = await supabase
        .from('question_import_sessions')
        .select('*')
        .eq('id', importSession.id)
        .single();

      if (refreshError) {
        console.error('[handleStructureComplete] Error refreshing import session:', refreshError);
        toast.error('Failed to refresh import session data');
        setStructureCompleteCalled(false);
        return;
      }

      if (refreshedSession) {
        console.log('[handleStructureComplete] Refreshed import session with entity_ids:', refreshedSession.metadata?.entity_ids);
        setImportSession(refreshedSession);
      }
    }

    setStructureComplete(true);
    setTabStatuses(prev => ({
      ...prev,
      structure: 'completed',
      metadata: 'active',
    }));

    handleTabChange('metadata', { message: 'Configuring paper metadata workspace...' });
  } catch (error) {
    console.error('[handleStructureComplete] Unexpected error:', error);
    toast.error('An error occurred while completing structure configuration');
    setStructureCompleteCalled(false);
  }
};
```

## What Changed
1. Added database query to fetch latest import session
2. Added state update: `setImportSession(refreshedSession)`
3. Added error handling with user feedback
4. Added console logging for debugging
5. Reset `structureCompleteCalled` flag on error

## Testing Steps
1. Navigate to Papers Setup page
2. Upload a valid JSON file
3. Complete Structure tab by selecting all entities
4. Click "Next" button
5. Verify Metadata tab opens without error
6. Check browser console for log: `[handleStructureComplete] Refreshed import session with entity_ids:`

## Expected Behavior
- No "Missing Entity IDs from Previous Step" error
- Academic structure fields pre-populated correctly
- Smooth transition from Structure to Metadata tab
- Clear error messages if database refresh fails

## Impact
- **Before**: Users blocked from proceeding to Metadata tab
- **After**: Seamless workflow from Structure to Metadata tab
- **Risk**: Minimal - only adds a safe database query
- **Breaking Changes**: None

## Related Documentation
See `METADATA_TAB_ERROR_DIAGNOSIS_AND_FIX.md` for comprehensive analysis.
