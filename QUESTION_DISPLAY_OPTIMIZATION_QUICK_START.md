# Question Display System Optimization - Quick Start Guide

## Overview

The Question Display System has been enhanced with intelligent answer expectation detection, context-aware configurations, and improved navigation. This guide shows you how to use the new features.

---

## 1. Migrating Existing JSON Files

### Migrate a Single File

```typescript
import { migrateJSONFile, generateMigrationReportText } from '@/lib/extraction/jsonMigrationUtility';

// Load your JSON file
const originalPaper = require('./my-paper.json');

// Migrate it
const { migratedPaper, report } = migrateJSONFile(originalPaper, 'my-paper.json');

// Check the report
console.log(generateMigrationReportText(report));

// Save the migrated paper
if (report.success) {
  // migratedPaper now has is_container and has_direct_answer flags
  fs.writeFileSync('./my-paper-enhanced.json', JSON.stringify(migratedPaper, null, 2));
}
```

### Migrate Multiple Files

```typescript
import { migrateBatchJSON, generateBatchMigrationSummary } from '@/lib/extraction/jsonMigrationUtility';

const files = [
  { name: 'paper1.json', data: require('./paper1.json') },
  { name: 'paper2.json', data: require('./paper2.json') },
  { name: 'paper3.json', data: require('./paper3.json') }
];

const { results, summary } = migrateBatchJSON(files);

console.log(generateBatchMigrationSummary(summary));

// Save each migrated file
results.forEach(result => {
  if (result.report.success) {
    fs.writeFileSync(
      `./enhanced/${result.fileName}`,
      JSON.stringify(result.migratedData, null, 2)
    );
  }
});
```

---

## 2. Using the Enhanced Question Display

### Basic Usage

```typescript
import EnhancedComplexQuestionDisplay from '@/components/shared/EnhancedComplexQuestionDisplay';

function MyComponent() {
  const [answer, setAnswer] = useState<ComplexQuestionAnswer>();

  return (
    <EnhancedComplexQuestionDisplay
      question={questionData}      // Your enhanced question data
      value={answer}               // Current user answer
      onChange={setAnswer}         // Answer change handler
      context="practice"           // Display context
      disabled={false}             // Enable/disable input
    />
  );
}
```

### Different Contexts

```typescript
// Practice Mode: Interactive with hints, no answers shown
<EnhancedComplexQuestionDisplay
  question={questionData}
  context="practice"
/>

// Exam Mode: Timed, strict, no hints
<EnhancedComplexQuestionDisplay
  question={questionData}
  context="exam"
/>

// Review Mode: Full feedback with answers and explanations
<EnhancedComplexQuestionDisplay
  question={questionData}
  context="review"
/>

// QA Preview Mode: Administrative view with metadata
<EnhancedComplexQuestionDisplay
  question={questionData}
  context="qa_preview"
/>

// Simulation Mode: Mimics real exam environment
<EnhancedComplexQuestionDisplay
  question={questionData}
  context="simulation"
/>
```

---

## 3. Adding Question Navigation

### Build Navigation Items

```typescript
import QuestionNavigator, { buildNavigationItems } from '@/components/shared/QuestionNavigator';

function MyExamPage() {
  const [currentQuestionId, setCurrentQuestionId] = useState<string>();

  // Build navigation from your questions
  const navigationItems = buildNavigationItems(questions);

  return (
    <div className="flex gap-4">
      {/* Navigator sidebar */}
      <div className="w-64">
        <QuestionNavigator
          items={navigationItems}
          currentId={currentQuestionId}
          onNavigate={setCurrentQuestionId}
          showParts={true}
          showSubparts={true}
          showMarks={true}
          showStatus={true}
          mode="practice"
        />
      </div>

      {/* Question display */}
      <div className="flex-1">
        <EnhancedComplexQuestionDisplay
          question={getCurrentQuestion(currentQuestionId)}
          context="practice"
        />
      </div>
    </div>
  );
}
```

---

## 4. Customizing Display Configuration

### Create Custom Config

```typescript
import { createDisplayConfig, customizeDisplayConfig } from '@/lib/display/DisplayConfigFactory';

// Start with base config
const baseConfig = createDisplayConfig('practice');

// Customize it
const myCustomConfig = customizeDisplayConfig(baseConfig, {
  element: {
    compactMode: true,          // More compact display
    showDifficulty: false,      // Hide difficulty badges
  },
  hierarchy: {
    autoExpandToFirstAnswer: true,   // Auto-expand to first question needing answer
    containerCollapsedByDefault: true // Start containers collapsed
  }
});
```

### Responsive Config

```typescript
import { getResponsiveDisplayConfig } from '@/lib/display/DisplayConfigFactory';

function MyResponsiveComponent() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Get config optimized for screen size
  const config = getResponsiveDisplayConfig('practice', screenSize);

  // Use config as needed
  const shouldShowNav = config.hierarchy.showQuestionNavigator;
}
```

---

## 5. Enhancing Questions Programmatically

### Enhance a Single Question

```typescript
import { enhanceQuestion } from '@/lib/extraction/questionSchemaEnhancer';

const originalQuestion = {
  question_number: "1",
  question_text: "Fig 1.1 shows ammonia production.",
  marks: 12,
  parts: [
    {
      part_label: "a",
      question_text: "Name the process.",
      marks: 1,
      correct_answers: [{ answer: "Haber process" }]
    }
  ]
};

// Enhance it
const enhanced = enhanceQuestion(originalQuestion, 0);

// Now has:
// enhanced.is_container = true (has parts, no direct answer)
// enhanced.has_direct_answer = false
// enhanced.parts[0].is_container = false
// enhanced.parts[0].has_direct_answer = true
```

