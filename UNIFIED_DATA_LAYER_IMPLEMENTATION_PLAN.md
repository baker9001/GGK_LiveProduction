# Unified Data Layer Implementation Plan
## Complete System Refactoring for Paper & Questions Workflow

**Date:** 2025-10-10
**Author:** System Analysis Team
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH

---

## Executive Summary

After comprehensive analysis of the paper setup and questions workflow, we've identified **7 critical issues** and **15 inconsistencies** that prevent data uniformity across the system. This document provides a complete implementation plan to create a unified data layer ensuring all pages read and write from the same sources with consistent understanding.

---

## 🚨 Critical Findings

### 1. **Dual Source of Truth Problem**
**Current State:**
- Papers Setup reads from: `past_paper_import_sessions.raw_json`
- Questions Setup reads from: `questions_master_admin` + related tables
- QA Review reads from: BOTH sources intermittently

**Impact:** HIGH
**Risk:** Data inconsistency, confusion, potential data loss

**Root Cause:**
```typescript
// Papers Setup - QuestionsReviewSection.tsx
const questions = sessionData?.raw_json?.questions || [];

// Questions Setup - page.tsx
const query = supabase
  .from('questions_master_admin')
  .select('...')
```

### 2. **Schema Inconsistencies**
**Table:** `question_options`
- Has BOTH `text` AND `option_text` columns
- Code randomly uses either one
- Risk of data being split across both fields

**Table:** `questions_master_admin` & `sub_questions`
- Both have `correct_answer` (text) column
- PLUS separate `question_correct_answers` table
- Three different places for the same data!

### 3. **Unused Tables**
- `answer_components` - Created but NEVER used in any workflow
- `answer_requirements` - Created but NEVER used in any workflow
- `question_distractors` - Only used in import, never read

### 4. **Inconsistent Context Handling**
**Four Different Patterns:**
1. `context_metadata` (jsonb) in main tables
2. `context_type`, `context_value`, `context_label` columns in answer tables
3. Mixed usage throughout codebase
4. No clear standard

### 5. **Multiple JSON Parsers**
**Different interpretations in:**
1. UploadTab.tsx
2. StructureTab.tsx
3. MetadataTab.tsx
4. QuestionsTab.tsx
5. questionsDataOperations.ts

Each makes different assumptions about JSON structure!

### 6. **Foreign Key Confusion**
**NULL vs undefined vs empty string:**
```typescript
// Three different patterns found:
if (parentSubId === null) { ... }
if (!parentSubId) { ... }
if (parentSubId === null || parentSubId === undefined || parentSubId === '') { ... }
```

Risk of duplicate records and broken relationships.

### 7. **No Data Validation Layer**
- Import inserts directly to database
- Questions Setup updates directly
- No centralized validation
- No type safety beyond TypeScript interfaces

---

## 📊 Complete Data Flow Analysis

### Current Fragmented Flow

```
JSON Upload
    ↓
past_paper_import_sessions.raw_json (Source 1)
    ↓
[Papers Setup reads from here]
    ↓
Import to Database → questions_master_admin (Source 2)
                  → sub_questions
                  → question_correct_answers
                  → question_options
    ↓
[Questions Setup reads from here]
    ↓
[INCONSISTENCY: Two different sources for same data!]
```

### Proposed Unified Flow

```
JSON Upload
    ↓
Unified JSON Parser
    ↓
Validation Layer
    ↓
Unified Data Service
    ↓
Database (Single Source of Truth)
    ↓
All Pages Read Through Data Service
    ↓
[CONSISTENCY: One source, one understanding]
```

---

## 🎯 Implementation Plan

### Phase 1: Schema Cleanup & Standardization

