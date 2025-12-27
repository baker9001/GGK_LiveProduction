# Attachment Deletion Feature - Integration Guide

## Overview

The attachment deletion feature allows users to permanently remove attachments from questions during editing/creation workflows. This guide explains how to integrate this feature into your components.

## Components Involved

1. **AttachmentService** (`src/services/attachmentService.ts`) - Handles database and storage deletion
2. **EnhancedQuestionPreview** - Updated to support attachment deletion in edit mode
3. **EnhancedQuestionDisplay** - Already supports attachment deletion via `onAttachmentRemove` prop

## Key Features

- ✅ Permanent deletion from both database and storage
- ✅ Confirmation dialog before deletion
- ✅ Loading states during deletion
- ✅ Only available in edit mode (not in view-only mode)
- ✅ Visual feedback with trash icon on hover
- ✅ Optimistic UI updates (attachment removed from view immediately)

## Usage in EnhancedQuestionPreview

### Basic Integration

```typescript
import { EnhancedQuestionPreview } from '@/components/shared/EnhancedQuestionPreview';
import { deleteQuestionAttachment } from '@/services/attachmentService';
import { toast } from '@/components/shared/Toast';
import { useQueryClient } from '@tanstack/react-query';

function YourComponent() {
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAttachmentRemove = async (attachmentId: string) => {
    const result = await deleteQuestionAttachment(attachmentId);

    if (result.success) {
      toast.success('Attachment deleted successfully');

      // Update the question state to remove the attachment
      if (previewQuestion) {
        setPreviewQuestion({
          ...previewQuestion,
          attachments: previewQuestion.attachments?.filter(
            att => att.id !== attachmentId
          )
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['questions']);
    } else {
      toast.error(result.error || 'Failed to delete attachment');
    }
  };

  return (
    <EnhancedQuestionPreview
      question={previewQuestion}
      isOpen={isPreviewOpen}
      onClose={() => setIsPreviewOpen(false)}
      isEditMode={true}  // Enable attachment deletion
      onAttachmentRemove={handleAttachmentRemove}
    />
  );
}
```

### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isEditMode` | `boolean` | `false` | Enables attachment deletion UI |
| `onAttachmentRemove` | `(attachmentId: string) => Promise<void>` | `undefined` | Callback when user confirms deletion |

## Usage in EnhancedQuestionDisplay

The `EnhancedQuestionDisplay` component already supports attachment deletion through the `onAttachmentRemove` prop:

```typescript
import { EnhancedQuestionDisplay } from '@/components/shared/EnhancedQuestionDisplay';
import { deleteQuestionAttachment } from '@/services/attachmentService';

function QuestionEditor() {
  const [question, setQuestion] = useState<QuestionDisplayData>(/* ... */);

  const handleAttachmentRemove = async (attachmentKey: string, attachmentId: string) => {
    const result = await deleteQuestionAttachment(attachmentId);

    if (result.success) {
      toast.success('Attachment removed');

      // Update question state
      setQuestion(prevQuestion => ({
        ...prevQuestion,
        attachments: prevQuestion.attachments?.filter(att => att.id !== attachmentId)
      }));
    } else {
      toast.error(result.error || 'Failed to remove attachment');
    }
  };

  return (
    <EnhancedQuestionDisplay
      question={question}
      showAttachments={true}
      onAttachmentRemove={handleAttachmentRemove}
    />
  );
}
```

## Attachment Service API

### `deleteQuestionAttachment(attachmentId: string)`

Deletes an attachment from both database and storage.

**Returns:** `Promise<AttachmentDeletionResult>`

```typescript
interface AttachmentDeletionResult {
  success: boolean;
  error?: string;
  deletedAttachmentId?: string;
}
```

**Example:**
```typescript
const result = await deleteQuestionAttachment('uuid-here');
if (result.success) {
  console.log('Deleted:', result.deletedAttachmentId);
} else {
  console.error('Error:', result.error);
}
```

### `batchDeleteQuestionAttachments(attachmentIds: string[])`

Deletes multiple attachments at once.

**Returns:** `Promise<{ successCount, failureCount, errors }>`

**Example:**
```typescript
const result = await batchDeleteQuestionAttachments([
  'uuid-1',
  'uuid-2',
  'uuid-3'
]);

console.log(`Deleted ${result.successCount} attachments`);
if (result.failureCount > 0) {
  console.error('Failed deletions:', result.errors);
}
```

