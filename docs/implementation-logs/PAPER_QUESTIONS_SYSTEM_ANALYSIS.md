# Complete System Analysis: Paper Setup & Questions Workflow
## Deep Investigation and Data Flow Review

**Date:** 2025-10-10
**Status:** In Progress
**Objective:** Ensure unified data sources and consistency across all paper/question workflows

---

## Executive Summary

This document provides a comprehensive analysis of the paper setup and questions management system, examining database schema, data operations, and workflow implementations to identify inconsistencies and ensure data integrity.

---

## Phase 1: Database Schema Analysis

### Core Tables Identified

#### 1. **papers_setup** (Main Paper Table)
**Purpose:** Stores imported past paper metadata and status

**Key Columns:**
- `id` (uuid, PK)
- `paper_code` (text)
- `exam_year` (integer)
- `exam_session` (text)
- `status` (text)
- `qa_started_at`, `qa_completed_at` (timestamps)
- `context_analysis_completed` (boolean)
- `total_context_components` (integer)
- `analytics_enabled` (boolean)

**Status Values:** 'draft', 'in_progress', 'ready_for_qa', 'qa_in_progress', 'completed', 'failed'

#### 2. **questions_master_admin** (Main Question Table)
**Purpose:** Stores top-level questions from papers

**Key Columns:**
- `id` (uuid, PK)
- `paper_id` (uuid, FK → papers_setup)
- `data_structure_id` (uuid, FK)
- `region_id`, `program_id`, `provider_id`, `subject_id` (uuid, FKs)
- `chapter_id` (unit), `topic_id`, `subtopic_id` (uuid, FKs)
- `question_number` (integer)
- `question_header` (text)
- `question_description` (text)
- `question_content_type` (text: 'text', 'figure', 'text_and_figure', 'parts_only')
- `type` (text: 'mcq', 'descriptive', 'complex')
- `category` (text: 'direct', 'complex')
- `marks` (integer)
- `difficulty` (text)
- `year` (integer)
- `is_confirmed` (boolean)
- `confirmed_at`, `confirmed_by` (timestamp, uuid)
- `qa_notes` (text)
- `answer_format` (varchar)
- `answer_requirement` (text)
- `total_alternatives` (integer)
- `correct_answer` (text)
- `context_metadata` (jsonb)
- `has_context_structure` (boolean)
- `context_extraction_status` (varchar: 'pending', 'in_progress', 'completed', 'failed')
- `hint`, `explanation` (text)
- `import_session_id` (uuid, FK)
- `status` (text: 'active', 'inactive', 'archived')

#### 3. **sub_questions** (Question Parts Table)
**Purpose:** Stores question parts, subparts, and nested structures

**Key Columns:**
- `id` (uuid, PK)
- `question_id` (uuid, FK → questions_master_admin)
- `parent_id` (uuid, FK → sub_questions, nullable for top-level parts)
- `level` (integer: 1, 2, 3 for nesting depth)
- `order_index` (integer)
- `part_label` (text: 'a', 'b', 'c' or 'i', 'ii', 'iii')
- `type` (text: 'mcq', 'descriptive', etc.)
- `topic_id`, `subtopic_id` (uuid, FKs)
- `description` (text)
- `question_description` (text)
- `marks` (integer)
- `difficulty` (text)
- `is_confirmed` (boolean)
- `confirmed_at`, `confirmed_by` (timestamp, uuid)
- `answer_format` (varchar)
- `answer_requirement` (text)
- `total_alternatives` (integer)
- `correct_answer` (text)
- `context_metadata` (jsonb)
- `has_context_structure` (boolean)
- `hint`, `explanation` (text)
- `status` (text)

#### 4. **question_correct_answers** (Answer Storage)
**Purpose:** Stores multiple correct answer options with context

**Key Columns:**
- `id` (uuid, PK)
- `question_id` (uuid, FK → questions_master_admin, nullable)
- `sub_question_id` (uuid, FK → sub_questions, nullable)
- `answer` (text)
- `marks` (integer, nullable)
- `alternative_id` (integer, nullable)
- `context_type` (text)
- `context_value` (text)
- `context_label` (text)

**Constraint:** Either `question_id` OR `sub_question_id` must be set (XOR)

#### 5. **question_distractors** (MCQ Distractors)
**Purpose:** Stores incorrect options for MCQ questions

**Key Columns:**
- `id` (uuid, PK)
- `question_id` (uuid, FK, nullable)
- `sub_question_id` (uuid, FK, nullable)
- `option_label` (text: 'A', 'B', 'C', 'D')
- `context_type`, `context_value`, `context_label` (text)

#### 6. **answer_components** (Alternative Answer Components)
**Purpose:** Stores granular answer components with alternative linking

