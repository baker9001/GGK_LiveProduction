# Enhanced Question Selection Interface - Design Specification

## Overview

The Enhanced Question Selection Interface is a comprehensive UI/UX redesign that transforms the question selection experience with a two-panel layout, hierarchical question display, and advanced filtering capabilities.

## Core Features

### 1. Two-Panel Layout Architecture

The interface uses a responsive split-panel design:

- **Left Panel (55%)**: Question Bank with filtering and search
- **Right Panel (45%)**: Selected Questions with reordering tools
- Responsive breakpoints adapt the layout for mobile devices (stacks vertically)

### 2. Hierarchical Question Structure

Questions are displayed in a tree structure that mirrors exam paper organization:

#### Main Questions Display
- Shows question number, preview text, and total marks
- Visual badge indicating number of sub-questions
- Expand/collapse functionality with chevron icons
- Type indicators (MCQ, Descriptive, Multi-part)

#### Sub-Questions Display
- Indented display with connecting lines to parent question
- Part labels (e.g., "Part (a)", "Part (b)")
- Individual marks and difficulty levels for each part
- Expandable/collapsible sections

### 3. Advanced Filtering System

Multiple filter types work together to refine question discovery:

#### Available Filters
- **Topic Filter**: Multi-select dropdown with hierarchical topics
- **Subtopic Filter**: Automatically filtered based on selected topics
- **Year Filter**: Multi-select with reverse chronological ordering
- **Question Type**: MCQ, True/False, Descriptive, Multi-part
- **Difficulty Level**: Easy, Medium, Hard with color coding

#### Filter Features
- Active filter chips displayed below search bar
- Individual "X" button to clear each filter
- "Clear All Filters" quick action
- Real-time filtering with debounced search
- Filter count badges showing available questions

### 4. Search Functionality

Powerful search capabilities across multiple fields:

- Question text content
- Question numbers
- Topic names
- Real-time results as you type
- Highlighted search terms (future enhancement)

### 5. Selection Mechanisms

Multiple ways to add questions to accommodate different workflows:

#### Primary Selection Methods
- **Click to Add**: Plus icon button on each question card
- **Drag and Drop**: Drag questions from left panel to right panel
- **Bulk Selection**: Checkbox mode for multi-question operations
- **From Preview**: Add button within preview modal

#### Visual Feedback
- Drop zones highlight during drag operations
- Smooth animations for all transitions
- Optimistic UI updates
- Undo capability for accidental operations

### 6. Selected Questions Management

Comprehensive tools for organizing selected questions:

#### Reordering Tools
- **Drag Handle**: Grab and drag to reorder
- **Up/Down Arrows**: Fine-tuned position adjustments
- **Sequence Numbers**: Visual numbering updates automatically

#### Question Customization
- **Custom Marks**: Override default mark allocation
- **Optional Flag**: Mark questions as optional for differentiated pathways
- **Expand/Collapse**: Show/hide sub-questions in selection panel

#### Bulk Operations
- Select multiple questions for batch actions
- Remove selected questions
- Mark all as optional
- Adjust marks in bulk

### 7. Question Preview Modal

Full-featured preview system with complete question details:

#### Preview Features
- Full question text with proper formatting
- All sub-questions displayed hierarchically
- Attached images and diagrams
- Question metadata (topic, year, difficulty, type)
- Navigation controls (previous/next)
- "Add to Selection" quick action button
- Image zoom capability for diagrams

#### Preview Content Sections
- Main question description
- Sub-question parts with individual details
- Hints and explanations (when available)
- Attachments (images, PDFs, etc.)
- Metadata sidebar

### 8. Visual Design Elements

Consistent design language throughout the interface:

