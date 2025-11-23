# 🔍 Comprehensive Data Audit Report: Paper Setup & Question Import System
## Answer Formats, Storage, Types, RLS & Buckets Analysis

**Date**: November 23, 2025
**Scope**: Complete review of data insertion logic, types, database schemas, RLS policies, and storage configurations for all answer formats
**Status**: 🚨 **CRITICAL ISSUES FOUND** - Immediate action required

---

## 📋 Executive Summary

This comprehensive audit reviewed the entire data flow for paper setup, question import, and answer format handling across the GGK Admin System. The review identified **8 critical issues** and **15 improvement recommendations** across database schema, storage infrastructure, type safety, and data validation.

### Critical Findings

| Severity | Issue | Impact | Status |
|----------|-------|--------|--------|
| 🔴 **CRITICAL** | Missing `student-answer-assets` storage bucket | File/audio uploads fail in production | ❌ Not Created |
| 🔴 **CRITICAL** | No storage policies for answer assets | Security vulnerability, uploads blocked | ❌ Not Configured |
| 🟡 **HIGH** | `answer_format` field has no enum constraint | Invalid formats can be inserted | ⚠️ Needs Fix |
| 🟡 **HIGH** | Marks field type mismatch (integer vs numeric) | Partial credit marking broken | ⚠️ Inconsistent |
| 🟡 **HIGH** | No JSON schema validation on insert | Corrupted data can be stored | ⚠️ Unvalidated |
| 🟡 **HIGH** | Missing file size/MIME type validation | Large/malicious files can be uploaded | ⚠️ Unprotected |
| 🟠 **MEDIUM** | `table_templates` not integrated in import flow | New table completion feature unusable | ⚠️ Partial |
| 🟠 **MEDIUM** | Deprecated `correct_answer` text field still in use | Data duplication and confusion | ⚠️ Legacy Code |

---

## 1️⃣ Database Schema Analysis

### ✅ Core Tables Review

#### **questions_master_admin** Table
```sql
-- Key columns for answer formats
answer_format              VARCHAR          -- ❌ NO enum constraint
answer_requirement         TEXT             -- ❌ NO validation
correct_answer             TEXT             -- ⚠️  DEPRECATED (use question_correct_answers table)
total_alternatives         INTEGER          -- ✅ Correct type
marks                      NUMERIC          -- ✅ Supports fractional marks
context_metadata           JSONB            -- ✅ Flexible storage
has_context_structure      BOOLEAN          -- ✅ Context flag
```

**Issues Found:**
- ❌ `answer_format` has no CHECK constraint - any string can be stored
- ⚠️ `correct_answer` column deprecated but still referenced in some code
- ⚠️ No validation on `context_metadata` JSON structure

#### **sub_questions** Table
```sql
-- Same issues as questions_master_admin
answer_format              VARCHAR          -- ❌ NO enum constraint
answer_requirement         TEXT             -- ❌ NO validation
correct_answer             TEXT             -- ⚠️  DEPRECATED
marks                      NUMERIC          -- ✅ Supports fractional marks
context_metadata           JSONB            -- ✅ Flexible storage
```

**Issues Found:**
- ❌ Identical schema issues as questions_master_admin
- ⚠️ No hint/explanation fields (added in later migration 20251112120000)

#### **question_correct_answers** Table ✅
```sql
CREATE TABLE question_correct_answers (
  id                       UUID PRIMARY KEY,
  question_id              UUID REFERENCES questions_master_admin(id) CASCADE,
  sub_question_id          UUID REFERENCES sub_questions(id) CASCADE,
  answer                   TEXT NOT NULL,           -- ✅ Main answer storage
  marks                    INTEGER,                 -- ⚠️ Should be NUMERIC!
  alternative_id           INTEGER,                 -- ✅ Alternative tracking
  context_type             TEXT,                    -- ✅ Context support
  context_value            TEXT,                    -- ✅ Context data
  context_label            TEXT,                    -- ✅ Display label
  created_at               TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )                                                 -- ✅ Either/or constraint
);
```

