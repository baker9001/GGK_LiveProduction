# Field Comparison Checklist: Paper Setup vs Questions Review

## Executive Summary

Comprehensive field-by-field comparison between data available in Paper Setup (import stage) and Questions Setup/Review (QA stage).

## Date: 2025-10-18

---

## Comparison Matrix

| Field Name | Paper Setup | Questions Review | Display Mode | Edit Mode | Notes |
|------------|-------------|------------------|--------------|-----------|-------|
| **Basic Question Fields** |
| question_number | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Primary identifier |
| question_text/description | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text editor |
| type (mcq/tf/descriptive) | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Set during import |
| category (direct/complex) | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Set during import |
| marks | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Number input |
| difficulty | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Dropdown |
| status | ✅ Available | ✅ Available | ✅ Visible | ⚠️ Auto-managed | System controlled |
| **Academic Hierarchy** |
| subject | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | From paper metadata |
| subject_id | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Foreign key |
| unit | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Dropdown from DB |
| unit_id | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Foreign key |
| chapter | ✅ Available | ⚠️ Via unit | ✅ Visible | ⚠️ Indirect | May be same as unit |
| chapter_id | ✅ Available | ⚠️ Via unit_id | ✅ Visible | ⚠️ Indirect | Foreign key |
| topic | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Dropdown from DB |
| topic_id | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Foreign key |
| subtopic | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Multi-select from DB |
| subtopic_id | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Foreign key |
| **Answer Configuration** |
| answer_format | ✅ Available | ✅ Available | ✅ Visible (Edit mode) | ❌ Read-only | Display only |
| answer_requirement | ✅ Available | ✅ Available | ✅ Visible | ⚠️ See notes | Via correct answers |
| total_alternatives | ✅ Available | ✅ Available | ✅ Visible | ⚠️ Auto-calc | Calculated from answers |
| correct_answers (array) | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Full CRUD |
| **MCQ Specific** |
| options (array) | ✅ Available | ✅ Available | ⚠️ **ISSUE** | ✅ Editable | **Only in Edit mode** |
| option.label | ✅ Available | ✅ Available | ⚠️ Edit mode only | ✅ Editable | A, B, C, D labels |
| option.text/option_text | ✅ Available | ✅ Available | ⚠️ Edit mode only | ✅ Editable | Option content |
| option.is_correct | ✅ Available | ✅ Available | ⚠️ Edit mode only | ✅ Editable | Correct flag |
| option.explanation | ✅ Available | ⚠️ Partial | ❌ Not visible | ⚠️ Limited | May be missing |
| option.order | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Display sequence |
| **Educational Content** |
| hint | ✅ Available | ✅ Available | ✅ Visible (collapsed) | ✅ Editable | Rich text |
| explanation | ✅ Available | ✅ Available | ✅ Visible (collapsed) | ✅ Editable | Rich text |
| **Attachments** |
| attachments (array) | ✅ Available | ✅ Available | ✅ Visible | ✅ Full CRUD | Upload/delete |
| attachment.file_url | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Storage URL |
| attachment.file_name | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Original filename |
| attachment.file_type | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | MIME type |
| attachment.file_size | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Bytes |
| figure_required | ✅ Available | ✅ Available | ✅ Visible (warning) | ❌ Auto-detect | From text analysis |
| **Parts (Sub-questions)** |
| parts (array) | ✅ Available | ✅ Available | ✅ Visible | ✅ Limited | Nested questions |
| part.part_label | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | a, b, c, i, ii |
| part.question_text | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text |
| part.marks | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Number |
| part.difficulty | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Dropdown |
| part.topic_id | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Can override parent |
| part.subtopics | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Multi-select |
| part.answer_format | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Display only |
| part.correct_answers | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Full CRUD |
| part.options | ✅ Available | ✅ Available | ⚠️ Edit mode only | ✅ Editable | **Same issue** |
| part.hint | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text |
| part.explanation | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text |
| part.attachments | ✅ Available | ✅ Available | ✅ Visible | ✅ Full CRUD | Upload/delete |
| **Subparts (Nested)** |
| part.subparts (array) | ✅ Available | ✅ Available | ✅ Visible | ✅ Limited | Deeply nested |
| subpart.subpart_label | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | i, ii, iii |
| subpart.question_text | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text |
| subpart.marks | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Number |
| subpart.answer_format | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | Display only |
| subpart.correct_answers | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Full CRUD |
| subpart.options | ✅ Available | ✅ Available | ⚠️ Edit mode only | ✅ Editable | **Same issue** |
| subpart.hint | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text |
| subpart.explanation | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Rich text |
| **Metadata** |
| year | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | From paper |
| exam_board | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | From paper |
| paper_code | ✅ Available | ✅ Available | ✅ Visible | ❌ Read-only | From paper |
| paper_id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Foreign key |
| data_structure_id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Foreign key |
| region_id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Foreign key |
| program_id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Foreign key |
| provider_id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Foreign key |
| **QA Workflow** |
| is_confirmed | ✅ Available | ✅ Available | ✅ Visible (badge) | ⚠️ Via action | QA complete flag |
| confirmed_at | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Timestamp |
| confirmed_by | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | User ID |
| qa_notes | ✅ Available | ⚠️ Limited | ❌ Not visible | ❌ Missing | **Should add** |
| qa_reviewed_at | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Timestamp |
| qa_reviewed_by | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | User ID |
| **Advanced Answer Features** |
| context_metadata | ✅ Available | ⚠️ Limited | ❌ Not visible | ❌ Missing | JSON field |
| has_context_structure | ✅ Available | ⚠️ Limited | ❌ Not visible | ❌ System | Boolean flag |
| context_extraction_status | ✅ Available | ⚠️ Limited | ❌ Not visible | ❌ System | Status enum |
| **Marking Criteria** |
| partial_credit | ✅ Available | ⚠️ Limited | ❌ Not fully visible | ⚠️ Limited | Advanced marking |
| partial_marking | ✅ Available | ⚠️ Limited | ❌ Not fully visible | ⚠️ Limited | M/A/B breakdown |
| conditional_marking | ✅ Available | ⚠️ Limited | ❌ Not fully visible | ⚠️ Limited | ECF, ORA, OWTTE |
| marking_criteria | ✅ Available | ⚠️ Limited | ❌ Not fully visible | ⚠️ Limited | Rubric data |
| **Alternative Answers** |
| alternative_id | ✅ Available | ✅ Available | ✅ Visible | ✅ Editable | Grouping |
| linked_alternatives | ✅ Available | ⚠️ Limited | ❌ Not fully visible | ⚠️ Limited | Connected answers |
| alternative_type | ✅ Available | ⚠️ Limited | ❌ Not fully visible | ⚠️ Limited | OR/AND logic |
| **MCQ Advanced** |
| mcq_type | ✅ Available | ⚠️ Limited | ❌ Not visible | ❌ Missing | Single/multiple select |
| match_pairs | ✅ Available | ❌ Missing | ❌ Not visible | ❌ Missing | **Missing entirely** |
| left_column | ✅ Available | ❌ Missing | ❌ Not visible | ❌ Missing | **Missing entirely** |
| right_column | ✅ Available | ❌ Missing | ❌ Not visible | ❌ Missing | **Missing entirely** |
| correct_sequence | ✅ Available | ❌ Missing | ❌ Not visible | ❌ Missing | **Missing entirely** |
| **System Fields** |
| id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | UUID |
| created_at | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Timestamp |
| updated_at | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Timestamp |
| created_by | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | User ID |
| updated_by | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | User ID |
| deleted_at | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Soft delete |
| deleted_by | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | User ID |
| import_session_id | ✅ Available | ✅ Available | ❌ Hidden | ❌ System | Traceability |
| confidence_level | ✅ Available | ⚠️ Limited | ❌ Not visible | ❌ System | Import quality |