#### Task 1.1: Fix question_options Table
```sql
-- Migration: 001_standardize_question_options.sql

-- Step 1: Merge data from 'text' to 'option_text'
UPDATE question_options
SET option_text = COALESCE(option_text, text)
WHERE option_text IS NULL OR option_text = '';

-- Step 2: Drop redundant column
ALTER TABLE question_options DROP COLUMN IF EXISTS text;

-- Step 3: Add NOT NULL constraint
ALTER TABLE question_options
ALTER COLUMN option_text SET NOT NULL;
```

#### Task 1.2: Standardize Answer Storage
```sql
-- Migration: 002_standardize_answer_storage.sql

-- Step 1: Migrate simple answers to structured table
INSERT INTO question_correct_answers (question_id, answer, marks)
SELECT id, correct_answer, marks
FROM questions_master_admin
WHERE correct_answer IS NOT NULL
  AND id NOT IN (SELECT DISTINCT question_id FROM question_correct_answers WHERE question_id IS NOT NULL);

INSERT INTO question_correct_answers (sub_question_id, answer, marks)
SELECT id, correct_answer, marks
FROM sub_questions
WHERE correct_answer IS NOT NULL
  AND id NOT IN (SELECT DISTINCT sub_question_id FROM question_correct_answers WHERE sub_question_id IS NOT NULL);

-- Step 2: Drop redundant columns (after verification)
-- ALTER TABLE questions_master_admin DROP COLUMN correct_answer;
-- ALTER TABLE sub_questions DROP COLUMN correct_answer;
-- NOTE: Keep for now as fallback, mark as deprecated
```

#### Task 1.3: Context Standardization Decision
**DECISION NEEDED:** Choose ONE approach:

**Option A: Use JSONB context_metadata**
```sql
-- Migrate column-based context to JSONB
UPDATE question_correct_answers
SET context_metadata = jsonb_build_object(
  'type', context_type,
  'value', context_value,
  'label', context_label
)
WHERE context_type IS NOT NULL;

-- Drop individual columns
ALTER TABLE question_correct_answers
  DROP COLUMN context_type,
  DROP COLUMN context_value,
  DROP COLUMN context_label;
```

**Option B: Use Individual Columns**
```sql
-- Migrate JSONB to columns
UPDATE questions_master_admin
SET
  context_type = (context_metadata->>'type'),
  context_value = (context_metadata->>'value'),
  context_label = (context_metadata->>'label')
WHERE context_metadata IS NOT NULL;

-- Drop JSONB column
ALTER TABLE questions_master_admin DROP COLUMN context_metadata;
```

**RECOMMENDATION:** **Option A (JSONB)** - More flexible, future-proof, better for complex contexts

#### Task 1.4: Drop or Implement Unused Tables
**DECISION NEEDED:**

**Option 1: Drop Unused Tables**
```sql
DROP TABLE IF EXISTS answer_components CASCADE;
DROP TABLE IF EXISTS answer_requirements CASCADE;
```

**Option 2: Implement Properly**
- Requires significant development effort
- Add to import workflow
- Add to display workflow
- Update all queries

**RECOMMENDATION:** **Drop** unless there's a specific future need. Can recreate if needed.

#### Task 1.5: Add Missing Indexes
```sql
-- Migration: 003_add_performance_indexes.sql

-- Questions indexes
CREATE INDEX IF NOT EXISTS idx_questions_paper_status
  ON questions_master_admin(paper_id, status);

CREATE INDEX IF NOT EXISTS idx_questions_paper_number
  ON questions_master_admin(paper_id, question_number);

CREATE INDEX IF NOT EXISTS idx_questions_topic
  ON questions_master_admin(topic_id) WHERE topic_id IS NOT NULL;

-- Sub-questions indexes
CREATE INDEX IF NOT EXISTS idx_sub_questions_question_parent
  ON sub_questions(question_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_sub_questions_question_order
  ON sub_questions(question_id, order_index);

-- Answers indexes
CREATE INDEX IF NOT EXISTS idx_correct_answers_question
  ON question_correct_answers(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_correct_answers_sub
  ON question_correct_answers(sub_question_id) WHERE sub_question_id IS NOT NULL;

-- Options indexes
CREATE INDEX IF NOT EXISTS idx_options_question
  ON question_options(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_options_sub
  ON question_options(sub_question_id) WHERE sub_question_id IS NOT NULL;
```