**Issues Found:**
- ❌ **CRITICAL**: `marks` column is INTEGER, should be NUMERIC for partial credit
- ⚠️ No validation on `context_type` values
- ⚠️ `answer` TEXT field stores complex JSON for advanced formats (diagram, audio, etc.)
- ⚠️ No JSON schema validation before insert

#### **question_options** Table (MCQ)
```sql
CREATE TABLE question_options (
  id                       UUID PRIMARY KEY,
  question_id              UUID REFERENCES questions_master_admin(id) CASCADE,
  sub_question_id          UUID REFERENCES sub_questions(id) CASCADE,
  label                    VARCHAR,                 -- ✅ A, B, C, D labels
  text                     TEXT,                    -- ✅ Option text
  is_correct               BOOLEAN,                 -- ✅ Correct flag
  image_id                 UUID,                    -- ✅ Image attachment
  explanation              TEXT,                    -- ✅ Why correct/wrong
  context_type             VARCHAR,                 -- ✅ Context tracking
  context_value            VARCHAR,                 -- ✅ Context data
  context_label            VARCHAR,                 -- ✅ Display label
  created_at               TIMESTAMPTZ DEFAULT now()
);
```

**Status:** ✅ Schema is well-designed

#### **table_templates** & **table_template_cells** Tables (NEW) ✅
```sql
CREATE TABLE table_templates (
  id                       UUID PRIMARY KEY,
  question_id              UUID REFERENCES questions_master_admin(id) CASCADE,
  sub_question_id          UUID REFERENCES sub_questions(id) CASCADE,
  rows                     INTEGER CHECK (rows >= 2 AND rows <= 50),
  columns                  INTEGER CHECK (columns >= 2 AND rows <= 20),
  headers                  TEXT[] NOT NULL DEFAULT '{}',
  title                    TEXT,
  description              TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

CREATE TABLE table_template_cells (
  id                       UUID PRIMARY KEY,
  template_id              UUID NOT NULL REFERENCES table_templates(id) CASCADE,
  row_index                INTEGER CHECK (row_index >= 0),
  col_index                INTEGER CHECK (col_index >= 0),
  cell_type                TEXT CHECK (cell_type IN ('locked', 'editable')),
  locked_value             TEXT,
  expected_answer          TEXT,
  marks                    INTEGER DEFAULT 1 CHECK (marks > 0),
  accepts_equivalent_phrasing BOOLEAN DEFAULT false,
  case_sensitive           BOOLEAN DEFAULT false,
  alternative_answers      TEXT[] DEFAULT '{}'
);
```

**Status:** ✅ Excellent schema design with proper constraints
**Issue:** ⚠️ Not integrated into question import workflow yet

---

## 2️⃣ Answer Format Type System

### Supported Formats in DynamicAnswerField Component

| Format | Component | Storage Type | Data Structure | Status |
|--------|-----------|--------------|----------------|--------|
| `single_word` | Input | TEXT | String | ✅ Working |
| `single_line` | Input | TEXT | String | ✅ Working |
| `multi_line` | Textarea | TEXT | String | ✅ Working |
| `multi_line_labeled` | Multiple Inputs | TEXT | String | ✅ Working |
| `two_items_connected` | Two Inputs | TEXT[] | String Array | ✅ Working |
| `code` | CodeEditor (Monaco) | TEXT | String (code) | ✅ Working |
| `file_upload` | FileUploader | TEXT | JSON Array | ❌ **BROKEN** - Bucket missing |
| `audio` | AudioRecorder | TEXT | JSON Object | ❌ **BROKEN** - Bucket missing |
| `table_completion` | TableCompletion | TEXT | JSON Object | ⚠️ Partial - Templates work |
| `table` / `table_creator` | TableCreator (Handsontable) | TEXT | JSON Object | ✅ Working |
| `diagram` | DiagramCanvas (Fabric.js) | TEXT | JSON Object | ✅ Working |
| `graph` | GraphPlotter (Recharts) | TEXT | JSON Object | ✅ Working |
| `structural_diagram` | StructuralDiagram | TEXT | JSON Object | ✅ Working |
| `chemical_structure` | ChemicalStructureEditor | TEXT | JSON Object | ✅ Working |
| `equation` | RichTextEditor | TEXT | HTML/LaTeX | ✅ Working |
| `calculation` | RichTextEditor | TEXT | HTML/Math | ✅ Working |

