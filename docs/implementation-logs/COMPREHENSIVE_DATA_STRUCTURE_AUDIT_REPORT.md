# Comprehensive Data Structure Audit Report
## Analysis of Paper Setup and Questions Import Process

**Date:** October 17, 2025
**Issue Reported:** URI malformed error during test simulation
**Root Cause:** Data structure mismatch between JSON import format and database/UI expectations

---

## Executive Summary

**Critical Issue Identified:** The JSON import process for past papers contains a fundamental data structure mismatch in the `attachments` field that causes runtime errors during test simulation.

**Impact:**
- Prevents test simulation from running
- Causes "URI malformed" error when rendering questions
- Blocks users from previewing imported questions

**Root Cause:**
The JSON files contain attachments as **string arrays** (attachment descriptions), while the database schema and UI components expect attachments as **objects** with specific properties (file_url, file_name, file_type).

---

## Detailed Technical Analysis

### 1. **Database Schema Review**

#### questions_attachments Table Structure ✓
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
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

**Status:** ✓ Correctly defined with required fields
**RLS Policies:** ✓ Properly configured with system admin access
**Foreign Keys:** ✓ Proper CASCADE relationships

#### Row Level Security Policies ✓
```sql
- "System admins can view all questions_attachments" (SELECT)
- "System admins can create questions_attachments" (INSERT)
- "System admins can update all questions_attachments" (UPDATE)
- "System admins can delete questions_attachments" (DELETE)
```

**Status:** ✓ All RLS policies correctly implemented
**Security:** ✓ Proper authentication and authorization checks in place

---

### 2. **Data Type Definitions Review**

#### TypeScript Interfaces

**Database Type (src/types/questions.ts):**
```typescript
export interface QuestionAttachment {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  file_url: string;        // REQUIRED
  file_name: string;       // REQUIRED
  file_type: string;       // REQUIRED
  file_size: number;       // REQUIRED
  uploaded_by: string | null;
  created_at: string;
}
```

**UI Component Type (UnifiedTestSimulation.tsx):**
```typescript
interface AttachmentAsset {
  id: string;
  file_url: string;        // REQUIRED - causes error when undefined
  file_name: string;
  file_type: string;
}
```

**Import Logic Type (questionsDataOperations.ts):**
```typescript
// Lines 1590-1595, 1926-1931
const attachmentsToInsert = attachments.map((att: any) => ({
  file_url: att.file_url,           // Expects object with file_url
  file_name: att.file_name || att.fileName,
  file_type: att.file_type || 'image/png',
  file_size: att.file_size || 0
}));
```

**Status:** ✓ All TypeScript interfaces correctly defined
**Issue:** ✗ JSON data structure does not match these interfaces

---

### 3. **JSON Import Format Analysis**

#### Current JSON Structure (Problematic)
```json
{
  "question_text": "...",
  "attachments": [
    "Diagram showing plant seedlings growing towards light source",
    "Graph showing temperature vs time"
  ]
}
```

**Problem:** Attachments are string descriptions, not objects

#### Expected JSON Structure
```json
{
  "question_text": "...",
  "attachments": [
    {
      "id": "unique_id",
      "file_url": "https://...",
      "file_name": "diagram.png",
      "file_type": "image/png",
      "file_size": 12345
    }
  ]
}
```

**Required Fields:**
- `file_url` (string) - URL or data URI of the file
- `file_name` (string) - Display name of the file
- `file_type` (string) - MIME type (image/png, application/pdf, etc.)
- `file_size` (number) - Size in bytes (optional, defaults to 0)

---

### 4. **Import Pipeline Analysis**

#### Current Flow
```
JSON File → questionsDataOperations.ts → Database
                    ↓
              uploadedAttachments[key]
                    ↓
              map(att => ({ file_url: att.file_url, ... }))
                    ↓
              Database Insert
```

**Issue:** When `att` is a string, `att.file_url` returns `undefined`, which:
1. Passes database validation (stored as NULL or empty)
2. Causes runtime error when UI tries to render `<img src={attachment.file_url} />`

#### Error Location
**File:** `src/components/shared/UnifiedTestSimulation.tsx`
**Line:** 324
```typescript
<img src={attachment.file_url} ... />
```
When `attachment.file_url` is undefined, browser throws "URI malformed"

---

### 5. **Data Validation Gaps**

#### Missing Validations

1. **Pre-Import Validation**
   - No check for attachment structure before import
   - String attachments pass through without error
   - Only fails at runtime during rendering

2. **Type Guards**
   - No runtime type checking for attachment format
   - No validation of required properties

3. **Import Warnings**
   - No warning messages for invalid attachment formats
   - Silent failure until UI rendering

---

### 6. **Related Database Tables Review**

All related tables properly structured:

#### ✓ questions_master_admin
- Proper foreign keys to papers_setup, subjects, topics
- Status workflow correctly implemented
- Soft delete columns added
- RLS policies optimized

#### ✓ sub_questions
- Correct parent-child relationships
- Order/hierarchy fields properly indexed
- Status tracking aligned with parent questions

#### ✓ question_correct_answers
- Marks standardized to NUMERIC(5,2) for half-marks
- Proper context fields
- Linked alternatives structure

#### ✓ answer_components
- Context type/value/label fields
- Marks allocation tracking
- Alternative linking

#### ✓ questions_hints
- Proper foreign key relationships
- Text storage for hint content

---

## Impact Assessment

### Severity: **P0 - Critical**

**Affected Features:**
1. ✗ Test Simulation (Completely broken)
2. ✗ Question Preview (Fails on attachment render)
3. ✗ Mock Exam Display (Cannot show questions with attachments)
4. ✓ Question Import (Works but stores invalid data)
5. ✓ Database Operations (Schema is correct)