---

### Phase 2: Create Unified JSON Parser

#### Task 2.1: Implement Unified Parser
**File:** `src/lib/parsers/PastPaperJsonParser.ts`

```typescript
/**
 * Unified JSON Parser for Past Paper Imports
 * Single source of truth for JSON structure interpretation
 */

import { z } from 'zod';

// Define strict schemas
const PaperMetadataSchema = z.object({
  exam_board: z.string(),
  qualification: z.string(),
  subject: z.string(),
  paper_code: z.string(),
  paper_name: z.string(),
  exam_year: z.number(),
  exam_session: z.string(),
  paper_duration: z.string().optional(),
  total_marks: z.number()
});

const ContextSchema = z.object({
  type: z.string(),
  value: z.string(),
  label: z.string().optional()
});

const CorrectAnswerSchema = z.object({
  answer: z.string(),
  marks: z.number().optional(),
  alternative_id: z.number().optional(),
  context: ContextSchema.optional()
});

const QuestionOptionSchema = z.object({
  label: z.string(),
  text: z.string(),
  is_correct: z.boolean().optional()
});

const QuestionPartSchema = z.object({
  part: z.string().optional(),
  subpart: z.string().optional(),
  question_text: z.string().optional(),
  question_description: z.string().optional(),
  marks: z.number(),
  type: z.string(),
  difficulty: z.string().optional(),
  correct_answers: z.array(CorrectAnswerSchema).optional(),
  options: z.array(QuestionOptionSchema).optional(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  parts: z.array(z.any()).optional(), // Recursive
  subparts: z.array(z.any()).optional() // Recursive
});

const QuestionSchema = z.object({
  id: z.string().optional(),
  question_number: z.union([z.string(), z.number()]),
  question_description: z.string().optional(),
  question_text: z.string().optional(),
  question_header: z.string().optional(),
  type: z.string(),
  marks: z.number().optional(),
  total_marks: z.number().optional(),
  difficulty: z.string().optional(),
  figure: z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
  correct_answers: z.array(CorrectAnswerSchema).optional(),
  correct_answer: z.string().optional(),
  options: z.array(QuestionOptionSchema).optional(),
  parts: z.array(QuestionPartSchema).optional(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  unit: z.string().optional(),
  topics: z.array(z.string()).optional(),
  subtopics: z.array(z.string()).optional()
});

const PastPaperJsonSchema = z.object({
  ...PaperMetadataSchema.shape,
  questions: z.array(QuestionSchema)
});

export type ParsedPaper = z.infer<typeof PastPaperJsonSchema>;
export type ParsedQuestion = z.infer<typeof QuestionSchema>;
export type ParsedQuestionPart = z.infer<typeof QuestionPartSchema>;

export class PastPaperJsonParser {
  /**
   * Parse and validate JSON file
   */
  parse(rawJson: any): ParsedPaper {
    try {
      return PastPaperJsonSchema.parse(rawJson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`JSON validation failed: ${this.formatZodError(error)}`);
      }
      throw error;
    }
  }

  /**
   * Validate JSON structure without parsing
   */
  validate(rawJson: any): { valid: boolean; errors: string[] } {
    const result = PastPaperJsonSchema.safeParse(rawJson);
    if (result.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: this.formatZodError(result.error).split('\n')
    };
  }

  /**
   * Extract paper metadata only
   */
  extractMetadata(rawJson: any): z.infer<typeof PaperMetadataSchema> {
    return PaperMetadataSchema.parse(rawJson);
  }

  /**
   * Extract questions only
   */
  extractQuestions(rawJson: any): ParsedQuestion[] {
    const parsed = this.parse(rawJson);
    return parsed.questions;
  }

  /**
   * Format Zod errors for display
   */
  private formatZodError(error: z.ZodError): string {
    return error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
  }

  /**
   * Normalize question for database insertion
   */
  normalizeQuestion(question: ParsedQuestion): NormalizedQuestion {
    return {
      question_number: String(question.question_number),
      question_description: question.question_description || question.question_text || '',
      question_header: question.question_header || null,
      type: question.type,
      marks: question.marks || question.total_marks || 0,
      difficulty: question.difficulty || 'Medium',
      has_figure: question.figure || false,
      hint: question.hint || null,
      explanation: question.explanation || null,
      correct_answers: question.correct_answers || [],
      options: question.options || [],
      parts: question.parts || []
    };
  }
}

interface NormalizedQuestion {
  question_number: string;
  question_description: string;
  question_header: string | null;
  type: string;
  marks: number;
  difficulty: string;
  has_figure: boolean;
  hint: string | null;
  explanation: string | null;
  correct_answers: any[];
  options: any[];
  parts: any[];
}

// Export singleton instance
export const pastPaperJsonParser = new PastPaperJsonParser();
```

