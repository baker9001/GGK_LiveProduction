# Question Import Diagnostics - Quick Guide

## How to Use the Enhanced Diagnostics

### Step 1: Open Browser Console

Before importing, open your browser's developer console:
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+J` (Windows/Linux) / `Cmd+Option+J` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows/Linux) / `Cmd+Option+K` (Mac)
- **Safari**: Press `Cmd+Option+C`

### Step 2: Start the Import

1. Navigate to **System Admin → Learning → Practice Management → Papers Setup**
2. Click **Upload JSON** and select your Biology JSON file
3. Proceed through the wizard to the **Questions Review & Import** tab

### Step 3: Watch the Console

As questions process, you'll see detailed logs:

#### ✅ Successful Processing

```
========== STARTING QUESTIONS PROCESSING ==========
Total questions to process: 6

[Pre-Validation] All questions passed structural validation

[Question 1] Starting processing...
[Question 1] Processing 4 parts...
  [Part a] Processing 2 subparts...
  [Part a] Successfully processed 2 subparts
  [Part a] Part processing complete
[Question 1] Successfully processed 4 parts
[Question 1] Processing complete
```

#### ❌ If Problems Occur

```
[Question 3] ========== PROCESSING FAILED ==========
[Question 3] Error details: Error: Failed to process part 2: Part 2 is missing marks
[Question 3] Error stack: Error: Failed to process part 2...
[Question 3] Question data: { ... full JSON ... }
```

### Step 4: Interpret the Results

| Log Pattern | Meaning | Action |
|-------------|---------|--------|
| `[Pre-Validation] All questions passed` | Structure is valid | Continue import |
| `[Pre-Validation] Question X has structural issues` | Missing required fields | Check JSON structure |
| `[Question X] Processing complete` | Question imported successfully | No action needed |
| `Failed to process part Y` | Specific part has an issue | Check that part's data |
| `Answer Z has invalid structure` | Answer format is wrong | Validate answer format |

## Common Error Patterns

### Error: "Part X is missing marks"

**Cause**: A part object doesn't have a `marks` field

**Fix**: Add marks to the part:
```json
{
  "part": "a",
  "question_text": "...",
  "marks": 2,  // ← Add this
  "correct_answers": [...]
}
```

### Error: "Part X is invalid"

**Cause**: Part is not an object or is null/undefined

**Fix**: Ensure parts array contains valid objects:
```json
"parts": [
  {  // ← Must be an object
    "part": "a",
    "marks": 2,
    ...
  }
]
```

### Error: "Answer has no text content"

**Cause**: An answer object is missing the `answer` field

**Fix**: Ensure all answers have text:
```json
{
  "answer": "kill bacteria",  // ← Must have this
  "marks": 1,
  "alternative_id": 1
}
```

### Error: "Complex question must have parts array"

**Cause**: Question has `type: "complex"` but no `parts` array

**Fix**: Either add parts or change the type:
```json
{
  "type": "complex",
  "parts": [  // ← Add this array
    { "part": "a", ... }
  ]
}
```

## What the Diagnostics Tell You

### 1. Pre-Validation Phase

Checks overall structure before processing:
- ✅ Question objects are valid
- ✅ Parts arrays exist where needed
- ✅ Required fields are present
- ✅ Nested structures are properly formed

### 2. Processing Phase

Logs progress through each question:
- Question number being processed
- Number of parts/subparts found
- Success/failure of each component
- Specific errors with exact locations

### 3. Error Details

When failures occur:
- **Question number**: Which question failed
- **Location**: Exact part/subpart that caused error
- **Error message**: What went wrong
- **Full data**: Complete JSON of the failed question
- **Stack trace**: Technical details for debugging

## Quick Troubleshooting

### All Questions Failing?

Check:
1. Is the JSON file valid? (Use a JSON validator)
2. Is `questions` an array at the root level?
3. Are all question objects properly formatted?

### Specific Questions Failing?

Look for:
1. Missing `marks` fields in parts/subparts
2. Invalid `correct_answers` arrays
3. Malformed nested structures
4. Null or undefined values where objects are expected

### Parts/Subparts Failing?

Verify:
1. Each part has `marks`, `question_text`, and `correct_answers`
2. Subparts are in an array
3. Answer objects have `answer` text field
4. Alternative IDs are valid numbers

## Getting Help

If questions still fail after checking the above:

1. **Copy the error from console**: The full error block including question data
2. **Note the question number**: Which specific question is failing
3. **Check the JSON structure**: Compare against the examples in `JSON_IMPORT_STRUCTURE_GUIDE.md`
4. **Share console output**: The diagnostic information will help identify the issue

## Example: Reading the Logs

```
[Question 1] Starting processing...
[Question 1] Processing 4 parts...
  [Part a] Processing part 1...
  [Part a] Processing 2 subparts...
  [Part a] Processing 11 answers...      ← 11 answers found
  [Part a] Successfully processed 2 subparts
  [Part a] Part processing complete
  [Part b] Processing part 2...
  [Part b] Processing 1 answers...       ← 1 answer found
  [Part b] Part processing complete
```

This tells you:
- Question 1 has 4 parts (a, b, c, d)
- Part (a) has 2 subparts
- Part (a) has 11 correct answers (alternatives)
- Part (b) has 1 answer
- All processing succeeded

## Success Indicators

✅ **No error messages in console**
✅ **All questions show "Processing complete"**
✅ **Question cards appear in the review tab**
✅ **No toast error notifications**
✅ **"Confirm All" button is enabled**

---

**Remember**: The enhanced diagnostics are designed to give you exact information about what's wrong. Read the console output carefully - it will tell you exactly which field in which part of which question needs attention.
