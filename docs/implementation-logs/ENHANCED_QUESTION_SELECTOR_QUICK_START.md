# Enhanced Question Selector - Quick Start Guide

## Overview

The Enhanced Question Selector is a production-ready UI component that provides a modern, hierarchical question selection interface with advanced filtering, drag-and-drop functionality, and comprehensive preview capabilities.

## Files Created

### Core Components

1. **EnhancedQuestionSelector.tsx** (`src/components/shared/`)
   - Main two-panel question selection interface
   - Hierarchical question display with expand/collapse
   - Advanced filtering (topic, year, type, difficulty, subtopic)
   - Drag-and-drop reordering
   - Alternative selection controls
   - Real-time search functionality

2. **EnhancedQuestionPreview.tsx** (`src/components/shared/`)
   - Full question preview modal
   - Sub-questions display with part labels
   - Image attachments with zoom capability
   - Question metadata display
   - Navigation between questions
   - Quick add to selection

3. **Example Implementation** (`src/app/system-admin/learning/practice-management/enhanced-question-selection/page.tsx`)
   - Complete working example
   - Database integration with Supabase
   - Save and export functionality
   - Paper selection interface

## Key Features

### 1. Two-Panel Layout
- **Left Panel**: Question Bank with filtering
- **Right Panel**: Selected Questions with reordering

### 2. Hierarchical Question Display
- Main questions with sub-question count badges
- Expandable/collapsible sub-questions
- Visual tree structure with connecting lines
- Part labels (Part a, Part b, etc.)

### 3. Advanced Filtering
- Multi-select filters for:
  - Topics
  - Years
  - Question Types
  - Difficulty Levels
  - Subtopics
- Real-time search across question content
- Active filter chips with individual clear buttons
- "Clear All Filters" quick action

### 4. Multiple Selection Methods
- Click-to-add with plus icon
- Drag-and-drop from left to right panel
- Bulk selection mode (future enhancement)
- Add from preview modal

### 5. Reordering Tools
- Drag handle for drag-and-drop reordering
- Up/Down arrow buttons for precise positioning
- Automatic sequence number updates
- Visual feedback during drag operations

### 6. Question Customization
- Custom marks override
- Optional question toggle
- Expand/collapse in selection panel
- Visual indicators for optional questions

### 7. Question Preview
- Full question details with formatting
- All sub-questions displayed
- Image attachments with zoom
- Question metadata
- Add to selection from preview

## Quick Integration

### Basic Usage

```typescript
import { EnhancedQuestionSelector } from '@/components/shared/EnhancedQuestionSelector';
import { EnhancedQuestionPreview } from '@/components/shared/EnhancedQuestionPreview';

function YourComponent() {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  return (
    <>
      <EnhancedQuestionSelector
        availableQuestions={questions}
        selectedQuestions={selectedQuestions}
        onQuestionsChange={setSelectedQuestions}
        onPreviewQuestion={setPreviewQuestion}
        isLoading={loading}
        maxQuestions={50}
      />

      {previewQuestion && (
        <EnhancedQuestionPreview
          question={previewQuestion}
          isOpen={!!previewQuestion}
          onClose={() => setPreviewQuestion(null)}
          onAddQuestion={(q) => {
            setSelectedQuestions([...selectedQuestions, { ...q, sequence: selectedQuestions.length + 1 }]);
          }}
        />
      )}
    </>
  );
}
```

### Data Structure

```typescript
// Question interface
interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type?: 'mcq' | 'tf' | 'descriptive' | 'multi_part';
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  topic_id?: string;
  subtopic?: string;
  year?: string;
  parts?: SubQuestion[];
  attachments?: QuestionAttachment[];
}

// Sub-question interface
interface SubQuestion {
  id: string;
  part_label: string;
  question_description: string;
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'mcq' | 'tf' | 'descriptive';
  attachments?: QuestionAttachment[];
}

// Selected question extends Question with selection metadata
interface SelectedQuestion extends Question {
  sequence: number;
  customMarks?: number;
  isOptional?: boolean;
}
```

### Database Query Example

```typescript
const { data: questions } = await supabase
  .from('questions')
  .select(`
    id,
    question_number,
    question_description,
    marks,
    type,
    difficulty,
    topic_id,
    topics(name),
    year,
    parts:sub_questions(
      id,
      part_label,
      question_description,
      marks,
      difficulty,
      type
    ),
    attachments:questions_attachments(
      id,
      file_url,
      file_name,
      file_type
    )
  `)
  .eq('paper_id', paperId)
  .eq('status', 'active');
```

## Component Props