#### Color Coding
- **Green (#8CC63F)**: Primary actions, selected state
- **Amber**: Optional questions, warnings
- **Blue**: Informational badges, multi-part indicators
- **Red**: Removal actions, hard difficulty
- **Gray**: Neutral elements, disabled states

#### Typography Hierarchy
- Question numbers: Bold, green accent
- Main questions: Medium weight, readable size
- Sub-questions: Regular weight, slightly smaller
- Metadata: Small, muted color

#### Visual Indicators
- Difficulty badges with color coding
- Type badges for question classification
- Mark counters with consistent styling
- Expandable section indicators

### 9. Responsive Design

Mobile-optimized interface with touch-friendly interactions:

#### Desktop (≥1024px)
- Full two-panel side-by-side layout
- All filters visible in sidebar
- Hover states on interactive elements

#### Tablet (768px - 1023px)
- Two panels maintained
- Collapsible filter drawer
- Touch-optimized controls

#### Mobile (<768px)
- Vertical panel stacking
- Tab-based switching between Bank and Selected
- Floating action button for quick access
- Long-press for drag operations
- Minimum 44px touch targets

### 10. Accessibility Features

Full WCAG 2.1 AA compliance:

- **Keyboard Navigation**: Complete tab order and focus management
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Focus Indicators**: Visible focus states on all interactive elements
- **Color Contrast**: Meets minimum 4.5:1 ratio
- **Alternative Text**: All icons have text alternatives
- **Skip Links**: Navigate between major sections

## Technical Implementation

### Component Structure

```
EnhancedQuestionSelector/
├── EnhancedQuestionSelector.tsx (Main component)
├── EnhancedQuestionPreview.tsx (Preview modal)
└── Types and interfaces
```

### Key Technologies

- **React 18**: Component framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling and responsive design
- **Lucide React**: Icon library
- **React Query**: Data fetching and caching
- **Supabase**: Database integration

### Data Flow

1. Questions fetched from `questions` table
2. Sub-questions joined from `sub_questions` table
3. Attachments loaded from `questions_attachments`
4. Filtering applied client-side for performance
5. Selection state managed in parent component
6. Changes propagated via callback functions

### Performance Optimizations

- **Virtual Scrolling**: For large question lists (future enhancement)
- **Debounced Search**: Reduces API calls
- **Memoized Filters**: Prevents unnecessary recalculations
- **Lazy Loading**: Images loaded on demand
- **Optimistic Updates**: Instant UI feedback
- **React.memo**: Prevents unnecessary re-renders

## Database Schema

### Tables Used

```sql
-- Main questions
questions (
  id uuid PRIMARY KEY,
  question_number text,
  question_description text,
  marks integer,
  type text,
  difficulty text,
  topic_id uuid,
  paper_id uuid,
  status text
)

-- Sub-questions
sub_questions (
  id uuid PRIMARY KEY,
  question_id uuid REFERENCES questions(id),
  part_label text,
  question_description text,
  marks integer,
  difficulty text,
  type text
)

-- Attachments
questions_attachments (
  id uuid PRIMARY KEY,
  question_id uuid REFERENCES questions(id),
  file_url text,
  file_name text,
  file_type text
)

-- Topics for filtering
topics (
  id uuid PRIMARY KEY,
  name text,
  subject_id uuid
)
```

## Usage Examples

### Basic Implementation

```typescript
import { EnhancedQuestionSelector } from '@/components/shared/EnhancedQuestionSelector';

function ExamBuilder() {
  const [selected, setSelected] = useState<SelectedQuestion[]>([]);

  return (
    <EnhancedQuestionSelector
      availableQuestions={questions}
      selectedQuestions={selected}
      onQuestionsChange={setSelected}
      onPreviewQuestion={handlePreview}
      maxQuestions={50}
    />
  );
}
```

### With Preview Modal

```typescript
import { EnhancedQuestionPreview } from '@/components/shared/EnhancedQuestionPreview';

function ExamBuilder() {
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  return (
    <>
      <EnhancedQuestionSelector
        onPreviewQuestion={setPreviewQuestion}
        // ... other props
      />

      {previewQuestion && (
        <EnhancedQuestionPreview
          question={previewQuestion}
          isOpen={!!previewQuestion}
          onClose={() => setPreviewQuestion(null)}
          onAddQuestion={handleAdd}
        />
      )}
    </>
  );
}
```

## User Flows

### Flow 1: Basic Question Selection

1. User selects a paper from dropdown
2. Questions load in left panel
3. User browses available questions
4. User clicks "+" to add question
5. Question appears in right panel
6. User can reorder using drag-and-drop
7. User saves selection

### Flow 2: Filtered Selection with Preview

1. User applies topic filter
2. Questions filtered to specific topic
3. User searches for keywords
4. User clicks eye icon to preview
5. Preview modal opens with full details
6. User reviews all sub-questions
7. User clicks "Add to Selection" in preview
8. Question added and modal closes

### Flow 3: Multi-Part Question Selection

1. User sees question with badge showing "3 parts"
2. User clicks chevron to expand
3. Sub-questions displayed with part labels
4. User reviews individual part marks
5. User adds entire question
6. Question appears in selection panel
7. User can expand to see parts in selection
8. User adjusts marks for specific parts

## Future Enhancements

### Phase 2 Features
- Virtual scrolling for 1000+ questions
- Advanced search with regex support
- Saved filter presets
- Question tagging system
- Collaborative selection (multi-user)
- Version history and rollback

### Phase 3 Features
- AI-powered question recommendations
- Difficulty balancing suggestions
- Automatic mark scheme generation
- Export to various formats (PDF, Word)
- Integration with assessment platforms
- Analytics on question selection patterns

## Design Patterns

### State Management
- Local state for UI interactions
- Context for global selection state
- React Query for server state
- Optimistic updates for better UX

### Error Handling
- Graceful degradation on load failures
- User-friendly error messages
- Retry mechanisms for failed operations
- Loading states for all async operations

### Code Organization
- Single responsibility components
- Shared utility functions
- Type-safe interfaces
- Consistent naming conventions

## Accessibility Checklist

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus management
- ✅ Color contrast
- ✅ Alternative text
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Skip links
- ✅ Error announcements
- ✅ Loading indicators

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari 14+
- Chrome Android 90+

## Performance Metrics

Target performance benchmarks:

- **Initial Load**: < 2 seconds
- **Filter Apply**: < 100ms
- **Search Results**: < 200ms
- **Drag Operation**: 60 FPS
- **Add Question**: < 50ms
- **Preview Open**: < 300ms

## Testing Strategy

### Unit Tests
- Component rendering
- Filter logic
- Drag-and-drop functionality
- Selection state management

### Integration Tests
- Complete user flows
- Database interactions
- Error scenarios
- Edge cases

### E2E Tests
- Critical user paths
- Multi-device testing
- Accessibility testing
- Performance testing

## Conclusion

The Enhanced Question Selection Interface provides a modern, efficient, and accessible way to build exam papers. The hierarchical display accurately represents question structure, while comprehensive filtering and multiple selection methods accommodate different user preferences and workflows. The design prioritizes usability, performance, and maintainability for long-term success.