### Data Storage Mapping

**Text-Based Formats** → Direct TEXT storage in `question_correct_answers.answer`
- `single_word`, `single_line`, `multi_line`, `multi_line_labeled`, `two_items_connected`, `code`

**JSON-Based Formats** → JSON string in `question_correct_answers.answer`
- `table_completion`, `table_creator`, `diagram`, `graph`, `structural_diagram`, `chemical_structure`
- Example structure:
```json
{
  "type": "table_completion",
  "data": {
    "rows": 5,
    "columns": 5,
    "cells": {...},
    "headers": [...]
  }
}
```

**Binary/File-Based Formats** → JSON with Storage URLs in `question_correct_answers.answer`
- `file_upload`, `audio`
- Example structure:
```json
{
  "type": "file_upload",
  "files": [
    {
      "name": "diagram.png",
      "url": "https://[project].supabase.co/storage/v1/object/public/student-answer-assets/[userId]/files/[timestamp]_diagram.png",
      "path": "[userId]/files/[timestamp]_diagram.png",
      "size": 245678,
      "mimeType": "image/png"
    }
  ]
}
```

### **🚨 CRITICAL ISSUE**: Missing Storage Bucket

The code in `/src/components/answer-formats/utils/assetUpload.ts` references:
```typescript
const { data, error } = await supabase.storage
  .from('student-answer-assets')  // ❌ THIS BUCKET DOES NOT EXIST!
  .upload(path, file, { ... });
```

**Impact:**
- ❌ All file uploads fail with "bucket not found" error
- ❌ All audio recordings fail to save
- ❌ Exported diagrams/graphs cannot be stored
- ❌ Students cannot submit file-based answers

**Files Affected:**
- `src/components/answer-formats/FileUploader/FileUploader.tsx`
- `src/components/answer-formats/AudioRecorder/AudioRecorder.tsx`
- `src/components/answer-formats/utils/assetUpload.ts`
- `src/components/answer-formats/utils/canvasExport.ts`

---

## 3️⃣ RLS Policies Review

### ✅ Table-Level RLS Status

| Table | RLS Enabled | Policies Count | Status |
|-------|-------------|----------------|--------|
| `questions_master_admin` | ✅ | 6 | ✅ Comprehensive |
| `sub_questions` | ✅ | 6 | ✅ Comprehensive |
| `question_correct_answers` | ✅ | 6 | ✅ Comprehensive |
| `question_options` | ✅ | 6 | ✅ Comprehensive |
| `question_distractors` | ✅ | 6 | ✅ Comprehensive |
| `answer_components` | ❌ | 0 | ❌ **NO RLS!** |
| `answer_requirements` | ❌ | 0 | ❌ **NO RLS!** |
| `table_templates` | ✅ | 3 | ✅ Good |
| `table_template_cells` | ✅ | 3 | ✅ Good |

### ❌ Missing RLS Policies

**Critical Tables Without RLS:**
1. `answer_components` - Stores contextual answer alternatives
2. `answer_requirements` - Stores answer logic rules

**Impact:** Anyone with database access can read/modify these tables, bypassing security.

### ✅ Storage Bucket Policies

**Existing Buckets with Policies:**
- ✅ `company-logos` - Comprehensive policies
- ✅ `school-logos` - Comprehensive policies
- ✅ `branch-logos` - Comprehensive policies
- ✅ `subject-logos` - Comprehensive policies
- ✅ `user-avatars` - Comprehensive policies
- ✅ `materials` - Comprehensive policies with authentication

**❌ Missing Bucket:**
- ❌ `student-answer-assets` - **DOES NOT EXIST**