**Key Columns:**
- `id` (uuid, PK)
- `question_id` (uuid, FK, nullable)
- `sub_question_id` (uuid, FK, nullable)
- `alternative_id` (integer)
- `answer_text` (text)
- `marks` (numeric)
- `context_type`, `context_value`, `context_label` (varchar)
- `is_correct` (boolean, default true)

**Note:** This appears to be an advanced structure not yet fully utilized

#### 7. **answer_requirements** (Answer Requirements)
**Purpose:** Stores answer requirement metadata

**Key Columns:**
- `id` (uuid, PK)
- `question_id`, `sub_question_id` (uuid, FK, nullable)
- `requirement_type` (varchar)
- `total_alternatives` (integer)
- `min_required`, `max_required` (integer)

#### 8. **question_options** (MCQ Options)
**Purpose:** Stores MCQ options with correct/incorrect flag

**Key Columns:**
- `id` (uuid, PK)
- `question_id`, `sub_question_id` (uuid, FK)
- `label` (varchar: 'A', 'B', 'C', 'D')
- `text` (text)
- `option_text` (text)
- `image_id` (uuid, nullable)
- `explanation` (text)
- `is_correct` (boolean)
- `order` (integer)
- `context_type`, `context_value`, `context_label` (varchar)

**⚠️ SCHEMA INCONSISTENCY DETECTED:** Both `text` and `option_text` columns exist

#### 9. **questions_attachments** (Attachments)
**Purpose:** Stores file attachments for questions and parts

**Key Columns:**
- `id` (uuid, PK)
- `question_id`, `sub_question_id` (uuid, FK, nullable)
- `file_url` (text)
- `file_name` (text)
- `file_type` (text)
- `file_size` (integer)

#### 10. **past_paper_import_sessions** (Import Tracking)
**Purpose:** Tracks JSON import sessions

**Key Columns:**
- `id` (uuid, PK)
- `json_file_name` (text)
- `raw_json` (jsonb) - **⚠️ CRITICAL: Source of all imported data**
- `json_hash` (text)
- `status` (text: 'in_progress', 'completed', 'failed', 'completed_with_errors')
- `metadata` (jsonb)
- `processed_at` (timestamp)

#### 11. **past_paper_files** (Alternative Storage)
**Purpose:** Alternative file storage for imports

**Key Columns:**
- `id` (uuid, PK)
- `import_session_id` (uuid, FK)
- `file_name` (text)
- `file_content` (jsonb)
- `uploaded_by` (uuid)

#### 12. Supporting Tables
- `question_subtopics` - Many-to-many: questions ↔ subtopics
- `question_confirmations` - QA confirmation audit log
- `paper_status_history` - Paper status change audit
- `context_performance` - Analytics for context-based performance
- `context_mastery_cache` - Student mastery metrics
- `context_difficulty_metrics` - Question difficulty analytics

---

## Phase 2: Data Flow Analysis

### 2.1 JSON Import Flow (Papers Setup)

```
User uploads JSON → past_paper_import_sessions.raw_json
                ↓
         UploadTab validates
                ↓
         StructureTab extracts:
           - exam_board, qualification, subject
           - paper_code, paper_name
           - exam_year, exam_session
           - creates/validates data_structure
                ↓
         MetadataTab creates:
           → papers_setup record
           - paper_code, exam_year, exam_session
           - total_marks, paper_duration
           - status = 'draft'
                ↓
         QuestionsTab imports:
           → questions_master_admin records
           → sub_questions records (for parts)
           → question_correct_answers
           → question_options (MCQ)
           → question_distractors
           → questions_attachments
                ↓
         Status updated to 'completed'
```

**Source File:** `/src/lib/data-operations/questionsDataOperations.ts`
**Functions:**
- `importQuestions()` - Main import orchestrator
- `insertSubQuestion()` - Recursive part insertion
- `uploadAttachments()` - File upload handler

### 2.2 Question Display Flow (Questions Setup)

```
Questions Setup Page loads
        ↓
  Fetches filters:
    - Papers from papers_setup
    - Subjects from edu_subjects
    - Topics from edu_topics
        ↓
  Main query: questions_master_admin
    LEFT JOIN sub_questions
    LEFT JOIN papers_setup
    LEFT JOIN edu_subjects
    LEFT JOIN edu_topics
    LEFT JOIN edu_subtopics
        ↓
  Displays in QuestionCard components
        ↓
  FullPageQuestionReview for details:
    - Fetches question_correct_answers
    - Fetches question_options
    - Fetches questions_attachments
```

**Source Files:**
- `/src/app/system-admin/learning/practice-management/questions-setup/page.tsx`
- `/src/app/system-admin/learning/practice-management/questions-setup/components/QuestionCard.tsx`
- `/src/app/system-admin/learning/practice-management/questions-setup/components/FullPageQuestionReview.tsx`