### Validate Enhanced Questions

```typescript
import { validateEnhancedQuestion } from '@/lib/extraction/questionSchemaEnhancer';

const validation = validateEnhancedQuestion(enhancedQuestion);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

---

## 6. Understanding the New Flags

### is_container Flag

**Purpose**: Indicates if element only provides context for child elements

```typescript
// Container question (no direct answer, has parts)
{
  question_number: "1",
  question_text: "The diagram shows...",
  is_container: true,
  has_direct_answer: false,
  parts: [...]  // Answers in parts
}

// Answerable question (has direct answer)
{
  question_number: "2",
  question_text: "What is the capital of France?",
  is_container: false,
  has_direct_answer: true,
  correct_answers: [{ answer: "Paris" }]
}
```

### has_direct_answer Flag

**Purpose**: Indicates if a direct answer is expected at this level

```typescript
// Main question is contextual only
{
  question_number: "3",
  has_direct_answer: false,  // No answer at this level
  parts: [
    {
      part_label: "a",
      has_direct_answer: true,  // Answer expected here
      subparts: []
    }
  ]
}
```

---

## 7. Best Practices

### ✅ DO

1. **Always migrate JSON files** before using in production
2. **Validate enhanced questions** to catch inconsistencies
3. **Use appropriate context** for display (practice/exam/review)
4. **Show navigation** for multi-part questions
5. **Test with different screen sizes** (mobile/tablet/desktop)

### ❌ DON'T

1. **Don't manually set flags** - use enhancer functions
2. **Don't mix old and new displays** - migrate fully
3. **Don't ignore validation warnings** - they indicate potential issues
4. **Don't forget responsive config** for mobile users
5. **Don't override flags** without understanding impact

---

## 8. Common Use Cases

### Use Case 1: Practice Session

```typescript
function PracticeSession({ questions }) {
  const [answers, setAnswers] = useState({});
  const [currentId, setCurrentId] = useState(questions[0]?.id);

  return (
    <div className="flex gap-4">
      <QuestionNavigator
        items={buildNavigationItems(questions)}
        currentId={currentId}
        onNavigate={setCurrentId}
        showParts={true}
        mode="practice"
      />

      <EnhancedComplexQuestionDisplay
        question={questions.find(q => q.id === currentId)}
        value={answers[currentId]}
        onChange={(ans) => setAnswers({ ...answers, [currentId]: ans })}
        context="practice"
      />
    </div>
  );
}
```

### Use Case 2: Exam Simulation

```typescript
function ExamSimulation({ questions, duration }) {
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(duration);

  return (
    <div className="exam-container">
      <ExamTimer time={timeRemaining} />

      <EnhancedComplexQuestionDisplay
        question={currentQuestion}
        value={answers[currentQuestion.id]}
        onChange={handleAnswer}
        context="exam"  // No hints, strict mode
      />
    </div>
  );
}
```

### Use Case 3: Results Review

```typescript
function ResultsReview({ questions, userAnswers, correctAnswers }) {
  return (
    <>
      {questions.map(question => (
        <EnhancedComplexQuestionDisplay
          key={question.id}
          question={question}
          value={userAnswers[question.id]}
          context="review"  // Shows correct answers and explanations
          disabled={true}   // No editing in review mode
        />
      ))}
    </>
  );
}
```

---

## 9. Troubleshooting

### Issue: Answer input not showing

**Check**:
1. Is `has_direct_answer` set correctly?
2. Is the display context appropriate?
3. Is the element a container?

```typescript
import { shouldShowAnswerInput } from '@/lib/display/DisplayConfigFactory';

const config = createDisplayConfig('practice');
const shouldShow = shouldShowAnswerInput(element, config);

if (!shouldShow) {
  console.log('Answer input hidden because:');
  console.log('- is_container:', element.is_container);
  console.log('- has_direct_answer:', element.has_direct_answer);
}
```

### Issue: Navigation not showing parts

**Check**:
1. Is `showParts` set to true?
2. Are parts properly nested?
3. Is question enhanced with correct structure?

```typescript
<QuestionNavigator
  items={buildNavigationItems(questions)}
  showParts={true}      // ← Make sure this is true
  showSubparts={true}   // ← And this for subparts
/>
```

### Issue: Migration validation errors

**Solution**: Review validation report

```typescript
const { report } = migrateJSONFile(paper, 'paper.json');

if (!report.success) {
  // Check specific errors
  report.errors.forEach(error => {
    console.log(`Q${error.questionNumber}: ${error.error}`);
  });
}

// Check warnings too
report.warnings.forEach(warning => {
  console.log(`Q${warning.questionNumber}: ${warning.warning}`);
});
```

---

## 10. Migration Checklist

- [ ] Backup original JSON files
- [ ] Run migration utility on all JSON files
- [ ] Review migration reports for errors/warnings
- [ ] Test migrated JSON files in UI
- [ ] Update components to use `EnhancedComplexQuestionDisplay`
- [ ] Add `QuestionNavigator` where appropriate
- [ ] Test all display contexts (practice/exam/review/qa_preview)
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Verify answer inputs show/hide correctly
- [ ] Confirm marks rollup is correct
- [ ] Deploy to production

---

## Need Help?

- **Schema Documentation**: See `/src/lib/extraction/questionSchemaEnhancer.ts`
- **Display Configs**: See `/src/lib/display/DisplayConfigFactory.ts`
- **Migration Tools**: See `/src/lib/extraction/jsonMigrationUtility.ts`
- **Full Implementation Guide**: See `PHASE_1_2_IMPLEMENTATION_COMPLETE.md`