**Required Storage Policies:**
```sql
-- SELECT: Authenticated users can view their own files
-- INSERT: Authenticated users can upload files
-- UPDATE: Users can update their own files
-- DELETE: Users can delete their own files
```

---

## 4️⃣ Data Insertion Flow Analysis

### Paper Setup Wizard Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Upload Tab                                               │
│    - JSON file validation                                   │
│    - Pre-import schema check                                │
│    - Session creation: past_paper_import_sessions          │
│    Status: ✅ Working                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Structure Tab                                            │
│    - Data structure linkage (exam board, subject)           │
│    - Academic hierarchy mapping                             │
│    Status: ✅ Working                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Metadata Tab                                             │
│    - Paper details (code, year, session)                    │
│    - Exam type and format                                   │
│    - Insert into: papers_setup                              │
│    Status: ✅ Working                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Questions Tab (CRITICAL AREA)                            │
│    - Question extraction from JSON                          │
│    - Answer format detection  ← ⚠️ NO VALIDATION            │
│    - Correct answers extraction                             │
│    - Parts/subparts creation                                │
│    - Attachments linkage                                    │
│    - Batch insert operations                                │
│    Status: ⚠️ Works but NO validation                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Database Inserts (Atomic Transaction)                       │
│                                                              │
│ INSERT INTO questions_master_admin (...)                    │
│   - answer_format ← ⚠️ NO ENUM validation                  │
│   - answer_requirement ← ⚠️ NO validation                  │
│   - marks ← ✅ NUMERIC type                                 │
│   - context_metadata ← ⚠️ NO JSON validation               │
│                                                              │
│ INSERT INTO sub_questions (...)                             │
│   - Same issues as above                                    │
│                                                              │
│ INSERT INTO question_correct_answers (...)                  │
│   - answer ← ⚠️ TEXT field, stores JSON without validation │
│   - marks ← ❌ INTEGER type (should be NUMERIC!)           │
│   - context_type ← ⚠️ NO validation                        │
│                                                              │
│ INSERT INTO question_options (...)  ← ✅ Well structured    │
│                                                              │
│ INSERT INTO answer_components (...)  ← ❌ NO RLS!           │
│                                                              │
│ INSERT INTO answer_requirements (...)  ← ❌ NO RLS!         │
│                                                              │
│ ❌ NO INSERT INTO table_templates (not integrated)          │
│                                                              │
│ Status: ⚠️ Works but lacks validation & security           │
└─────────────────────────────────────────────────────────────┘
```

### Question Processing Pipeline

```typescript
// From JSON → Database insertion
const questionData = extractFromJSON(jsonData);

// ⚠️ NO VALIDATION HERE
const answerFormat = detectAnswerFormat(questionData);  // ❌ No whitelist check

// ⚠️ NO JSON SCHEMA VALIDATION
const correctAnswers = extractCorrectAnswers(questionData);  // ❌ Can be malformed JSON