### 2.3 QA Review Flow

```
Papers Setup → QuestionsTab → QuestionsReviewSection
                                    ↓
                    Displays questions from paper
                           (raw JSON + DB data)
                                    ↓
                         User confirms question
                                    ↓
                    Updates questions_master_admin:
                      - is_confirmed = true
                      - confirmed_at = now()
                      - confirmed_by = user_id
                                    ↓
                    Creates question_confirmations record
                                    ↓
                    Updates paper status when all confirmed
```

---

## Phase 3: Critical Issues Identified

### ⚠️ Issue #1: Dual Source of Truth
**Problem:** Questions data exists in TWO places:
1. `past_paper_import_sessions.raw_json` (original JSON)
2. `questions_master_admin` + related tables (normalized data)

**Impact:**
- QuestionsReviewSection reads from JSON
- Questions Setup page reads from database tables
- Potential for inconsistency if JSON is modified post-import

**Recommendation:** Database should be the single source of truth after import

### ⚠️ Issue #2: Schema Column Duplication
**Table:** `question_options`
**Problem:** Has both `text` AND `option_text` columns

**Code Evidence:**
```typescript
// Line 1282-1284 in questionsDataOperations.ts
option_text: ensureString(option.text || option.option_text) || '',
```

**Impact:** Confusion about which column to use, potential data loss

**Recommendation:** Standardize on one column, migrate data, drop other

### ⚠️ Issue #3: answer_components Table Underutilized
**Problem:** `answer_components` table exists but isn't used in import flow

**Evidence:**
- Table created in migration
- No INSERT operations in `questionsDataOperations.ts`
- Parse functions exist (`parseAnswerComponents()`) but not called during import

**Impact:** Missing advanced answer validation capabilities

**Recommendation:** Either implement fully or remove if not needed

### ⚠️ Issue #4: Inconsistent Answer Storage
**Problem:** Correct answers stored in MULTIPLE ways:
1. `questions_master_admin.correct_answer` (text, simple)
2. `sub_questions.correct_answer` (text, simple)
3. `question_correct_answers` table (structured, multiple)
4. `answer_components` table (unused)

**Impact:**
- Code checks multiple places for answers
- Risk of inconsistency
- Confusion about canonical source

**Recommendation:** Standardize on `question_correct_answers` table only

### ⚠️ Issue #5: Context Metadata Inconsistency
**Problem:** Context stored in different formats:
1. `context_metadata` (jsonb) in main tables
2. `context_type`, `context_value`, `context_label` columns in answer tables

**Impact:** Inconsistent access patterns

### ⚠️ Issue #6: Parent ID NULL Handling
**Problem:** SQL NULL vs JavaScript null/undefined/empty string confusion

**Code Evidence (Lines 1153-1157):**
```typescript
if (parentSubId === null || parentSubId === undefined || parentSubId === '') {
  duplicateQuery = duplicateQuery.is('parent_id', null);
} else {
  duplicateQuery = duplicateQuery.eq('parent_id', parentSubId);
}
```

**Impact:** Potential duplicate records if not handled consistently

### ⚠️ Issue #7: Multiple JSON Parsers
**Problem:** JSON parsing logic in multiple files:
1. UploadTab - Initial validation
2. StructureTab - Academic structure extraction
3. MetadataTab - Paper metadata extraction
4. QuestionsTab - Question data extraction
5. questionsDataOperations.ts - Import logic

**Impact:** Each parser makes different assumptions about JSON structure

**Recommendation:** Create single unified JSON parser

---

## Phase 4: Data Access Patterns

### Pattern 1: Papers Setup - Reading JSON
**Location:** `/papers-setup/tabs/*`
**Source:** `past_paper_import_sessions.raw_json` → sessionData.questions

**Code:**
```typescript
// Reads directly from raw_json
const questions = sessionData?.raw_json?.questions || [];
```

### Pattern 2: Questions Setup - Reading Database
**Location:** `/questions-setup/page.tsx`
**Source:** `questions_master_admin` JOIN multiple tables

**Code:**
```sql
SELECT q.*,
       sq.*,
       p.paper_code,
       s.name as subject_name,
       t.name as topic_name
FROM questions_master_admin q
LEFT JOIN sub_questions sq ON sq.question_id = q.id
LEFT JOIN papers_setup p ON p.id = q.paper_id
-- ...more joins
```

### Pattern 3: Questions Setup - Question Details
**Location:** `FullPageQuestionReview.tsx`
**Sources:**
- `questions_master_admin` (main data)
- `question_correct_answers` (answers)
- `question_options` (MCQ options)
- `questions_attachments` (files)

### Pattern 4: Mock Exam - Question Selection
**Location:** `/mock-exams/components/*`
**Source:** `questions_master_admin` filtered by various criteria