---

### Phase 3: Create Unified Data Service

#### Task 3.1: Implement Question Data Service
**File:** `src/lib/services/QuestionDataService.ts`

```typescript
/**
 * Unified Question Data Service
 * Single source for all question-related database operations
 */

import { supabase } from '../supabase';

export interface QuestionDetails {
  id: string;
  paper_id: string;
  question_number: string;
  question_description: string;
  type: string;
  marks: number;
  difficulty: string;
  hint?: string;
  explanation?: string;
  status: string;
  // Relations
  paper?: any;
  topic?: any;
  subtopics?: any[];
  correct_answers?: any[];
  options?: any[];
  parts?: any[];
  attachments?: any[];
}

export class QuestionDataService {
  /**
   * Get question with all related data
   */
  async getQuestion(questionId: string): Promise<QuestionDetails | null> {
    const { data, error } = await supabase
      .from('questions_master_admin')
      .select(`
        *,
        papers_setup(id, paper_code, subject_id, provider_id),
        edu_topics(id, name),
        question_correct_answers(*),
        question_options(*, order),
        sub_questions(*),
        questions_attachments(*),
        question_subtopics(
          edu_subtopics(id, name)
        )
      `)
      .eq('id', questionId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get questions for a paper
   */
  async getQuestionsByPaper(paperId: string): Promise<QuestionDetails[]> {
    const { data, error } = await supabase
      .from('questions_master_admin')
      .select(`
        *,
        edu_topics(id, name),
        question_correct_answers(*),
        question_options(*),
        sub_questions(*),
        questions_attachments(*),
        question_subtopics(
          edu_subtopics(id, name)
        )
      `)
      .eq('paper_id', paperId)
      .order('question_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get correct answers for question
   */
  async getQuestionAnswers(questionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('question_correct_answers')
      .select('*')
      .eq('question_id', questionId)
      .order('alternative_id', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get options for MCQ question
   */
  async getQuestionOptions(questionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('question_options')
      .select('*')
      .eq('question_id', questionId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update question
   */
  async updateQuestion(questionId: string, updates: Partial<QuestionDetails>): Promise<void> {
    const { error } = await supabase
      .from('questions_master_admin')
      .update(updates)
      .eq('id', questionId);

    if (error) throw error;
  }

  /**
   * Confirm question (QA)
   */
  async confirmQuestion(questionId: string, userId: string, notes?: string): Promise<void> {
    // Update question
    const { error: updateError } = await supabase
      .from('questions_master_admin')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: userId,
        qa_notes: notes
      })
      .eq('id', questionId);

    if (updateError) throw updateError;

    // Log confirmation
    const { error: logError } = await supabase
      .from('question_confirmations')
      .insert({
        question_id: questionId,
        action: 'confirmed',
        performed_by: userId,
        performed_at: new Date().toISOString(),
        notes
      });

    if (logError) throw logError;
  }

  /**
   * Check if question exists
   */
  async questionExists(paperId: string, questionNumber: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('questions_master_admin')
      .select('id')
      .eq('paper_id', paperId)
      .eq('question_number', questionNumber)
      .maybeSingle();

    if (error) throw error;
    return data !== null;
  }
}

// Export singleton instance
export const questionDataService = new QuestionDataService();
```