// Insert without validation
await supabase.from('questions_master_admin').insert({
  answer_format: answerFormat,  // ❌ No enum constraint
  correct_answers: correctAnswers  // ❌ No schema validation
});
```

**Critical Issues:**
1. ❌ No answer_format whitelist validation
2. ❌ No JSON schema validation for complex answer types
3. ❌ No marks total validation across alternatives
4. ❌ No storage URL validation (files, audio)
5. ❌ No template existence check for table_completion
6. ❌ No file size/MIME type validation

---

## 5️⃣ Answer Requirements & Logic Validation

### Answer Requirement Types Supported

| Requirement | Description | Validation | Status |
|-------------|-------------|------------|--------|
| `any_one_from` | Select 1 from N alternatives | ⚠️ Count check only | Partial |
| `any_two_from` | Select 2 from N alternatives | ⚠️ Count check only | Partial |
| `any_three_from` | Select 3 from N alternatives | ⚠️ Count check only | Partial |
| `both_required` | Both answers needed | ⚠️ Count check only | Partial |
| `all_required` | All answers needed | ⚠️ Count check only | Partial |
| `alternative_methods` | Different solution approaches | ❌ No validation | Missing |
| `acceptable_variations` | Equivalent phrasings | ❌ No validation | Missing |

### Validation Logic Issues

**Current Implementation:**
```typescript
// Only checks count, not actual validation
const expectedCount = getRequiredAnswerCount(answerRequirement);
const actualCount = correctAnswers.length;
const isValid = actualCount >= expectedCount;  // ❌ Too simplistic!
```

**Missing Validations:**
1. ❌ Marks distribution validation (should sum to question.marks)
2. ❌ Alternative ID uniqueness check
3. ❌ Linked alternatives integrity check
4. ❌ Context type consistency validation
5. ❌ JSON structure validation for complex formats

### Mark Scheme Flags

**Supported Flags:**
- ✅ `accepts_equivalent_phrasing` (OWTTE - Or Words To That Effect)
- ✅ `accepts_reverse_argument` (ORA - Or Reverse Argument)
- ✅ `error_carried_forward` (ECF - Error Carried Forward)
- ⚠️ `case_sensitive` - Only in table_template_cells, not in main answers

**Missing Flags:**
- ❌ `accepts_mathematical_notation`
- ❌ `accepts_abbreviated_forms`
- ❌ `ignore_articles` (a, an, the)
- ❌ `accepts_symbolic_notation`

---

## 6️⃣ Storage Buckets & File Management

### ❌ CRITICAL: Missing Storage Bucket

**Bucket Used in Code:**
```typescript
// src/components/answer-formats/utils/assetUpload.ts:31
const { data, error } = await supabase.storage
  .from('student-answer-assets')  // ❌ BUCKET DOES NOT EXIST
  .upload(path, file, {...});
```

**Required Bucket Configuration:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-answer-assets',
  'student-answer-assets',
  false,  -- NOT public (requires authentication)
  10485760,  -- 10MB limit
  ARRAY[
    -- Images
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
    -- Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    -- Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Text
    'text/plain', 'text/csv'
  ]::text[]
);
```

### Required Storage Policies

**❌ Missing Policies for `student-answer-assets` bucket:**

```sql
-- 1. SELECT: Users can view their own files
CREATE POLICY "Users can view own answer assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. INSERT: Users can upload to their own folder
CREATE POLICY "Users can upload own answer assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. UPDATE: Users can update their own files
CREATE POLICY "Users can update own answer assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. DELETE: Users can delete their own files
CREATE POLICY "Users can delete own answer assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. System admins full access
CREATE POLICY "System admins full access to answer assets"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- 6. Teachers can view student submissions
CREATE POLICY "Teachers can view student answer assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );
```

### File Upload Flow Issues

**Current Flow:**
```
User uploads file → uploadAnswerAsset() → Supabase Storage
                                              ↓
                                         ❌ FAILS: Bucket not found
```

**Expected Flow:**
```
User uploads file → Validation (size, type) → Compression (images)
                         ↓
                    Supabase Storage (student-answer-assets bucket)
                         ↓
                    Get public/signed URL
                         ↓
                    Store URL in JSON → question_correct_answers.answer
```

**Missing Validations:**
1. ❌ File size limit enforcement (currently no check before upload)
2. ❌ MIME type validation (malicious files can be uploaded)
3. ❌ Virus scanning (not implemented)
4. ❌ Filename sanitization (special characters not handled)
5. ❌ Duplicate file detection
6. ❌ Storage quota enforcement per user

---

## 7️⃣ Table Completion Integration Issues

### ✅ Database Schema - COMPLETE
- ✅ `table_templates` table exists
- ✅ `table_template_cells` table exists
- ✅ RLS policies applied
- ✅ Foreign key constraints working
- ✅ Indexes created

### ⚠️ Component Integration - PARTIAL
- ✅ `TableCompletion` component renders correctly
- ✅ Admin mode works (template creation)
- ✅ Student mode works (fill in answers)
- ✅ `TableTemplateService` implemented
- ✅ `TableGradingService` implemented

