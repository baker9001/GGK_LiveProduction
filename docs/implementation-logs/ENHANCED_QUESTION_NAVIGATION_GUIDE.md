# Enhanced Question Navigation System

## Overview

The Enhanced Question Navigation System provides a comprehensive, color-coded interface for navigating and managing questions, parts, and subparts during the question import and review workflow. It includes visual status indicators, attachment tracking, progress monitoring, and persistent state management.

## Features

### 1. Hierarchical Navigation
- **Three-Level Structure**: Navigate through Questions → Parts → Subparts
- **Collapsible Sections**: Expand/collapse questions to manage screen space
- **Smart Navigation**: Click any item to jump directly to it
- **Breadcrumb Trail**: Visual indication of current position

### 2. Color-Coded Status Indicators

The navigation uses color coding to instantly show question status:

| Color | Icon | Meaning |
|-------|------|---------|
| 🟢 Green | CheckCircle | Complete - all fields filled, answers provided, attachments uploaded |
| 🟠 Amber/Orange | Paperclip | Needs Attachment - figure required but not yet uploaded |
| 🔵 Blue | Clock | In Progress - some fields filled but not complete |
| 🔴 Red | AlertCircle | Has Errors - validation issues or missing required data |
| ⚪ Gray | Circle | Not Started - no data entered yet |

### 3. Visual Components

#### Status Badges
- **Question Numbers**: Color-coded background (Purple for questions, Blue for parts, Cyan for subparts)
- **Marks Display**: Shows mark allocation for each item
- **Attachment Counter**: Visual badge showing "uploaded/required" count (e.g., "2/3")
- **Answer Format Tag**: Quick reference to expected answer type

#### Progress Overview Panel
- **Completion Progress Bar**: Visual representation of questions completed vs total
- **Attachment Progress Bar**: Tracks figure uploads vs requirements
- **Summary Statistics**:
  - Questions complete count
  - Items needing attachments
  - Items with errors
  - Items in progress
  - Total marks

### 4. Navigation Controls

#### Quick Navigation Buttons
- **Previous/Next**: Sequential navigation through all items
- **Jump to Next Incomplete**: Skip to the next question needing work
- **Jump to Next Error**: Navigate directly to questions with validation issues

#### Filter System
Toggle visibility of different question types:
- ✓ Show Completed Questions
- ✓ Show Incomplete Questions
- ✓ Show Questions Needing Attachments
- ✓ Show Questions with Errors

#### Search Functionality
- Type to filter questions by number or label
- Real-time filtering as you type

### 5. Keyboard Shortcuts (Planned Enhancement)
- `→` Arrow Right: Next question
- `←` Arrow Left: Previous question
- `Space`: Toggle expand/collapse current section
- `Numbers 1-9`: Jump to question by number
- `Ctrl/Cmd + F`: Focus search box

## Database Schema

### Tables Created

#### `question_navigation_state`
Stores user navigation preferences and position:
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- paper_id: uuid (references papers_setup)
- current_position_id: uuid (current question/part/subpart)
- current_position_type: text ('question', 'part', 'subpart')
- expanded_items: jsonb (array of expanded item IDs)
- filter_settings: jsonb (filter preferences)
- last_accessed_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

#### `question_review_progress`
Tracks completion and validation status:
```sql
- id: uuid (primary key)
- paper_id: uuid (references papers_setup)
- question_id: uuid (references questions_master_admin)
- sub_question_id: uuid (references sub_questions)
- is_complete: boolean
- needs_attachment: boolean
- has_error: boolean
- in_progress: boolean
- validation_issues: jsonb (array of issue descriptions)
- reviewed_by: uuid (references auth.users)
- reviewed_at: timestamptz
- completed_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

#### `question_attachment_tracking`
Monitors attachment requirements and uploads:
```sql
- id: uuid (primary key)
- paper_id: uuid (references papers_setup)
- question_id: uuid (references questions_master_admin)
- sub_question_id: uuid (references sub_questions)
- attachments_required: integer
- attachments_uploaded: integer
- figure_required: boolean
- last_upload_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

## Usage

### Basic Integration

```tsx
import EnhancedQuestionNavigator, {
  buildEnhancedNavigationItems
} from '@/components/shared/EnhancedQuestionNavigator';
import { useQuestionNavigation } from '@/hooks/useQuestionNavigation';

function PapersSetupPage() {
  const [questions, setQuestions] = useState([]);
  const paperId = 'your-paper-id';

  const {
    currentId,
    statusData,
    attachmentData,
    handleNavigate,
    handleFilterChange,
    updateQuestionStatus,
    isLoading,
  } = useQuestionNavigation({
    paperId,
    questions,
    autoSave: true,
    autoSync: true,
  });

  const navigationItems = buildEnhancedNavigationItems(
    questions,
    attachmentData,
    statusData
  );

  return (
    <div className="flex gap-4">
      {/* Navigation Sidebar */}
      <div className="w-80 sticky top-4 h-screen overflow-hidden">
        <EnhancedQuestionNavigator
          items={navigationItems}
          currentId={currentId}
          onNavigate={handleNavigate}
          onFilterChange={handleFilterChange}
          mode="setup"
          showParts={true}
          showSubparts={true}
          showMarks={true}
          showStatus={true}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Your question editing interface */}
      </div>
    </div>
  );
}
```

### Updating Question Status

