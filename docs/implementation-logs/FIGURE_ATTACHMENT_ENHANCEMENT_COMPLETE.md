# Figure Attachment Enhancement - Implementation Complete

## Overview
Successfully implemented enhanced figure attachment management for questions, parts, and subparts in the paper setup review and import workflow. The snipping tool button now appears conditionally based on the `figure` or `figure_required` flag, and attachments are displayed inline beneath the related text content.

## Implementation Summary

### 1. Enhanced Callback Signature
**File**: `src/components/shared/QuestionImportReviewWorkflow.tsx`

Updated the `onRequestSnippingTool` callback to support contextual information:
```typescript
onRequestSnippingTool?: (
  questionId: string,
  context?: { partIndex?: number; subpartIndex?: number }
) => void;
```

This allows the parent component to identify which specific entity (question, part, or subpart) is requesting the snipping tool.

### 2. Inline Attachment Display Component
Created a reusable `renderInlineAttachments()` helper function that:
- Displays attachments inline beneath text content
- Shows image previews with hover zoom capability
- Supports both image and non-image file types
- Provides visual feedback with file names and metadata
- Uses consistent styling across all hierarchy levels

**Features**:
- Clean, compact card-based layout
- Image preview with zoom-on-click functionality
- Fallback display for non-image attachments
- Responsive grid layout for multiple attachments
- Dark mode support

### 3. Question-Level Implementation

**Location**: Question details section, below question text editor

**Features**:
- Existing figure requirement banner remains unchanged
- Snipping tool button shows when `question.figure === true` or `question.figure_required === true`
- Inline attachment display appears directly below the question text editor
- Visual badge indicates "Figure attached" vs "Figure required"

**UI Elements**:
- Green styling when figure is attached (completion state)
- Amber styling when figure is required but not yet attached (action needed state)
- "Launch snipping tool" button with ImageIcon

### 4. Part-Level Implementation

**Location**: Within each part card, before the part question text field

**New Elements**:
1. **Figure Requirement Banner** (conditionally shown when `part.figure === true`):
   - Compact inline notification
   - Color-coded status (green for attached, amber for required)
   - Snipping tool launch button
   - Passes `partIndex` to callback: `onRequestSnippingTool(questionId, { partIndex })`

2. **Inline Attachment Display**:
   - Positioned immediately below part question text editor
   - Shows all attachments associated with the part
   - Context label: "Part a", "Part b", etc.

**Visual Hierarchy**:
- Slightly smaller than question-level to maintain visual distinction
- Nested within part card container
- Clear association with part content

### 5. Subpart-Level Implementation

**Location**: Within each subpart card (nested inside part), before subpart question text field

**New Elements**:
1. **Figure Requirement Banner** (conditionally shown when `subpart.figure === true`):
   - Most compact size to fit nested hierarchy
   - Same color-coding system as parts
   - Snipping tool launch button
   - Passes both context: `onRequestSnippingTool(questionId, { partIndex, subpartIndex })`

2. **Inline Attachment Display**:
   - Positioned immediately below subpart question text editor
   - Context label: "Subpart I", "Subpart II", etc.
   - Maintains consistent styling with slight size reduction

**Visual Hierarchy**:
- Smallest scale to indicate deepest nesting level
- Proper indentation and containment
- Clear parent-child relationship

## Key Features Implemented

### Conditional Display Logic
- Snipping tool button only appears when `figure === true` or `figure_required === true`
- Reduces UI clutter by showing buttons only where needed
- Visual indicators clearly distinguish between "required" and "attached" states

### Inline Attachment Display
- Attachments display directly below their associated text content
- Consistent with MCQ question attachment pattern
- Image previews with zoom capability
- File metadata display (name, type)
- Responsive layout adapts to screen size

### Context-Aware Callbacks
- Parent component receives full context about which entity needs the snipping tool
- Supports routing snipped images to the correct destination
- Enables proper state management at all hierarchy levels

### Visual Consistency
- Color-coded states:
  - **Green**: Figure attached (success state)
  - **Amber**: Figure required (action needed state)
- Consistent icon usage (ImageIcon, Scissors)
- Proper visual hierarchy through sizing and spacing
- Dark mode support throughout

## Technical Details

### Icons Added
- `Scissors`: For snipping tool buttons
- `ZoomIn`: For image preview functionality
- `FileText`: For non-image attachment fallback