### ❌ Import Flow Integration - MISSING
- ❌ JSON import does NOT create table templates
- ❌ Question import wizard does NOT support `table_completion` format
- ❌ No automatic template generation from JSON data
- ❌ No UI in Questions Tab for template configuration

**Impact:** Teachers must manually create table templates AFTER importing questions, which is tedious and error-prone.

**Required Integration:**
```typescript
// In QuestionsTab.tsx processQuestions function:
if (question.answer_format === 'table_completion' && question.template_data) {
  // Create template
  await TableTemplateService.saveTemplate({
    question_id: question.id,
    rows: question.template_data.rows,
    columns: question.template_data.columns,
    headers: question.template_data.headers,
    cells: question.template_data.cells
  });
}
```

---

## 8️⃣ Type Safety & Interface Analysis

### TypeScript Interfaces

**CorrectAnswer Interface** (DynamicAnswerField.tsx):
```typescript
interface CorrectAnswer {
  answer: string;                    // ✅ Main answer
  marks?: number;                    // ⚠️ Should be required
  alternative_id?: number;           // ✅ Alternative tracking
  linked_alternatives?: number[];    // ✅ Linking support
  context?: {                        // ✅ Context object
    type: string;
    value: string;
    label?: string;
  };
  // ... many more fields
}
```

**Issues:**
- ⚠️ `marks` is optional but should be required
- ⚠️ No validation that `answer` matches `answer_format`
- ❌ No type guards for JSON parsing
- ❌ No runtime validation with Zod or similar

### Type Mismatches

| Database Column | DB Type | TypeScript Type | Status |
|----------------|---------|-----------------|--------|
| `marks` (question_correct_answers) | INTEGER | `number` | ❌ **MISMATCH** (should be NUMERIC) |
| `answer_format` | VARCHAR | `string` | ⚠️ Should be enum type |
| `context_metadata` | JSONB | `Record<string, unknown>` | ⚠️ Weak typing |
| `correct_answer` (deprecated) | TEXT | `string` | ⚠️ Should be removed |

### JSON Storage Type Safety

**Current Approach:**
```typescript
// ❌ NO TYPE CHECKING
const answer = JSON.stringify(complexData);
await supabase.from('question_correct_answers').insert({ answer });
```

**Recommended Approach:**
```typescript
// ✅ WITH TYPE CHECKING
import { z } from 'zod';

const TableCompletionSchema = z.object({
  type: z.literal('table_completion'),
  data: z.object({
    rows: z.number().int().min(2).max(50),
    columns: z.number().int().min(2).max(20),
    cells: z.record(z.string()),
    headers: z.array(z.string())
  })
});

const validated = TableCompletionSchema.parse(complexData);
const answer = JSON.stringify(validated);
```

---

## 9️⃣ Data Validation & Sanitization

### ❌ Missing Input Validations

**Answer Format Validation:**
```typescript
// Current: NO VALIDATION
const answerFormat = question.answer_format;  // Can be ANYTHING!

// Required: WHITELIST VALIDATION
const VALID_ANSWER_FORMATS = [
  'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
  'two_items_connected', 'code', 'file_upload', 'audio',
  'table_completion', 'table', 'table_creator', 'diagram', 'graph',
  'structural_diagram', 'chemical_structure', 'equation', 'calculation'
] as const;

if (!VALID_ANSWER_FORMATS.includes(answerFormat)) {
  throw new Error(`Invalid answer format: ${answerFormat}`);
}
```

**Marks Validation:**
```typescript
// Required validation
const totalMarks = correctAnswers.reduce((sum, ans) => sum + (ans.marks || 0), 0);
if (totalMarks !== question.marks) {
  throw new Error(`Marks mismatch: ${totalMarks} !== ${question.marks}`);
}
```

**JSON Structure Validation:**
```typescript
// Required for complex formats
if (answerFormat === 'diagram') {
  const schema = z.object({
    type: z.literal('diagram'),
    objects: z.array(z.any()),
    background: z.string().optional()
  });

  try {
    const parsed = JSON.parse(answer);
    schema.parse(parsed);
  } catch (error) {
    throw new Error('Invalid diagram data structure');
  }
}
```