```tsx
// Mark question as complete
await updateQuestionStatus(questionId, 'question', {
  isComplete: true,
  hasError: false,
  validationIssues: [],
});

// Flag question needing attachment
await updateQuestionStatus(questionId, 'question', {
  needsAttachment: true,
  inProgress: true,
});

// Report validation error
await updateQuestionStatus(questionId, 'question', {
  hasError: true,
  validationIssues: ['Missing correct answer', 'Invalid marks allocation'],
});
```

### Attachment Tracking

```tsx
import QuestionNavigationService from '@/services/questionNavigationService';

// Initialize attachment tracking for a paper
await QuestionNavigationService.initializeAttachmentTracking(
  paperId,
  questions
);

// Update attachment requirement
await updateAttachmentStatus(
  questionId,
  'question',
  1, // required count
  true // figure required
);

// Get current attachment status
const attachmentMap = await QuestionNavigationService.getAttachmentTracking(paperId);
```

### Auto-Sync Progress

The hook automatically syncs progress when questions are loaded or updated:

```tsx
const { syncProgress, refreshData } = useQuestionNavigation({
  paperId,
  questions,
  autoSync: true, // Enable automatic synchronization
});

// Manually trigger sync if needed
await syncProgress();

// Refresh data from database
await refreshData();
```

## Component Props

### EnhancedQuestionNavigator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | NavigationItem[] | required | Hierarchical navigation items |
| currentId | string | undefined | Currently selected item ID |
| onNavigate | (id: string) => void | required | Navigation callback |
| showParts | boolean | true | Show part-level items |
| showSubparts | boolean | true | Show subpart-level items |
| showMarks | boolean | true | Display mark allocations |
| showStatus | boolean | true | Show status indicators |
| mode | string | 'setup' | Display mode (practice, exam, review, qa_preview, simulation, setup) |
| compact | boolean | false | Compact display mode |
| onFilterChange | (filter: NavigationFilter) => void | undefined | Filter change callback |

## Best Practices

### 1. Status Updates
- Update status immediately after any question modification
- Use specific validation messages for `validationIssues` array
- Mark questions complete only when all required fields are filled

### 2. Attachment Management
- Initialize attachment tracking when paper is first loaded
- Update tracking whenever attachments are added or removed
- Use the automatic trigger for real-time tracking

### 3. Performance
- Enable `autoSync` for real-time updates
- Use `compact` mode for mobile or small screens
- Debounce navigation state saves (handled automatically)

### 4. User Experience
- Keep the navigator visible in a sticky sidebar
- Show the legend initially for new users
- Pre-expand all items by default for better visibility

## Advanced Features

### Custom Status Calculation

```tsx
import QuestionNavigationService from '@/services/questionNavigationService';

// Calculate custom status logic
const customStatus = await QuestionNavigationService.calculateQuestionStatus({
  ...question,
  // Add custom validation rules
});

await updateQuestionStatus(question.id, 'question', customStatus);
```

### Bulk Operations

```tsx
// Mark all questions in a paper as reviewed
for (const question of questions) {
  await updateQuestionStatus(question.id, 'question', {
    isComplete: true,
    inProgress: false,
  });
}

// Sync after bulk update
await syncProgress();
```

### Export Progress Report

```tsx
const statusData = await QuestionNavigationService.getReviewProgress(paperId);
const attachmentData = await QuestionNavigationService.getAttachmentTracking(paperId);

const report = {
  totalQuestions: questions.length,
  completed: Array.from(statusData.values()).filter(s => s.isComplete).length,
  needingAttachments: Array.from(statusData.values()).filter(s => s.needsAttachment).length,
  withErrors: Array.from(statusData.values()).filter(s => s.hasError).length,
  attachmentsSummary: {
    required: Array.from(attachmentData.values()).reduce((sum, a) => sum + a.required, 0),
    uploaded: Array.from(attachmentData.values()).reduce((sum, a) => sum + a.uploaded, 0),
  },
};

console.log('Progress Report:', report);
```

## Troubleshooting

### Navigation State Not Saving
- Ensure `autoSave` is enabled in hook options
- Check user authentication status
- Verify RLS policies allow user to write to `question_navigation_state`

### Status Colors Not Updating
- Call `refreshData()` after making changes
- Ensure `autoSync` is enabled
- Check browser console for errors

### Attachment Counts Incorrect
- Run `initializeAttachmentTracking()` to reset counts
- Verify trigger is active on `question_attachments` table
- Check attachment records have correct `question_id` or `sub_question_id`

## Future Enhancements

1. **Keyboard Navigation**: Full keyboard support for accessibility
2. **Drag and Drop**: Reorder questions via drag and drop
3. **Bulk Actions**: Select multiple questions for batch operations
4. **Custom Filters**: Save and load custom filter presets
5. **Export Reports**: Generate PDF/Excel progress reports
6. **Collaborative Features**: See what other users are working on
7. **Mobile Optimization**: Touch-friendly drawer navigation for mobile devices
8. **Analytics Dashboard**: Visual charts and graphs showing progress over time

## Support

For issues or questions about the navigation system:
1. Check this documentation
2. Review the TypeScript types in component files
3. Examine the database schema in migration files
4. Check console for error messages
5. Verify RLS policies allow required operations

## Credits

Developed as part of the GGK Admin System to enhance the question import and review workflow with visual feedback, intelligent tracking, and persistent state management.