### Styling Approach
- TailwindCSS utility classes
- Responsive breakpoints (sm, md)
- Dark mode variants for all elements
- Hover states and transitions
- Consistent border radii and spacing

### Data Flow
1. Question/Part/Subpart data includes `figure` or `figure_required` boolean
2. Component checks flag and renders banner if `true`
3. User clicks "Launch snipping tool" button
4. Callback fires with question ID and context (part/subpart indices)
5. Parent component opens snipping tool modal with proper context
6. Snipped image is saved to appropriate attachment array
7. Inline display shows the newly attached figure

## Usage Example

### Question with Figure
```typescript
{
  id: "q1",
  question_text: "Explain photosynthesis...",
  figure: true,  // or figure_required: true
  attachments: [
    {
      id: "att1",
      url: "...",
      file_name: "diagram.png",
      file_type: "image/png"
    }
  ]
}
```

### Part with Figure
```typescript
{
  parts: [
    {
      part_label: "a",
      question_text: "Label the diagram...",
      figure: true,
      attachments: [...]
    }
  ]
}
```

### Subpart with Figure
```typescript
{
  parts: [
    {
      subparts: [
        {
          part_label: "i",
          question_text: "Identify structure X...",
          figure: true,
          attachments: [...]
        }
      ]
    }
  ]
}
```

## Benefits

1. **Improved UX**: Clear visual indication of where figures are needed
2. **Contextual Actions**: Snipping tool appears only where relevant
3. **Inline Display**: Better association between content and figures
4. **Consistent Pattern**: Same approach across all hierarchy levels
5. **Reduced Clutter**: Conditional display prevents UI bloat
6. **Better Review Flow**: Reviewers can see figures in context during QA

## Testing Checklist

- [x] Question-level figure attachment displays correctly
- [x] Part-level figure banner and attachments work
- [x] Subpart-level figure banner and attachments work
- [x] Snipping tool button only shows when `figure: true`
- [x] Inline attachments display below respective text editors
- [x] Color coding correctly indicates attached vs required states
- [x] Context parameters passed correctly to callback
- [x] Image preview zoom functionality works
- [x] Dark mode styling applied correctly
- [x] Responsive layout works on different screen sizes
- [x] Build completes successfully

## Files Modified

1. `src/components/shared/QuestionImportReviewWorkflow.tsx`
   - Updated props interface for enhanced callback
   - Added icon imports (Scissors, ZoomIn, FileText)
   - Created `renderInlineAttachments()` helper function
   - Added figure banner and attachment display for questions
   - Added figure banner and attachment display for parts
   - Added figure banner and attachment display for subparts

## Next Steps for Integration

The parent component using `QuestionImportReviewWorkflow` should:

1. Update its `onRequestSnippingTool` handler to accept the new context parameter
2. Use the context to identify which entity is requesting the tool
3. Open the snipping tool modal with appropriate context label
4. Route the snipped image to the correct attachment array based on context
5. Update the question data structure to reflect the new attachment

## Example Parent Component Update

```typescript
const handleRequestSnippingTool = (
  questionId: string,
  context?: { partIndex?: number; subpartIndex?: number }
) => {
  // Identify target entity
  let targetLabel = `Question ${questionNumber}`;
  if (context?.subpartIndex !== undefined) {
    targetLabel = `Subpart ${subpartLabel}`;
  } else if (context?.partIndex !== undefined) {
    targetLabel = `Part ${partLabel}`;
  }

  // Open snipping tool with context
  setSnippingContext({ questionId, ...context, label: targetLabel });
  setShowSnippingTool(true);
};

const handleSnipComplete = (dataUrl: string, fileName: string) => {
  const { questionId, partIndex, subpartIndex } = snippingContext;

  // Create attachment object
  const newAttachment = {
    id: generateId(),
    dataUrl,
    file_name: fileName,
    file_type: 'image/png'
  };

  // Route to correct location
  if (subpartIndex !== undefined && partIndex !== undefined) {
    // Add to subpart.attachments
  } else if (partIndex !== undefined) {
    // Add to part.attachments
  } else {
    // Add to question.attachments
  }
};
```

## Conclusion

The implementation successfully enhances the paper setup workflow by making figure attachment management more intuitive and contextual. The snipping tool button appears only where needed, and attachments display inline for better visual association with their content. The solution maintains the existing architectural patterns while extending support to the full question hierarchy, ensuring consistency across all question types.
