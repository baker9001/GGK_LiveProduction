# Table Completion Identifier Fix - Quick Test Guide

## 🚀 Quick Test (5 Minutes)

### 1. Import & Configure
```
1. Import a paper with table completion questions
2. Go to Question 1, Part a, Subpart iii
3. Configure table (custom headers, locked cells, editable cells)
4. Save
```

### 2. Check Console
```javascript
// Should see:
[generateSubpartIdentifier] {...result: "q_1-part-a-sub-iii"}
[TableCompletion] Saving template...
```

### 3. Test Persistence
```
1. Navigate to a different question
2. Navigate back to same question
3. ✅ Configuration should load
```

### 4. Test Simulation
```
1. Enter simulation mode for the question
2. ✅ Table should display with:
   - Your custom headers
   - Pre-filled locked cells
   - Empty editable cells
   - Correct statistics
```

---

## 🔍 Console Log Checklist

**✅ Success Indicators:**
```
[generateSubpartIdentifier] {result: "q_1-part-a-sub-iii"}
[TableTemplateImportReviewService] Template saved
[TableCompletion] Template loaded successfully
```

**❌ Problem Indicators:**
```
"Question Not in Database"
"Template not found"
Mismatched identifiers between save and load
```

---

## 📊 Database Quick Check

```sql
-- Check saved templates
SELECT question_identifier, headers, rows, columns
FROM table_templates_import_review
WHERE import_session_id = 'YOUR_SESSION_ID';

-- Should see identifiers like:
-- q_1-part-a-sub-i
-- q_1-part-a-sub-iii
-- q_2-part-b-sub-i
```

---

## 🎯 What Fixed

**Before:** `question.id` → unstable, changes between sessions
**After:** `generateSubpartIdentifier(1, "a", "iii")` → stable `"q_1-part-a-sub-iii"`

**Result:** Edit and simulation modes use same identifier = data loads correctly

---

## 🐛 If Something's Wrong

1. **Check console for identifier generation**
2. **Verify identifiers match between save and load**
3. **Check question has `question_number` field**
4. **Check database for matching `question_identifier`**

---

## 📁 Files Changed

- `src/lib/questionIdentifiers.ts` ← NEW utility module
- `src/components/shared/QuestionImportReviewWorkflow.tsx` ← Uses new identifiers

---

## ✅ Expected Behavior

| Action | Result |
|--------|--------|
| Configure table | Saves with stable identifier |
| Navigate away/back | Configuration loads |
| Enter simulation | Table displays correctly |
| Re-import same paper | Same identifiers generated |

---

## 🔧 Quick Debug

```javascript
// In console, check identifier generation:
// For main question:
generateQuestionIdentifier(1) // "q_1"

// For part:
generatePartIdentifier(1, "a") // "q_1-part-a"

// For subpart:
generateSubpartIdentifier(1, "a", "iii") // "q_1-part-a-sub-iii"
```
