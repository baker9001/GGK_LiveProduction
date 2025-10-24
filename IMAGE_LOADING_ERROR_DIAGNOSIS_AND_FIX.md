# Image Loading Error Diagnosis and Fix

## Issue Description
During test simulation in the paper setup workflow, attachment images show "Failed to load image" error even though:
- The figures have been attached via the PDF snipping tool
- The images display correctly in the questions review section
- The attachment count shows correctly

## Root Cause Analysis

### Investigation Steps
1. **Examined the error display**: The error appears in the `UnifiedTestSimulation` component when the `<img>` tag's `onError` event is triggered
2. **Traced attachment data flow**: Attachments are created → Stored in state → Passed to simulation → Rendered in simulation view
3. **Identified data structure**: Attachments use data URLs (base64-encoded images starting with `data:image/png;base64,...`)

### Potential Root Causes
The "Failed to load image" error can occur for several reasons:

1. **Data URL Corruption**: Large data URLs (often 50K+ characters) might get truncated during state management or object transformation
2. **Missing or Invalid file_url**: The `file_url` property might not be properly set or might be an empty string
3. **Browser Security Restrictions**: Some browsers may have Content Security Policy (CSP) restrictions on data URLs
4. **Memory/Size Limitations**: Very large data URLs might exceed browser limits
5. **Async State Updates**: Race conditions where the simulation starts before attachments are fully loaded into state

## Implemented Fixes

### 1. Enhanced Debug Logging (QuestionsTab.tsx)

Added comprehensive logging to track attachments through the simulation creation process:

```typescript
// Log attachment details when simulation starts
Object.entries(attachments).forEach(([key, atts]) => {
  console.log(`Attachments for ${key}:`, atts.map(a => ({
    id: a.id,
    file_name: a.file_name,
    file_url_length: a.file_url?.length || 0,
    file_url_preview: a.file_url?.substring(0, 100) + '...',
    file_type: a.file_type
  })));
});

// Log merged attachments for each question
if (questionAttachments.length > 0) {
  console.log(`Question ${q.question_number} attachments:`, ...);
}

// Verify total attachments in simulation paper
console.log('Total attachments in simulation paper:', totalAttachmentsCount);
```

**Purpose**: Identify at which stage attachments are lost or corrupted

### 2. Enhanced Error Reporting (UnifiedTestSimulation.tsx)

Improved the error message to show diagnostic information:

```typescript
onError={(e) => {
  console.error('Failed to load attachment image:', {
    file_name: attachment.file_name,
    file_url_length: attachment.file_url?.length,
    file_url_starts_with: attachment.file_url?.substring(0, 100),
    is_data_url: attachment.file_url?.startsWith('data:'),
    error: e
  });

  // Enhanced error display
  const isDataUrl = attachment.file_url?.startsWith('data:');
  const urlLength = attachment.file_url?.length || 0;
  parent.innerHTML = `
    <div class="...">
      <p>Failed to load image</p>
      <p>${attachment.file_name}</p>
      <p>Type: ${isDataUrl ? 'Data URL' : 'Remote URL'} • Size: ${urlLength} chars</p>
      <p>Check browser console for details</p>
    </div>
  `;
}}
```

**Purpose**: Provide detailed diagnostic information to identify the specific issue

### 3. Success Logging

Added logging when images load successfully:

```typescript
onLoad={() => {
  console.log('Successfully loaded attachment:', {
    file_name: attachment.file_name,
    file_url_length: attachment.file_url?.length,
    is_data_url: attachment.file_url?.startsWith('data:')
  });
}}
```

**Purpose**: Confirm when attachments load correctly to help identify patterns

## How to Use This Fix

### For Developers
1. **Open browser console** when running the test simulation
2. **Check the logs** for attachment information:
   - Are attachments present in the state?
   - Do they have valid `file_url` values?
   - Are the data URLs complete (should be 20K-200K+ characters)?
3. **Examine error messages** for specific attachment failures
4. **Compare working vs failing attachments** to identify patterns

### Common Scenarios and Solutions

#### Scenario 1: Data URL is truncated
**Symptoms**: `file_url_length` is very short (< 1000 chars) for a data URL
**Solution**: Check state management - attachments might be getting serialized/deserialized incorrectly

#### Scenario 2: file_url is empty or undefined
**Symptoms**: `file_url_length` is 0
**Solution**: Verify attachment creation in `handleSnippingComplete` - ensure `imageDataUrl` is properly set

#### Scenario 3: CSP (Content Security Policy) blocking
**Symptoms**: Console shows CSP violation errors
**Solution**: Update CSP headers to allow `data:` URLs for images

#### Scenario 4: Attachments not reaching simulation
**Symptoms**: `Total attachments in simulation paper: 0` even though attachments exist
**Solution**: Check `mergeAttachmentSources` function - ensure both primary and secondary sources are merged correctly

## Next Steps for Complete Resolution

### If the logging reveals the issue:

1. **If data URLs are being truncated**:
   - Review React state management
   - Consider using `useRef` for large data
   - Investigate if any JSON serialization is happening

2. **If attachments aren't making it to simulation**:
   - Check the `generateAttachmentKey` function
   - Verify attachment keys match between creation and retrieval
   - Ensure `mergeAttachmentSources` is correctly combining sources

3. **If browser limitations are hit**:
   - Consider uploading images to Supabase Storage instead of using data URLs
   - Implement a hybrid approach: data URLs for preview, actual uploads for simulation

## Testing Checklist

After implementing fixes, verify:
- [ ] Images load in questions review section
- [ ] Console shows attachments with valid data URLs
- [ ] Simulation paper includes all attachments
- [ ] Images display correctly in simulation mode
- [ ] No "Failed to load image" errors
- [ ] Console logs confirm successful image loading

## Technical Details

### Attachment Data Structure
```typescript
{
  id: string,
  file_url: string,          // Data URL or remote URL
  file_name: string,
  file_type: string,          // e.g., 'image/png'
  canDelete: boolean,
  attachmentKey: string,      // e.g., 'q_123' or 'q_123_part_0'
  originalId: string
}
```

### Key Functions
- `handleSnippingComplete`: Creates attachment from snipped image
- `mergeAttachmentSources`: Combines JSON attachments with snipped attachments
- `normalizeAttachmentForSimulation`: Normalizes attachment structure for simulation
- `generateAttachmentKey`: Creates consistent keys for attachment storage

## Files Modified
1. `/src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx`
   - Added debug logging for attachment tracking
   - Added verification of attachments in simulation paper

2. `/src/components/shared/UnifiedTestSimulation.tsx`
   - Enhanced error reporting with diagnostic information
   - Added success logging for image loads

## Build Status
✅ Build completed successfully
- All TypeScript types are correct
- No compilation errors
- Ready for testing