#### Task 3.2: Implement Paper Data Service
**File:** `src/lib/services/PaperDataService.ts`

```typescript
/**
 * Unified Paper Data Service
 */

import { supabase } from '../supabase';

export class PaperDataService {
  async getPaper(paperId: string) {
    const { data, error } = await supabase
      .from('papers_setup')
      .select(`
        *,
        data_structures(
          *,
          regions(id, name),
          programs(id, name),
          providers(id, name),
          edu_subjects(id, name, code)
        )
      `)
      .eq('id', paperId)
      .single();

    if (error) throw error;
    return data;
  }

  async createPaper(paperData: any) {
    const { data, error } = await supabase
      .from('papers_setup')
      .insert(paperData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePaperStatus(paperId: string, status: string, userId: string) {
    const { error } = await supabase
      .from('papers_setup')
      .update({
        status,
        last_status_change_at: new Date().toISOString(),
        last_status_change_by: userId
      })
      .eq('id', paperId);

    if (error) throw error;

    // Log status change
    await supabase
      .from('paper_status_history')
      .insert({
        paper_id: paperId,
        new_status: status,
        changed_by: userId,
        changed_at: new Date().toISOString()
      });
  }

  async getPaperProgress(paperId: string) {
    const { data, error } = await supabase
      .rpc('get_paper_qa_progress', { paper_id: paperId });

    if (error) throw error;
    return data;
  }
}

export const paperDataService = new PaperDataService();
```

---

### Phase 4: Refactor Existing Code

#### Task 4.1: Update Papers Setup to Use Database as Source
**File:** `src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx`

**BEFORE:**
```typescript
const questions = sessionData?.raw_json?.questions || [];
```

**AFTER:**
```typescript
import { questionDataService } from '@/lib/services/QuestionDataService';

const questions = await questionDataService.getQuestionsByPaper(paperId);
```

#### Task 4.2: Update QuestionsReviewSection
**File:** `src/app/system-admin/learning/practice-management/papers-setup/tabs/components/QuestionsReviewSection.tsx`

**BEFORE:**
```typescript
// Reads from raw JSON
const questionData = sessionData.raw_json.questions.find(q => q.question_number === questionNumber);
```

**AFTER:**
```typescript
import { questionDataService } from '@/lib/services/QuestionDataService';

const questionData = await questionDataService.getQuestion(questionId);
```

#### Task 4.3: Standardize All Imports
**Replace throughout codebase:**

```typescript
// OLD PATTERN
import { importQuestions } from '@/lib/data-operations/questionsDataOperations';

// NEW PATTERN
import { pastPaperJsonParser } from '@/lib/parsers/PastPaperJsonParser';
import { questionDataService } from '@/lib/services/QuestionDataService';
import { paperDataService } from '@/lib/services/PaperDataService';
```

---

### Phase 5: Testing & Validation

#### Task 5.1: Create Integration Tests
**File:** `src/tests/integration/paperImport.test.ts`

```typescript
describe('Paper Import Workflow', () => {
  it('should import paper and questions correctly', async () => {
    // Test JSON parsing
    const parsed = pastPaperJsonParser.parse(testJson);
    expect(parsed).toBeDefined();

    // Test database insertion
    const paper = await paperDataService.createPaper(paperData);
    expect(paper.id).toBeDefined();

    // Test question retrieval
    const questions = await questionDataService.getQuestionsByPaper(paper.id);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should maintain data consistency across pages', async () => {
    // Import via Papers Setup
    const imported = await importQuestions(...);

    // Fetch via Questions Setup
    const fetched = await questionDataService.getQuestion(imported[0].id);

    // Verify data matches
    expect(fetched.question_description).toBe(imported[0].question_description);
    expect(fetched.marks).toBe(imported[0].marks);
  });
});
```