**User Impact:**
- Cannot preview imported questions
- Cannot run practice tests
- Cannot simulate exam conditions
- Data appears imported but is unusable

---

## Recommended Solutions

### Solution 1: Add Attachment Validation & Transformation (Recommended)

**Approach:** Validate and transform attachments during import

**Implementation:**
```typescript
function normalizeAttachment(att: any): AttachmentAsset | null {
  // If string, create placeholder attachment object
  if (typeof att === 'string') {
    return {
      id: crypto.randomUUID(),
      file_url: '', // Empty URL - requires manual upload
      file_name: att.substring(0, 100), // Use description as filename
      file_type: 'text/description',
      file_size: 0,
      description: att // Store original description
    };
  }

  // If object, validate required fields
  if (typeof att === 'object' && att !== null) {
    if (!att.file_url || typeof att.file_url !== 'string') {
      console.warn('Invalid attachment: missing file_url', att);
      return null;
    }
    return {
      id: att.id || crypto.randomUUID(),
      file_url: att.file_url,
      file_name: att.file_name || 'attachment',
      file_type: att.file_type || 'application/octet-stream',
      file_size: att.file_size || 0
    };
  }

  return null;
}
```

**Pros:**
- ✓ Graceful handling of both formats
- ✓ Preserves attachment descriptions
- ✓ Allows gradual migration
- ✓ No data loss

**Cons:**
- Requires manual upload of actual files later
- Placeholders may confuse users

---

### Solution 2: Reject Invalid Attachments with Warning

**Approach:** Validate attachments and reject invalid ones with clear error messages

**Implementation:**
```typescript
function validateAttachment(att: any): ValidationResult {
  if (typeof att === 'string') {
    return {
      valid: false,
      error: 'Attachment is a description string, not a file object',
      suggestion: 'Convert to: { file_url: "...", file_name: "...", file_type: "..." }'
    };
  }

  if (!att.file_url) {
    return {
      valid: false,
      error: 'Missing required field: file_url',
      attachment: att
    };
  }

  return { valid: true };
}
```

**Pros:**
- ✓ Enforces correct data structure
- ✓ Clear error messages
- ✓ Prevents invalid data in database

**Cons:**
- ✗ Blocks import of affected questions
- ✗ Requires JSON file fixes before import

---

### Solution 3: Add Description Field to Database

**Approach:** Extend questions_attachments table to support descriptions

**Migration:**
```sql
ALTER TABLE questions_attachments
  ADD COLUMN IF NOT EXISTS description text,
  ALTER COLUMN file_url DROP NOT NULL;

-- Add check constraint
ALTER TABLE questions_attachments
  ADD CONSTRAINT attachment_has_url_or_description
  CHECK (file_url IS NOT NULL OR description IS NOT NULL);
```

**Pros:**
- ✓ Supports both file attachments and descriptions
- ✓ No data loss
- ✓ Flexible for future use cases

**Cons:**
- Requires database migration
- UI needs update to handle both types

---

## Immediate Action Items

### High Priority
1. **Implement attachment validation in import process**
   - File: `src/lib/data-operations/questionsDataOperations.ts`
   - Add `normalizeAttachment()` function
   - Apply validation before database insert

2. **Add pre-import validation**
   - File: `src/lib/extraction/preImportValidation.ts`
   - Check attachment structure
   - Generate validation warnings

3. **Update UI to handle missing attachments gracefully**
   - File: `src/components/shared/UnifiedTestSimulation.tsx`
   - Add null check before rendering
   - Show placeholder for missing files

### Medium Priority
4. **Update JSON extraction guides**
   - File: `JSON/general_extraction_guide.md`
   - Document proper attachment structure
   - Add examples and validation rules

5. **Add migration for description field**
   - Create new migration file
   - Add description column
   - Update RLS policies if needed

### Low Priority
6. **Add comprehensive logging**
   - Log all attachment processing
   - Track conversion success/failure
   - Monitor data quality

---

## Testing Checklist

### Pre-Deployment Testing
- [ ] Import JSON with string attachments (test graceful handling)
- [ ] Import JSON with object attachments (test happy path)
- [ ] Import JSON with missing file_url (test validation)
- [ ] Run test simulation with converted attachments
- [ ] Verify database inserts correctly
- [ ] Check RLS policies allow proper access
- [ ] Test attachment display in UI
- [ ] Verify error messages are clear

### Post-Deployment Monitoring
- [ ] Monitor import success rates
- [ ] Track attachment validation failures
- [ ] Review user feedback on placeholders
- [ ] Check database data quality
- [ ] Monitor error logs for attachment issues

---

## Prevention Measures

### JSON Schema Validation
Create JSON schema for import validation:
```json
{
  "type": "object",
  "properties": {
    "attachments": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file_url", "file_name", "file_type"],
        "properties": {
          "file_url": { "type": "string", "format": "uri" },
          "file_name": { "type": "string" },
          "file_type": { "type": "string" },
          "file_size": { "type": "number" }
        }
      }
    }
  }
}
```

### Automated Testing
- Unit tests for attachment validation
- Integration tests for import pipeline
- E2E tests for test simulation

---

## Conclusion

The comprehensive audit reveals that while the database schema, RLS policies, and type definitions are all correctly implemented, there is a critical data structure mismatch at the import stage. String attachments in JSON files are not being validated or transformed before being processed, leading to runtime errors when the UI attempts to render them.

**Recommended Approach:** Implement Solution 1 (validation & transformation) as an immediate fix, followed by Solution 3 (database extension) as a long-term enhancement to support both file attachments and textual descriptions.

This will provide backward compatibility while enforcing data quality and preventing similar issues in the future.