---

## Phase 5: Table Usage Matrix

| Table | Papers Setup | Questions Setup | QA Review | Mock Exam |
|-------|-------------|----------------|-----------|-----------|
| `past_paper_import_sessions` | ✅ READ/WRITE | ❌ | ✅ READ | ❌ |
| `papers_setup` | ✅ READ/WRITE | ✅ READ | ✅ READ/WRITE | ✅ READ |
| `questions_master_admin` | ✅ WRITE | ✅ READ/WRITE | ✅ READ/WRITE | ✅ READ |
| `sub_questions` | ✅ WRITE | ✅ READ/WRITE | ✅ READ/WRITE | ✅ READ |
| `question_correct_answers` | ✅ WRITE | ✅ READ | ✅ READ | ✅ READ |
| `question_options` | ✅ WRITE | ✅ READ | ✅ READ | ✅ READ |
| `question_distractors` | ✅ WRITE | ❌ | ❌ | ❌ |
| `questions_attachments` | ✅ WRITE | ✅ READ | ✅ READ | ❌ |
| `answer_components` | ❌ | ❌ | ❌ | ❌ |
| `answer_requirements` | ❌ | ❌ | ❌ | ❌ |

**⚠️ FINDING:** `answer_components` and `answer_requirements` tables created but NEVER used!

---

## Phase 6: Recommendations

### HIGH PRIORITY

#### 1. **Establish Single Source of Truth**
- After import completes, database is canonical source
- JSON should only be reference for re-import or debugging
- Update QuestionsReviewSection to read from database not JSON

#### 2. **Fix question_options Schema**
```sql
-- Migration needed
ALTER TABLE question_options DROP COLUMN IF EXISTS text;
-- Use option_text consistently
```

#### 3. **Standardize Answer Storage**
- Remove `correct_answer` text columns from main tables
- Use only `question_correct_answers` table
- Update all read queries

#### 4. **Implement or Remove Unused Tables**
Decision needed on:
- `answer_components` - Implement or drop?
- `answer_requirements` - Implement or drop?
- `question_distractors` - Use or merge with question_options?

### MEDIUM PRIORITY

#### 5. **Create Unified JSON Parser**
```typescript
// New file: src/lib/parsers/pastPaperJsonParser.ts
export class PastPaperJsonParser {
  parse(json: any): ParsedPaper { ... }
  validateStructure(): ValidationResult { ... }
  extractMetadata(): PaperMetadata { ... }
  extractQuestions(): Question[] { ... }
}
```

#### 6. **Create Unified Data Service**
```typescript
// New file: src/lib/services/questionDataService.ts
export class QuestionDataService {
  async getQuestion(id: string): Promise<QuestionWithDetails>
  async getQuestionAnswers(id: string): Promise<Answer[]>
  async getQuestionOptions(id: string): Promise<Option[]>
  async updateQuestion(id: string, data: Partial<Question>)
  async confirmQuestion(id: string, userId: string)
}
```

#### 7. **Standardize Context Handling**
- Choose: JSONB `context_metadata` OR separate columns
- Implement consistently across all tables
- Migrate existing data

### LOW PRIORITY

#### 8. **Add Query Performance Indexes**
```sql
CREATE INDEX IF NOT EXISTS idx_questions_paper_status
  ON questions_master_admin(paper_id, status);

CREATE INDEX IF NOT EXISTS idx_sub_questions_question_parent
  ON sub_questions(question_id, parent_id);
```

#### 9. **Implement Proper NULL Handling**
- Document NULL vs empty string usage
- Create helper functions
- Apply consistently

---

## Phase 7: Testing Plan

### Test Case 1: End-to-End Import
1. Upload JSON file
2. Complete all tabs
3. Verify database records match JSON structure
4. Check no duplicate records created
5. Verify all relationships intact

### Test Case 2: Cross-Page Consistency
1. Import questions via Papers Setup
2. View same questions in Questions Setup
3. Verify identical data displayed
4. Confirm questions in both pages

### Test Case 3: QA Review Workflow
1. Start QA on a paper
2. Confirm questions
3. Verify confirmations saved
4. Check status updates correctly

### Test Case 4: Data Integrity
1. Attempt duplicate import
2. Verify detection works
3. Check constraint enforcement
4. Validate foreign key relationships

---

## Next Steps

1. ✅ Complete database schema documentation
2. 🔄 **IN PROGRESS:** Analyze code implementations
3. ⏳ Document all inconsistencies
4. ⏳ Create unified data services
5. ⏳ Implement corrections
6. ⏳ Test end-to-end workflows
7. ⏳ Update documentation

---

**Last Updated:** 2025-10-10
**Next Review:** After code implementation analysis complete