### ❌ Missing Sanitization

**HTML/XSS Prevention:**
```typescript
// Required: Sanitize user input
import DOMPurify from 'dompurify';

const sanitizedAnswer = DOMPurify.sanitize(userInput);
```

**SQL Injection Prevention:**
- ✅ Currently using parameterized queries (Supabase client)
- ✅ No raw SQL string concatenation found

**File Path Traversal Prevention:**
```typescript
// Required: Validate file paths
const sanitizedPath = path.replace(/\.\./g, '').replace(/\\/g, '/');
```

### ❌ Missing Error Handling

**Current:**
```typescript
// ❌ NO TRY-CATCH
const { data, error } = await supabase.from('questions_master_admin').insert(question);
if (error) {
  console.error(error);  // ❌ Only logs, doesn't handle
}
```

**Required:**
```typescript
// ✅ COMPREHENSIVE ERROR HANDLING
try {
  const { data, error } = await supabase
    .from('questions_master_admin')
    .insert(question);

  if (error) {
    if (error.code === '23505') {
      throw new Error('Question already exists');
    }
    if (error.code === '23503') {
      throw new Error('Invalid reference (paper_id, topic_id, etc.)');
    }
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
} catch (error) {
  // Log to monitoring service
  logger.error('Question insert failed', { error, question });

  // Show user-friendly message
  toast.error('Failed to save question. Please try again.');

  // Rollback any partial changes
  await rollbackTransaction();

  throw error;  // Re-throw for upstream handling
}
```

---

## 🔟 Migration Scripts Required

### Critical Migrations Needed

#### **Migration 1: Create student-answer-assets Bucket**
```sql
/*
  # Create Storage Bucket for Student Answer Assets

  Creates the missing storage bucket for file uploads, audio recordings,
  and exported diagrams/graphs from answer format components.

  Security:
  - Private bucket (requires authentication)
  - 10MB file size limit
  - MIME type restrictions for security
  - RLS policies for user isolation
*/

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-answer-assets',
  'student-answer-assets',
  false,
  10485760,  -- 10MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies
CREATE POLICY "Users can view own answer assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own answer assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own answer assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own answer assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "System admins full access to answer assets"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Teachers can view student answer assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );
```

#### **Migration 2: Add Answer Format Enum Constraint**
```sql
/*
  # Add Answer Format Validation

  Adds CHECK constraint to ensure only valid answer formats can be stored.
*/

-- Add constraint to questions_master_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_answer_format_check'
  ) THEN
    ALTER TABLE questions_master_admin
      ADD CONSTRAINT questions_answer_format_check
      CHECK (answer_format IN (
        'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
        'two_items_connected', 'code', 'file_upload', 'audio',
        'table_completion', 'table', 'table_creator', 'diagram', 'graph',
        'structural_diagram', 'chemical_structure', 'equation', 'calculation',
        NULL  -- Allow NULL for questions without specific format
      ));
  END IF;
END $$;

-- Add constraint to sub_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sub_questions_answer_format_check'
  ) THEN
    ALTER TABLE sub_questions
      ADD CONSTRAINT sub_questions_answer_format_check
      CHECK (answer_format IN (
        'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
        'two_items_connected', 'code', 'file_upload', 'audio',
        'table_completion', 'table', 'table_creator', 'diagram', 'graph',
        'structural_diagram', 'chemical_structure', 'equation', 'calculation',
        NULL
      ));
  END IF;
END $$;
```

#### **Migration 3: Fix Marks Data Type**
```sql
/*
  # Fix Marks Column Type

  Changes marks from INTEGER to NUMERIC to support partial credit (0.5, 1.5, etc.)
*/

-- Fix question_correct_answers.marks
ALTER TABLE question_correct_answers
  ALTER COLUMN marks TYPE numeric USING marks::numeric;

-- Update any hardcoded integer constraints if they exist
-- (Already numeric in questions_master_admin and sub_questions)
```

