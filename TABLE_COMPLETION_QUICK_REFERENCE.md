# Table Completion - Quick Reference Guide

**Last Updated**: 2025-11-29

---

## 🎯 Quick Status

| Feature | Backend | UI | Auto-Marking | Status |
|---------|---------|-----|--------------|---------|
| Per-cell marks | ✅ | ⏳ | ⏳ | Backend Ready |
| Case sensitivity | ✅ | ⏳ | ⏳ | Backend Ready |
| Equivalent phrasing | ✅ | ⏳ | ⏳ | Backend Ready |
| Alternative answers | ✅ | ⏳ | ⏳ | Backend Ready |
| Table title | ✅ | ⏳ | N/A | Backend Ready |
| Table description | ✅ | ⏳ | N/A | Backend Ready |

---

## 📦 State Variables

### Cell Configuration
```typescript
cellMarks: Record<string, number>              // Default: 1
cellCaseSensitive: Record<string, boolean>     // Default: false
cellEquivalentPhrasing: Record<string, boolean> // Default: false
cellAlternatives: Record<string, string[]>     // Default: []
```

### Table Metadata
```typescript
tableTitle: string                              // Default: ''
tableDescription: string                        // Default: ''
```

### Key Format
```typescript
const key = `${row}-${col}`;  // e.g., "0-1" for row 0, column 1
```

---

## 💾 Database Storage

### JSONB (question_correct_answers.answer_text)
```json
{
  "rows": 5,
  "columns": 3,
  "headers": ["Col1", "Col2", "Col3"],
  "title": "Optional title",
  "description": "Optional description",
  "cells": [
    {
      "rowIndex": 0,
      "colIndex": 1,
      "cellType": "editable",
      "expectedAnswer": "Answer",
      "marks": 2,
      "caseSensitive": false,
      "acceptsEquivalentPhrasing": true,
      "alternativeAnswers": ["Alt1", "Alt2"]
    }
  ]
}
```

### Normalized (table_template_cells)
```sql
row_index: 0
col_index: 1
cell_type: 'editable'
expected_answer: 'Answer'
marks: 2
case_sensitive: false
accepts_equivalent_phrasing: true
alternative_answers: ['Alt1', 'Alt2']
```

---

## 🔄 Data Flow

### Save Flow
```
1. User configures cell
   ↓
2. State updated (setCellMarks, setCellCaseSensitive, etc.)
   ↓
3. handleSaveTemplate() called
   ↓
4. Build cells array with config:
   marks: cellMarks[key] ?? 1
   caseSensitive: cellCaseSensitive[key] ?? false
   etc.
   ↓
5. Save to database
```

### Load Flow
```
1. loadExistingTemplate() called
   ↓
2. Fetch from database
   ↓
3. Parse cells array:
   marks[key] = cell.marks ?? 1
   caseSensitive[key] = cell.caseSensitive ?? false
   etc.
   ↓
4. Set state (setCellMarks, setCellCaseSensitive, etc.)
```

---

## 🛠️ Code Snippets

### Get Cell Configuration
```typescript
const key = `${row}-${col}`;
const marks = cellMarks[key] ?? 1;
const isCaseSensitive = cellCaseSensitive[key] ?? false;
const acceptsEquiv = cellEquivalentPhrasing[key] ?? false;
const alternatives = cellAlternatives[key] ?? [];
```

### Update Cell Configuration
```typescript
// Update marks
const newMarks = {...cellMarks};
newMarks[key] = 2;
setCellMarks(newMarks);

// Update case sensitivity
const newCS = {...cellCaseSensitive};
newCS[key] = true;
setCellCaseSensitive(newCS);
```

### Add Alternative Answer
```typescript
const newAlts = {...cellAlternatives};
newAlts[key] = [...(newAlts[key] || []), 'New alternative'];
setCellAlternatives(newAlts);
```

### Remove Alternative Answer
```typescript
const newAlts = {...cellAlternatives};
newAlts[key] = newAlts[key].filter((_, i) => i !== indexToRemove);
setCellAlternatives(newAlts);
```

---

## 📝 Usage Examples

### Example 1: Simple Configuration
```typescript
// Cell (0,1): Worth 2 marks, case-sensitive
cellMarks["0-1"] = 2;
cellCaseSensitive["0-1"] = true;
```

### Example 2: With Alternatives
```typescript
// Cell (1,2): Worth 1 mark, accepts alternatives
cellMarks["1-2"] = 1;
cellAlternatives["1-2"] = ["USA", "United States", "America"];
```