### EnhancedQuestionSelector Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| availableQuestions | Question[] | Yes | Array of questions to display in bank |
| selectedQuestions | SelectedQuestion[] | Yes | Array of currently selected questions |
| onQuestionsChange | (questions: SelectedQuestion[]) => void | Yes | Callback when selection changes |
| onPreviewQuestion | (question: Question) => void | No | Callback when preview is requested |
| isLoading | boolean | No | Show loading state |
| maxQuestions | number | No | Maximum questions allowed |
| showCustomQuestionBuilder | boolean | No | Show custom question button |
| onCreateCustomQuestion | () => void | No | Callback for custom question creation |
| className | string | No | Additional CSS classes |

### EnhancedQuestionPreview Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| question | Question | Yes | Question to preview |
| isOpen | boolean | Yes | Modal open state |
| onClose | () => void | Yes | Close callback |
| onAddQuestion | (question: Question) => void | No | Add to selection callback |
| onNavigate | (direction: 'prev' \| 'next') => void | No | Navigate between questions |
| canNavigatePrev | boolean | No | Enable previous button |
| canNavigateNext | boolean | No | Enable next button |
| isAdded | boolean | No | Show added state |

## Styling & Theming

The component uses Tailwind CSS with support for dark mode:

```typescript
// Primary color (green accent)
className="text-[#8CC63F]"

// Dark mode support
className="dark:bg-gray-900 dark:text-white"

// Responsive breakpoints
className="lg:grid-cols-2 md:grid-cols-1"
```

## Responsive Behavior

- **Desktop (≥1024px)**: Full two-panel layout with all features
- **Tablet (768px-1023px)**: Two panels with collapsible filters
- **Mobile (<768px)**: Vertical stacking with tab-based navigation

## Accessibility

- Full keyboard navigation
- ARIA labels on all interactive elements
- Screen reader support
- Focus management
- Minimum 44px touch targets on mobile

## Performance Considerations

- Memoized filter calculations
- Debounced search (300ms)
- Optimistic UI updates
- Lazy loading of images
- Virtual scrolling ready (future enhancement)

## Example Use Cases

### 1. Mock Exam Builder
```typescript
<EnhancedQuestionSelector
  availableQuestions={bankQuestions}
  selectedQuestions={examQuestions}
  onQuestionsChange={setExamQuestions}
  maxQuestions={30}
/>
```

### 2. Practice Test Creator
```typescript
<EnhancedQuestionSelector
  availableQuestions={practiceQuestions}
  selectedQuestions={testQuestions}
  onQuestionsChange={setTestQuestions}
  showCustomQuestionBuilder={true}
  onCreateCustomQuestion={openCustomBuilder}
/>
```

### 3. Homework Assignment Builder
```typescript
<EnhancedQuestionSelector
  availableQuestions={homeworkBank}
  selectedQuestions={assignmentQuestions}
  onQuestionsChange={setAssignmentQuestions}
  onPreviewQuestion={handlePreview}
/>
```

## Testing

To test the implementation:

1. Navigate to: `/system-admin/learning/practice-management/enhanced-question-selection`
2. Select a paper from the dropdown
3. Try filtering by topic, year, or difficulty
4. Add questions using the + button
5. Drag and drop to reorder in the right panel
6. Click eye icon to preview a question
7. Expand multi-part questions to see sub-questions
8. Adjust marks and toggle optional flags
9. Save or export your selection

## Troubleshooting

### Questions not loading
- Verify paper_id is provided
- Check database query permissions (RLS policies)
- Ensure questions have status = 'active'

### Drag-and-drop not working
- Check browser compatibility (modern browsers only)
- Ensure proper event handlers are not blocked
- Verify draggable attribute is set

### Filters not working
- Check data structure matches expected format
- Verify filter fields exist on questions
- Check for null/undefined values

### Preview not opening
- Ensure onPreviewQuestion prop is provided
- Check modal z-index conflicts
- Verify question data includes all required fields

## Next Steps

1. Review the comprehensive design documentation: `ENHANCED_QUESTION_SELECTOR_DESIGN.md`
2. Integrate the component into your application
3. Customize styling to match your brand
4. Add custom validation logic as needed
5. Implement save/export functionality
6. Add analytics tracking (optional)

## Support & Documentation

- Full design specification: `ENHANCED_QUESTION_SELECTOR_DESIGN.md`
- Component source: `src/components/shared/EnhancedQuestionSelector.tsx`
- Preview modal: `src/components/shared/EnhancedQuestionPreview.tsx`
- Example implementation: `src/app/system-admin/learning/practice-management/enhanced-question-selection/page.tsx`

## Build Status

✅ Project builds successfully
✅ All components properly typed
✅ No TypeScript errors
✅ Production-ready code