#### **Migration 4: Add RLS to Missing Tables**
```sql
/*
  # Add RLS to Answer Components Tables

  Enables RLS on answer_components and answer_requirements tables.
*/

-- Enable RLS
ALTER TABLE answer_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_requirements ENABLE ROW LEVEL SECURITY;

-- System admins full access
CREATE POLICY "System admins can manage answer components"
  ON answer_components FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "System admins can manage answer requirements"
  ON answer_requirements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Teachers can view answer components
CREATE POLICY "Teachers can view answer components"
  ON answer_components FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );

CREATE POLICY "Teachers can view answer requirements"
  ON answer_requirements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );
```

---

## 📊 Summary of Findings

### Critical Issues (Immediate Action Required)

| # | Issue | Impact | Priority | Effort |
|---|-------|--------|----------|--------|
| 1 | Missing `student-answer-assets` bucket | File/audio uploads fail | 🔴 CRITICAL | 1 hour |
| 2 | No storage policies for answer assets | Security vulnerability | 🔴 CRITICAL | 1 hour |
| 3 | No answer_format enum constraint | Invalid formats stored | 🟡 HIGH | 30 mins |
| 4 | Marks type mismatch (INTEGER vs NUMERIC) | Partial credit broken | 🟡 HIGH | 15 mins |
| 5 | No JSON schema validation | Corrupted data stored | 🟡 HIGH | 4 hours |
| 6 | No file size/MIME validation | Security risk | 🟡 HIGH | 2 hours |
| 7 | No RLS on answer_components/requirements | Security bypass | 🟠 MEDIUM | 1 hour |
| 8 | Table templates not in import flow | Feature unusable | 🟠 MEDIUM | 6 hours |

### Total Estimated Effort: **16 hours**

---

## ✅ Recommendations

### Immediate Actions (Within 24 Hours)

1. **Create Storage Bucket** - Apply Migration 1
2. **Add Answer Format Constraint** - Apply Migration 2
3. **Fix Marks Data Type** - Apply Migration 3
4. **Add Missing RLS Policies** - Apply Migration 4

### Short-Term Actions (Within 1 Week)

5. **Add JSON Schema Validation** - Implement Zod schemas for all answer formats
6. **Add File Upload Validation** - Size limits, MIME types, virus scanning
7. **Integrate Table Templates** - Add to question import workflow
8. **Add TypeScript Strict Mode** - Enable `strict: true` in tsconfig.json

### Medium-Term Actions (Within 1 Month)

9. **Deprecate correct_answer Column** - Migrate all data to question_correct_answers
10. **Add Monitoring & Logging** - Track validation failures, upload errors
11. **Implement Rate Limiting** - Prevent abuse of file uploads
12. **Add Data Migration Tool** - Fix existing records with invalid data
13. **Create E2E Tests** - Test all answer format flows end-to-end
14. **Documentation** - Document answer format specifications
15. **Performance Optimization** - Add caching for templates, optimize queries

---

## 📝 Conclusion

This audit identified **8 critical issues** and **15 recommendations** for the paper setup and question import system. The most critical finding is the missing `student-answer-assets` storage bucket, which completely breaks file upload and audio recording functionality.

**Immediate Next Steps:**
1. ✅ Apply all 4 migration scripts
2. ✅ Test file uploads and audio recording
3. ✅ Verify RLS policies work correctly
4. ✅ Add validation to question import flow
5. ✅ Run comprehensive tests on all answer formats

**Success Criteria:**
- ✅ All answer formats work end-to-end
- ✅ File uploads succeed with proper security
- ✅ Data validation prevents invalid inserts
- ✅ RLS policies properly isolate data
- ✅ Type safety prevents runtime errors
- ✅ Table completion fully integrated

---

**Report Generated**: November 23, 2025
**Audited By**: AI Code Review System
**Status**: 🚨 **REQUIRES IMMEDIATE ACTION**