#### Task 5.2: Create Data Validation Tests
```typescript
describe('Data Validation', () => {
  it('should reject invalid JSON structure', () => {
    expect(() => pastPaperJsonParser.parse(invalidJson)).toThrow();
  });

  it('should prevent duplicate question insertion', async () => {
    const exists = await questionDataService.questionExists(paperId, 1);
    expect(exists).toBe(true);

    // Attempt duplicate import should fail
    await expect(importDuplicate()).rejects.toThrow();
  });
});
```

---

## 🎯 Implementation Timeline

### Week 1: Schema Cleanup
- [ ] Day 1-2: Create and test migration scripts
- [ ] Day 3: Run migrations on development database
- [ ] Day 4: Verify data integrity post-migration
- [ ] Day 5: Update TypeScript types

### Week 2: Unified Services
- [ ] Day 1-2: Implement PastPaperJsonParser
- [ ] Day 3-4: Implement QuestionDataService
- [ ] Day 5: Implement PaperDataService

### Week 3: Code Refactoring
- [ ] Day 1-2: Update Papers Setup workflow
- [ ] Day 3: Update Questions Setup workflow
- [ ] Day 4: Update QA Review workflow
- [ ] Day 5: Update Mock Exam workflow

### Week 4: Testing & Documentation
- [ ] Day 1-2: Write and run integration tests
- [ ] Day 3: Fix identified issues
- [ ] Day 4: Update documentation
- [ ] Day 5: Code review and deployment prep

---

## ✅ Success Criteria

### Data Consistency
- [ ] All pages read from database tables (not JSON)
- [ ] Single source of truth for all data
- [ ] No schema inconsistencies
- [ ] No unused tables/columns

### Code Quality
- [ ] Single unified JSON parser
- [ ] Centralized data services
- [ ] Type-safe operations
- [ ] Comprehensive error handling

### Performance
- [ ] All indexes in place
- [ ] Query performance optimized
- [ ] No N+1 query problems

### Testing
- [ ] 100% of critical paths tested
- [ ] Integration tests passing
- [ ] Data validation tests passing

---

## 📝 Migration Checklist

Before deploying to production:

- [ ] Backup entire database
- [ ] Test migrations on staging
- [ ] Verify data integrity
- [ ] Test all workflows end-to-end
- [ ] Update API documentation
- [ ] Train team on new data services
- [ ] Monitor first week of production use

---

## 🚀 Quick Start for Developers

### To use the new unified system:

```typescript
// 1. Parse JSON file
import { pastPaperJsonParser } from '@/lib/parsers/PastPaperJsonParser';
const parsed = pastPaperJsonParser.parse(rawJson);

// 2. Create paper
import { paperDataService } from '@/lib/services/PaperDataService';
const paper = await paperDataService.createPaper(paperData);

// 3. Import questions
import { questionDataService } from '@/lib/services/QuestionDataService';
const questions = await questionDataService.importQuestions(parsed.questions, paper.id);

// 4. Fetch questions
const allQuestions = await questionDataService.getQuestionsByPaper(paper.id);

// 5. Update question
await questionDataService.updateQuestion(questionId, { marks: 10 });

// 6. Confirm question (QA)
await questionDataService.confirmQuestion(questionId, userId, 'Verified correct');
```

---

## 📞 Support & Questions

For implementation questions, contact the development team.
For schema questions, refer to `PAPER_QUESTIONS_SYSTEM_ANALYSIS.md`

---

**Last Updated:** 2025-10-10
**Next Review:** After Phase 1 completion