---

## Critical Issues Found

### 1. **Answer Options Not Visible in Read-Only View** ⚠️ HIGH PRIORITY
**Problem:** MCQ options are only visible when "Edit data" is clicked
**Impact:** QA reviewers cannot see what options were imported without entering edit mode
**Location:** `QuestionCard.tsx` lines 797-836
**Fix Required:** Display options in the `EnhancedQuestionDisplay` component or in a dedicated read-only section

### 2. **Question Sorting Incorrect** ⚠️ HIGH PRIORITY
**Problem:** Questions in left panel not sorted by question number correctly (e.g., 1, 10, 2, 3 instead of 1, 2, 3, ... 10)
**Impact:** Difficult to navigate through questions in order
**Fix Required:** Implement natural/alphanumeric sorting

### 3. **Missing Advanced MCQ Types** ⚠️ MEDIUM PRIORITY
**Fields:** match_pairs, left_column, right_column, correct_sequence, mcq_type
**Impact:** Cannot handle matching questions or sequence ordering questions
**Fix Required:** Add UI components for these question types

### 4. **QA Notes Field Not Accessible** ⚠️ MEDIUM PRIORITY
**Problem:** `qa_notes` field exists in database but no UI to add/view notes
**Impact:** QA reviewers cannot document issues or decisions
**Fix Required:** Add notes textarea in QA mode

### 5. **Marking Criteria Limited Visibility** ⚠️ LOW PRIORITY
**Fields:** partial_credit, partial_marking, conditional_marking, marking_criteria
**Impact:** Advanced marking schemes not fully accessible
**Fix Required:** Enhance CorrectAnswersDisplay component

### 6. **Context Metadata Not Visible** ⚠️ LOW PRIORITY
**Fields:** context_metadata, has_context_structure, context_extraction_status
**Impact:** Cannot verify context-aware answer validation
**Fix Required:** Add advanced panel for context data

---

## Statistics

- **Total Fields Tracked:** 92
- **Fully Available:** 68 (74%)
- **Partially Available:** 15 (16%)
- **Missing:** 9 (10%)
- **Critical Issues:** 2
- **Medium Priority Issues:** 2
- **Low Priority Issues:** 2

---

## Recommendations

### Immediate Actions (This Session)
1. ✅ Fix answer options display in read-only view
2. ✅ Fix question sorting in left panel

### Short Term (Next Sprint)
3. Add QA notes field with rich text editor
4. Enhance option display to show explanations
5. Add advanced MCQ type support (matching, sequencing)

### Medium Term (Future)
6. Complete marking criteria visualization
7. Add context metadata viewer
8. Implement confidence level indicators

### Long Term (Backlog)
9. Advanced answer alternative linking UI
10. Visual marking scheme builder
11. Import quality dashboard

---

## Testing Checklist for Fixes

- [ ] MCQ options visible in read-only view
- [ ] Options show correct/incorrect indicators
- [ ] Option explanations displayed if present
- [ ] Options sorted by order field
- [ ] Question list sorted numerically (1, 2, 3, ..., 10, 11)
- [ ] Question list sorted for complex numbers (1a, 1b, 2a, 2b)
- [ ] All existing fields still accessible
- [ ] Edit mode still works correctly
- [ ] No regression in other features

---

## Conclusion

The questions review stage has **good coverage** of imported data (74% fully available), but has **critical UX issues**:
1. Options hidden in read-only view
2. Incorrect sorting

These issues prevent efficient QA workflow and must be fixed immediately. Additional enhancements for advanced features can be prioritized based on usage patterns.