### Example 3: Equivalent Phrasing
```typescript
// Cell (2,0): Worth 3 marks, accepts equivalent phrasing
cellMarks["2-0"] = 3;
cellEquivalentPhrasing["2-0"] = true;
```

### Example 4: Complex Configuration
```typescript
// Cell (0,0): Worth 5 marks, case-sensitive, with alternatives
cellMarks["0-0"] = 5;
cellCaseSensitive["0-0"] = true;
cellEquivalentPhrasing["0-0"] = false;
cellAlternatives["0-0"] = ["H2O", "Water"];
```

---

## 🧪 Testing Queries

### Check Template in Database
```sql
-- JSONB approach
SELECT
  qma.question_number,
  (qca.answer_text::jsonb)->'cells'->0->>'marks' as marks,
  (qca.answer_text::jsonb)->'cells'->0->>'caseSensitive' as case_sensitive,
  (qca.answer_text::jsonb)->'cells'->0->'alternativeAnswers' as alternatives
FROM question_correct_answers qca
JOIN questions_master_admin qma ON qma.id = qca.question_id
WHERE qca.answer_type = 'table_template'
LIMIT 1;
```

### Check Normalized Tables
```sql
SELECT
  row_index,
  col_index,
  marks,
  case_sensitive,
  accepts_equivalent_phrasing,
  alternative_answers
FROM table_template_cells
WHERE template_id = '<template-id>'
ORDER BY row_index, col_index;
```

---

## 🚨 Common Pitfalls

### Pitfall 1: Forgetting Default Values
```typescript
// ❌ BAD: Will cause errors if key doesn't exist
const marks = cellMarks[key];

// ✅ GOOD: Always provide default
const marks = cellMarks[key] ?? 1;
```

### Pitfall 2: Mutating State Directly
```typescript
// ❌ BAD: Mutates state directly
cellMarks[key] = 2;
setCellMarks(cellMarks);

// ✅ GOOD: Create new object
const newMarks = {...cellMarks};
newMarks[key] = 2;
setCellMarks(newMarks);
```

### Pitfall 3: Wrong Key Format
```typescript
// ❌ BAD: Wrong format
const key = `${row}_${col}`;  // Using underscore

// ✅ GOOD: Correct format
const key = `${row}-${col}`;  // Using dash
```

---

## 🎯 Next Steps for Implementation

### UI Components Needed

1. **CellConfigPanel.tsx**
   - Marks input (1-10)
   - Case sensitivity checkbox
   - Equivalent phrasing checkbox
   - Alternative answers list

2. **TableMetadataPanel.tsx**
   - Title input
   - Description textarea

3. **CellBadges.tsx**
   - Visual indicators for configuration

### Integration Points

1. **Right-click menu**: Add "Configure Cell" option
2. **Toolbar button**: Add "Cell Settings" button
3. **Table header**: Add "Table Settings" button

---

## 📚 Related Files

### Core Component
- `src/components/answer-formats/TableInput/TableCompletion.tsx`

### Service Layer
- `src/services/TableTemplateService.ts`
- `src/services/TableGradingService.ts` (needs update)

### Type Definitions
- `TableTemplateDTO` interface
- `TableCellDTO` interface

### Documentation
- `TABLE_COMPLETION_DATA_COVERAGE_AUDIT.md`
- `TABLE_COMPLETION_MARKING_CONFIG_IMPLEMENTATION.md`
- `TABLE_COMPLETION_PHASE_1_COMPLETE_SUMMARY.md`

---

## ⚡ Quick Commands

### Check State in Browser Console
```javascript
// In React DevTools or component inspector
// Look for TableCompletion component state:
cellMarks           // Object with marks per cell
cellCaseSensitive   // Object with case sensitivity per cell
cellEquivalentPhrasing  // Object with equiv. phrasing per cell
cellAlternatives    // Object with alternatives per cell
```

### Database Verification
```sql
-- Count templates with custom marks
SELECT COUNT(*)
FROM question_correct_answers
WHERE answer_type = 'table_template'
AND (answer_text::jsonb)->'cells'->0->>'marks' != '1';
```

---

## 🎉 Summary

**Backend**: ✅ Complete
**Database**: ✅ Ready
**State Management**: ✅ Implemented
**Save/Load**: ✅ Working
**UI**: ⏳ Pending
**Auto-Marking**: ⏳ Needs update

**Next**: Build UI components to expose these features to users!