### `canDeleteAttachment(attachmentId: string)`

Checks if user has permission to delete an attachment.

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const canDelete = await canDeleteAttachment('uuid-here');
if (canDelete) {
  // Proceed with deletion
}
```

## UI Behavior

### In Edit Mode (`isEditMode={true}`)

1. **Hover State**: Trash icon appears on hover over attachment
2. **Click Trash**: Confirmation dialog appears
3. **Confirm Delete**:
   - Loading state shown on button
   - Database record deleted
   - Storage file removed
   - Attachment removed from UI
   - Success toast shown
4. **Cancel**: Dialog closes, no changes made

### In View Mode (`isEditMode={false}` or not provided)

- No trash icon displayed
- Attachments are read-only
- Only zoom/preview functionality available

## Database Schema

The `questions_attachments` table structure:

```sql
CREATE TABLE questions_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id),
  sub_question_id uuid REFERENCES sub_questions(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid,
  uploaded_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

Storage bucket: `questions-attachments`

## Error Handling

The service handles various error scenarios:

1. **Attachment not found**: Returns error message
2. **Storage deletion fails**: Logs error but continues with database deletion
3. **Database deletion fails**: Returns error, storage file may remain
4. **Network errors**: Caught and returned as error message
5. **Permission errors**: Handled by RLS policies

## Best Practices

1. **Always Confirm**: Use the built-in confirmation dialog - don't bypass it
2. **Update UI Optimistically**: Remove from local state after successful deletion
3. **Invalidate Queries**: Refresh data from server after deletion
4. **Handle Errors Gracefully**: Show user-friendly error messages
5. **Check Edit Mode**: Only enable deletion in appropriate contexts
6. **Audit Trail**: Consider logging deletion events for audit purposes

## Security Considerations

- RLS policies control who can delete attachments
- Only users with edit permissions on the question can delete attachments
- Storage deletion requires proper authentication
- Deletion is permanent and cannot be undone

## Example: Full Implementation in Question Import Workflow

```typescript
import React, { useState } from 'react';
import { QuestionImportReviewWorkflow } from '@/components/shared/QuestionImportReviewWorkflow';
import { deleteQuestionAttachment } from '@/services/attachmentService';
import { toast } from '@/components/shared/Toast';

export default function PapersSetupQuestionsTab() {
  const [questions, setQuestions] = useState<QuestionDisplayData[]>([]);

  const handleAttachmentDelete = async (
    attachmentKey: string,
    attachmentId: string
  ) => {
    const result = await deleteQuestionAttachment(attachmentId);

    if (!result.success) {
      toast.error(result.error || 'Failed to delete attachment');
      throw new Error(result.error);
    }

    // Update questions state
    setQuestions(prevQuestions =>
      prevQuestions.map(question => ({
        ...question,
        attachments: question.attachments?.filter(
          att => att.id !== attachmentId
        ),
        parts: question.parts?.map(part => ({
          ...part,
          attachments: part.attachments?.filter(
            att => att.id !== attachmentId
          )
        }))
      }))
    );

    toast.success('Attachment deleted successfully');
  };

  return (
    <QuestionImportReviewWorkflow
      questions={questions}
      paperTitle="Sample Paper"
      totalMarks={100}
      onRequestAttachmentDelete={handleAttachmentDelete}
      // ... other props
    />
  );
}
```

## Troubleshooting

### Attachment not being removed from UI

- Ensure you're updating the local state after successful deletion
- Check that the attachment ID matches exactly
- Verify the component is re-rendering after state update

### Storage file not deleted

- Check browser console for storage errors
- Verify the file_url format is correct
- Ensure user has storage access permissions

### Permission denied errors

- Check RLS policies on `questions_attachments` table
- Verify user is authenticated
- Confirm user has edit permissions on the question

## Related Components

- `EnhancedQuestionPreview.tsx` - Preview modal with deletion support
- `EnhancedQuestionDisplay.tsx` - Question display with deletion support
- `QuestionImportReviewWorkflow.tsx` - Full workflow with deletion support
- `attachmentService.ts` - Core deletion service

## Future Enhancements

Potential improvements to consider:

- Soft delete with recovery option
- Bulk deletion UI
- Attachment replacement (delete + upload new)
- Deletion history/audit log
- Undo deletion functionality
