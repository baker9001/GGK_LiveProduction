// src/app/system-admin/learning/practice-management/papers-setup/page.tsx

/**
 * Past Papers Import Wizard Component
 * 
 * Required Supabase table schema for 'past_paper_import_sessions':
 * - id: uuid (primary key, auto-generated)
 * - json_file_name: text
 * - raw_json: jsonb
 * - status: text (values: 'in_progress', 'completed', 'failed')
 * - created_at: timestamp (auto-generated)
 * - metadata: jsonb (stores structure_complete, academic_structure, etc.)
 * - updated_at: timestamp (nullable)
 * - json_hash: text (for duplicate detection)
 * 
 * Optional columns you can add for enhanced functionality:
 * - created_by: uuid (foreign key to users table)
 * - file_size: bigint
 * - paper_id: uuid (nullable, foreign key to papers_setup)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { supabase } from '../../../../../lib/supabase';
import { toast } from '../../../../../components/shared/Toast';
import { useUser } from '../../../../../contexts/UserContext';
import {
  Loader2, AlertCircle, FileJson, Database,
  FileText, ClipboardList, Shield, Settings, Info, ChevronDown
} from 'lucide-react';
import { ScrollNavigator } from '../../../../../components/shared/ScrollNavigator';
import { Button } from '../../../../../components/shared/Button';
import { cn } from '../../../../../lib/utils';
import { ExtractionRules, JsonGuidelineSummary } from './types';
import { JsonGuidelineChecklist } from './components/JsonGuidelineChecklist';

// Import tab components
import { UploadTab } from './tabs/UploadTab';
import StructureTab from './tabs/StructureTab';
import { MetadataTab } from './tabs/MetadataTab';
import { QuestionsTab } from './tabs/QuestionsTab';
import { PreviousSessionsTable } from './components/PreviousSessionsTable';
import { transformImportedPaper } from '../../../../../lib/extraction/jsonTransformer';

// Define the tabs for the import workflow
const IMPORT_TABS = [
  { id: 'upload', label: 'Upload JSON', icon: FileJson },
  { id: 'structure', label: 'Academic Structure', icon: Database },
  { id: 'metadata', label: 'Paper Metadata', icon: FileText },
  { id: 'questions', label: 'Questions Review & Import', icon: ClipboardList },
];

// Define the possible tab statuses
type TabStatus = 'pending' | 'completed' | 'error' | 'active';

// Extraction Rules Configuration Component
const ExtractionRulesPanel: React.FC<{
  rules: ExtractionRules;
  onChange: (rules: ExtractionRules) => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ rules, onChange, isExpanded, onToggle }) => {
  const handleFieldChange = (field: string, value: any) => {
    const fieldParts = field.split('.');
    if (fieldParts.length === 1) {
      onChange({ ...rules, [field]: value });
    } else {
      const newRules = { ...rules };
      let current: any = newRules;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current = current[fieldParts[i]];
      }
      current[fieldParts[fieldParts.length - 1]] = value;
      onChange(newRules);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <Button
        variant="secondary"
        size="lg"
        className="w-full justify-between px-6 py-4 h-auto text-left"
        onClick={onToggle}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Extraction Rules Configuration
            </h3>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-gray-500 transition-transform",
              isExpanded && "transform rotate-180"
            )}
          />
        </div>
      </Button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Core Extraction Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Core Extraction Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.forwardSlashHandling}
                  onChange={(e) => handleFieldChange('forwardSlashHandling', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Handle forward slash variations
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.lineByLineProcessing}
                  onChange={(e) => handleFieldChange('lineByLineProcessing', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Process line by line
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.alternativeLinking}
                  onChange={(e) => handleFieldChange('alternativeLinking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Link answer alternatives
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.contextRequired}
                  onChange={(e) => handleFieldChange('contextRequired', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require answer context
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.figureDetection}
                  onChange={(e) => handleFieldChange('figureDetection', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Detect figures and attachments
                </span>
              </label>
            </div>
          </div>

          {/* Educational Content */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Educational Content
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.educationalContent.hintsRequired}
                  onChange={(e) => handleFieldChange('educationalContent.hintsRequired', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Extract hints
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.educationalContent.explanationsRequired}
                  onChange={(e) => handleFieldChange('educationalContent.explanationsRequired', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Extract explanations
                </span>
              </label>
            </div>
          </div>

          {/* Subject-Specific Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Subject-Specific Rules
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.physics}
                  onChange={(e) => handleFieldChange('subjectSpecific.physics', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Physics</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.chemistry}
                  onChange={(e) => handleFieldChange('subjectSpecific.chemistry', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Chemistry</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.biology}
                  onChange={(e) => handleFieldChange('subjectSpecific.biology', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Biology</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.mathematics}
                  onChange={(e) => handleFieldChange('subjectSpecific.mathematics', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mathematics</span>
              </label>
            </div>
          </div>

          {/* Answer Format Abbreviations */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Answer Format Abbreviations
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.ora}
                  onChange={(e) => handleFieldChange('abbreviations.ora', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  ORA (or reverse argument)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.owtte}
                  onChange={(e) => handleFieldChange('abbreviations.owtte', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  OWTTE (or words to that effect)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.ecf}
                  onChange={(e) => handleFieldChange('abbreviations.ecf', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  ECF (error carried forward)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.cao}
                  onChange={(e) => handleFieldChange('abbreviations.cao', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  CAO (correct answer only)
                </span>
              </label>
            </div>
          </div>

          {/* Answer Structure Validation */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Answer Structure Validation
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.validateMarks}
                  onChange={(e) => handleFieldChange('answerStructure.validateMarks', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Validate mark allocation
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.requireContext}
                  onChange={(e) => handleFieldChange('answerStructure.requireContext', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require answer context
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.validateLinking}
                  onChange={(e) => handleFieldChange('answerStructure.validateLinking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Validate alternative linking
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.acceptAlternatives}
                  onChange={(e) => handleFieldChange('answerStructure.acceptAlternatives', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Accept answer alternatives
                </span>
              </label>
            </div>
          </div>

          {/* Mark Scheme Processing */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Mark Scheme Processing
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.requiresManualMarking}
                  onChange={(e) => handleFieldChange('markScheme.requiresManualMarking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Identify manual marking requirements
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.markingCriteria}
                  onChange={(e) => handleFieldChange('markScheme.markingCriteria', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Extract marking criteria
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.componentMarking}
                  onChange={(e) => handleFieldChange('markScheme.componentMarking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable component marking
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.levelDescriptors}
                  onChange={(e) => handleFieldChange('markScheme.levelDescriptors', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Use level descriptors
                </span>
              </label>
            </div>
          </div>

          {/* Exam Board Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Exam Board
            </h4>
            <select
              value={rules.examBoard}
              onChange={(e) => handleFieldChange('examBoard', e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="Cambridge">Cambridge</option>
              <option value="Edexcel">Edexcel</option>
              <option value="Both">Both Boards</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

const MANUAL_MARKING_FORMATS = new Set([
  'diagram',
  'chemical_structure',
  'structural_diagram',
  'table',
  'graph',
  'multi_line',
  'multi_line_labeled',
  'file_upload',
  'audio',
  'code'
]);

const ABBREVIATION_LABELS: Record<'owtte' | 'ora' | 'ecf' | 'cao', string> = {
  owtte: 'OWTTE',
  ora: 'ORA',
  ecf: 'ECF',
  cao: 'CAO'
};

const hasWordBoundaryMatch = (value: string, token: string) => {
  if (!value) return false;
  const regex = new RegExp(`\\b${token}\\b`, 'i');
  return regex.test(value);
};

const analyzeParsedDataForGuidelines = (data: any): JsonGuidelineSummary => {
  const questions = Array.isArray(data?.questions) ? data.questions : [];

  const questionTypes = new Set<string>();
  const answerFormats = new Set<string>();
  const answerRequirements = new Set<string>();
  const subjects = new Set<string>();
  const variationSignals = new Set<string>();
  const abbreviationsDetected = new Set<string>();
  const contextTypes = new Set<string>();

  let usesForwardSlash = false;
  let usesLineByLineMarking = false;
  let usesAlternativeLinking = false;
  let includesContextualAnswers = false;
  let includesFigures = false;
  let includesAttachments = false;
  let includesHints = false;
  let includesExplanations = false;
  let requiresManualMarking = false;
  let hasComponentMarking = false;
  let hasMultiMarkAllocations = false;
  let partialCreditDetected = false;

  const addVariationSignal = (label: string) => {
    if (label) {
      variationSignals.add(label);
    }
  };

  const markAbbreviation = (key: keyof typeof ABBREVIATION_LABELS) => {
    abbreviationsDetected.add(ABBREVIATION_LABELS[key]);
  };

  const recordAnswer = (answer: any) => {
    if (!answer) return;
    const rawAnswer = String(answer.answer ?? '');
    const normalizedText = rawAnswer.toLowerCase();
    if (rawAnswer.includes('/')) {
      usesForwardSlash = true;
    }
    if (normalizedText.includes(' or ') || normalizedText.includes(' and ')) {
      usesAlternativeLinking = true;
    }
    if (typeof answer.total_alternatives === 'number' && answer.total_alternatives > 1) {
      usesAlternativeLinking = true;
    }
    if (Array.isArray(answer.linked_alternatives) && answer.linked_alternatives.length > 0) {
      usesAlternativeLinking = true;
    }
    if (typeof answer.alternative_type === 'string') {
      const normalized = answer.alternative_type.toLowerCase();
      if (normalized.includes('one') || normalized.includes('any') || normalized.includes('all') || normalized.includes('both')) {
        usesAlternativeLinking = true;
      }
    }
    if (answer.context) {
      includesContextualAnswers = true;
      if (Array.isArray(answer.context)) {
        answer.context.forEach((contextItem: any) => {
          if (contextItem?.type) {
            contextTypes.add(String(contextItem.type));
          }
        });
      } else if (answer.context.type) {
        contextTypes.add(String(answer.context.type));
      } else {
        contextTypes.add('context');
      }
    }
    if (answer.unit) {
      includesContextualAnswers = true;
      contextTypes.add('unit');
    }
    if (answer.measurement_details) {
      includesContextualAnswers = true;
      contextTypes.add('measurement');
    }
    if (answer.context_type) {
      includesContextualAnswers = true;
      contextTypes.add(String(answer.context_type));
    }
    if (answer.line_number !== undefined || answer.marking_point !== undefined) {
      usesLineByLineMarking = true;
    }
    if (Array.isArray(answer.marking_points) && answer.marking_points.length > 0) {
      usesLineByLineMarking = true;
    }
    if (
      answer.accepts_equivalent_phrasing ||
      answer.accepts_equivalent ||
      normalizedText.includes('owtte')
    ) {
      addVariationSignal('Equivalent phrasing allowed');
      markAbbreviation('owtte');
    }
    if (
      answer.accepts_reverse_argument ||
      normalizedText.includes('reverse argument') ||
      hasWordBoundaryMatch(rawAnswer, 'ora')
    ) {
      addVariationSignal('Reverse argument accepted');
      markAbbreviation('ora');
    }
    if (
      answer.error_carried_forward ||
      normalizedText.includes('error carried forward') ||
      hasWordBoundaryMatch(rawAnswer, 'ecf')
    ) {
      addVariationSignal('Error carried forward supported');
      markAbbreviation('ecf');
    }
    if (typeof answer.accept_level === 'string' && answer.accept_level.toLowerCase().includes('cao')) {
      addVariationSignal('Correct answer only (CAO)');
      markAbbreviation('cao');
    }
    if (
      normalizedText.includes('(cao') ||
      normalizedText.includes(' cao ') ||
      normalizedText.endsWith(' cao') ||
      normalizedText.startsWith('cao ') ||
      normalizedText.includes('cao only')
    ) {
      markAbbreviation('cao');
    }
    if (answer.conditional_on || answer.conditions || answer.marking_conditions) {
      addVariationSignal('Conditional marking rules present');
    }
    if (Array.isArray(answer.rejected_answers) && answer.rejected_answers.length > 0) {
      addVariationSignal('Reject list provided');
    }
    if (Array.isArray(answer.ignored_content) && answer.ignored_content.length > 0) {
      addVariationSignal('Ignore list provided');
    }
    if (answer.answer_variations && Object.keys(answer.answer_variations).length > 0) {
      addVariationSignal('Documented answer variations');
    }
    if (answer.marking_flags) {
      const flags = answer.marking_flags;
      if (flags.accepts_equivalent_phrasing || flags.owtte) {
        addVariationSignal('Equivalent phrasing allowed');
        markAbbreviation('owtte');
      }
      if (flags.accepts_reverse_argument || flags.ora) {
        addVariationSignal('Reverse argument accepted');
        markAbbreviation('ora');
      }
      if (flags.error_carried_forward || flags.ecf) {
        addVariationSignal('Error carried forward supported');
        markAbbreviation('ecf');
      }
      if (flags.correct_answer_only || flags.cao) {
        addVariationSignal('Correct answer only (CAO)');
        markAbbreviation('cao');
      }
    }
    if (answer.partial_credit || answer.partial_marking || answer.partial_marks) {
      partialCreditDetected = true;
    }
    if (
      typeof answer.maximum_marks_available === 'number' &&
      typeof answer.marks === 'number' &&
      answer.maximum_marks_available !== answer.marks
    ) {
      partialCreditDetected = true;
    }
    if (typeof answer.marks === 'number' && answer.marks > 1) {
      hasMultiMarkAllocations = true;
    }
    if (typeof answer.answer_requirement === 'string') {
      answerRequirements.add(answer.answer_requirement);
      const normalized = answer.answer_requirement.toLowerCase();
      if (normalized.includes('any') || normalized.includes('alternative')) {
        usesAlternativeLinking = true;
      }
      if (normalized.includes('all') || normalized.includes('both')) {
        hasMultiMarkAllocations = true;
      }
      if (normalized.includes('owtte')) {
        addVariationSignal('Equivalent phrasing allowed');
        markAbbreviation('owtte');
      }
      if (normalized.includes('ora')) {
        addVariationSignal('Reverse argument accepted');
        markAbbreviation('ora');
      }
      if (normalized.includes('ecf')) {
        addVariationSignal('Error carried forward supported');
        markAbbreviation('ecf');
      }
      if (normalized.includes('cao')) {
        addVariationSignal('Correct answer only (CAO)');
        markAbbreviation('cao');
      }
    }
  };

  const walkQuestionNode = (node: any) => {
    if (!node || typeof node !== 'object') return;

    const options = Array.isArray(node.options) ? node.options : [];
    const parts = Array.isArray(node.parts) ? node.parts : [];
    const subparts = Array.isArray(node.subparts) ? node.subparts : [];

    let detectedType = node.type;
    if (!detectedType) {
      if (parts.length > 0) {
        detectedType = 'complex';
      } else if (options.length > 0) {
        detectedType = 'mcq';
      } else if (node.answer_format === 'true_false') {
        detectedType = 'tf';
      }
    }
    if (detectedType) {
      questionTypes.add(String(detectedType));
    }

    if (node.answer_format) {
      answerFormats.add(String(node.answer_format));
      if (MANUAL_MARKING_FORMATS.has(String(node.answer_format))) {
        requiresManualMarking = true;
      }
    }

    if (node.answer_requirement) {
      answerRequirements.add(String(node.answer_requirement));
      const normalized = String(node.answer_requirement).toLowerCase();
      if (normalized.includes('any') || normalized.includes('alternative')) {
        usesAlternativeLinking = true;
      }
      if (normalized.includes('all') || normalized.includes('both')) {
        hasMultiMarkAllocations = true;
      }
      if (normalized.includes('owtte')) {
        addVariationSignal('Equivalent phrasing allowed');
        markAbbreviation('owtte');
      }
      if (normalized.includes('ora')) {
        addVariationSignal('Reverse argument accepted');
        markAbbreviation('ora');
      }
      if (normalized.includes('ecf')) {
        addVariationSignal('Error carried forward supported');
        markAbbreviation('ecf');
      }
      if (normalized.includes('cao')) {
        addVariationSignal('Correct answer only (CAO)');
        markAbbreviation('cao');
      }
    }

    if (node.context) {
      includesContextualAnswers = true;
      if (Array.isArray(node.context)) {
        node.context.forEach((ctx: any) => {
          if (ctx?.type) {
            contextTypes.add(String(ctx.type));
          }
        });
      } else if (node.context.type) {
        contextTypes.add(String(node.context.type));
      }
    }
    if (Array.isArray(node.context_fields)) {
      includesContextualAnswers = true;
      node.context_fields.forEach((field: any) => {
        if (field?.type) {
          contextTypes.add(String(field.type));
        }
      });
    }

    if (node.figure || node.figure_required) {
      includesFigures = true;
    }

    if (Array.isArray(node.attachments) && node.attachments.length > 0) {
      includesAttachments = true;
    }

    if (node.hint) {
      includesHints = true;
    }

    if (node.explanation) {
      includesExplanations = true;
    }

    if (node.requires_manual_marking) {
      requiresManualMarking = true;
    }

    if (node.subject) {
      subjects.add(String(node.subject));
    }
    if (node.subject_code) {
      subjects.add(String(node.subject_code));
    }

    if (node.partial_credit || node.partial_marking || node.partial_mark_distribution || node.partial_marks) {
      partialCreditDetected = true;
    }

    if (Array.isArray(node.marking_points) && node.marking_points.length > 0) {
      usesLineByLineMarking = true;
    }
    if (Array.isArray(node.mark_scheme) && node.mark_scheme.length > 0) {
      usesLineByLineMarking = true;
    }
    if (typeof node.mark_scheme === 'string' && node.mark_scheme.includes('\n')) {
      usesLineByLineMarking = true;
    }
    if (node.line_by_line === true) {
      usesLineByLineMarking = true;
    }

    if (typeof node.marks === 'number' && node.marks > 1) {
      hasMultiMarkAllocations = true;
    }

    if (Array.isArray(node.correct_answers) && node.correct_answers.length > 0) {
      if (node.correct_answers.length > 1) {
        usesLineByLineMarking = true;
      }
      node.correct_answers.forEach(recordAnswer);
    } else if (node.correct_answer) {
      recordAnswer({ answer: node.correct_answer, marks: node.marks, answer_requirement: node.answer_requirement });
    }

    if (parts.length > 0) {
      hasComponentMarking = true;
      parts.forEach((part: any) => {
        if (typeof part.marks === 'number' && part.marks > 0) {
          hasMultiMarkAllocations = true;
        }
        walkQuestionNode(part);
      });
    }

    if (subparts.length > 0) {
      hasComponentMarking = true;
      subparts.forEach((sub: any) => {
        if (typeof sub.marks === 'number' && sub.marks > 0) {
          hasMultiMarkAllocations = true;
        }
        walkQuestionNode(sub);
      });
    }
  };

  questions.forEach(walkQuestionNode);

  if (contextTypes.size > 0) {
    includesContextualAnswers = true;
  }

  const possibleSubjects = [
    data?.subject,
    data?.subject_code,
    data?.paper_metadata?.subject,
    data?.paper_metadata?.subject_code,
    data?.metadata?.subject
  ];
  possibleSubjects
    .filter((value): value is string => Boolean(value))
    .forEach(value => subjects.add(value));

  return {
    questionTypes: Array.from(questionTypes).sort(),
    answerFormats: Array.from(answerFormats).sort(),
    answerRequirements: Array.from(answerRequirements).sort(),
    subjectsDetected: Array.from(subjects).filter(Boolean),
    examBoard: data?.exam_board || data?.board || data?.paper_metadata?.exam_board,
    usesForwardSlash,
    usesLineByLineMarking,
    usesAlternativeLinking,
    includesContextualAnswers,
    includesFigures,
    includesAttachments,
    includesHints,
    includesExplanations,
    requiresManualMarking,
    hasComponentMarking,
    hasMultiMarkAllocations,
    variationSignals: Array.from(variationSignals).sort(),
    abbreviationsDetected: Array.from(abbreviationsDetected).sort(),
    contextTypesDetected: Array.from(contextTypes).sort(),
    partialCreditDetected
  };
};

const normalizeExamBoard = (value?: string): 'Cambridge' | 'Edexcel' | 'Both' | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes('cambridge') && normalized.includes('edexcel')) {
    return 'Both';
  }
  if (normalized.includes('cambridge') || normalized.includes('cie')) {
    return 'Cambridge';
  }
  if (normalized.includes('edexcel') || normalized.includes('pearson')) {
    return 'Edexcel';
  }
  return undefined;
};

// Utility function to generate a hash for JSON content
const generateJsonHash = async (jsonData: any): Promise<string> => {
  const jsonString = JSON.stringify(jsonData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export default function PapersSetupPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const displayedSessionIdRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedForSession = useRef(false);
  
  // Get tab from URL query parameter or default to 'upload'
  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'upload';
  };
  
  const [activeTab, setActiveTab] = useState(getQueryParam());
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [importSession, setImportSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [structureComplete, setStructureComplete] = useState(false);
  const [structureCompleteCalled, setStructureCompleteCalled] = useState(false);
  const [existingPaperId, setExistingPaperId] = useState<string | null>(null);
  const [savedPaperDetails, setSavedPaperDetails] = useState<any>(null);
  const [stagedAttachments, setStagedAttachments] = useState<Record<string, any[]>>({});
  const [previousSessionsExpanded, setPreviousSessionsExpanded] = useState(false);
  const [extractionRulesExpanded, setExtractionRulesExpanded] = useState(true); // Always expanded by default
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Track the status of each tab
  const [tabStatuses, setTabStatuses] = useState<Record<string, TabStatus>>({
    upload: 'pending',
    structure: 'pending',
    metadata: 'pending',
    questions: 'pending',
  });

  const activeTabDefinition = useMemo(
    () => IMPORT_TABS.find(tab => tab.id === activeTab),
    [activeTab]
  );

  const workflowProgress = useMemo(() => {
    const total = IMPORT_TABS.length;
    if (total === 0) return 0;

    const completedCount = IMPORT_TABS.reduce((count, tab) => {
      return count + (tabStatuses[tab.id] === 'completed' ? 1 : 0);
    }, 0);

    const activeStatus = tabStatuses[activeTab];
    const activeContribution = activeStatus === 'completed' ? 0 : 0.5;
    const transitionBoost = isTabTransitioning ? 0.2 : 0;

    const progressUnits = Math.min(
      total,
      completedCount + activeContribution + transitionBoost
    );

    const rawProgress = Math.round((progressUnits / total) * 100);
    return Math.max(0, Math.min(100, rawProgress));
  }, [tabStatuses, activeTab, isTabTransitioning]);

  const guidelineSummary = useMemo<JsonGuidelineSummary | null>(
    () => (parsedData ? analyzeParsedDataForGuidelines(parsedData) : null),
    [parsedData]
  );

  // Enhanced extraction rules configuration with defaults based on JSON structure
  const [extractionRules, setExtractionRules] = useState<ExtractionRules>({
    forwardSlashHandling: true,
    lineByLineProcessing: true,
    alternativeLinking: true,
    contextRequired: true,
    figureDetection: true,
    educationalContent: {
      hintsRequired: true,
      explanationsRequired: true,
    },
    subjectSpecific: {
      physics: false,
      chemistry: false,
      biology: false,
      mathematics: false,
    },
    abbreviations: {
      ora: false,
      owtte: false,
      ecf: false,
      cao: false,
    },
    answerStructure: {
      validateMarks: true,
      requireContext: true,
      validateLinking: true,
      acceptAlternatives: false,
    },
    markScheme: {
      requiresManualMarking: true,
      markingCriteria: true,
      componentMarking: true,
      levelDescriptors: true,
    },
    examBoard: 'Cambridge',
  });

  useEffect(() => {
    if (!guidelineSummary) return;

    setExtractionRules(prev => {
      let changed = false;
      const next: ExtractionRules = {
        ...prev,
        educationalContent: { ...prev.educationalContent },
        subjectSpecific: { ...prev.subjectSpecific },
        abbreviations: { ...prev.abbreviations },
        answerStructure: { ...prev.answerStructure },
        markScheme: { ...prev.markScheme }
      };

      if (guidelineSummary.usesForwardSlash && !prev.forwardSlashHandling) {
        next.forwardSlashHandling = true;
        changed = true;
      }

      if (guidelineSummary.usesLineByLineMarking && !prev.lineByLineProcessing) {
        next.lineByLineProcessing = true;
        changed = true;
      }

      if ((guidelineSummary.usesAlternativeLinking || guidelineSummary.answerRequirements.length > 0) && !prev.alternativeLinking) {
        next.alternativeLinking = true;
        changed = true;
      }

      if ((guidelineSummary.includesFigures || guidelineSummary.includesAttachments) && !prev.figureDetection) {
        next.figureDetection = true;
        changed = true;
      }

      if (guidelineSummary.includesContextualAnswers && !prev.contextRequired) {
        next.contextRequired = true;
        changed = true;
      }

      const nextEducationalContent = {
        hintsRequired: guidelineSummary.includesHints,
        explanationsRequired: guidelineSummary.includesExplanations
      };

      if (
        nextEducationalContent.hintsRequired !== prev.educationalContent.hintsRequired ||
        nextEducationalContent.explanationsRequired !== prev.educationalContent.explanationsRequired
      ) {
        next.educationalContent = nextEducationalContent;
        changed = true;
      }

      const normalizedSubjects = guidelineSummary.subjectsDetected.map(subject => subject.toLowerCase());
      const nextSubjectSpecific = {
        physics: normalizedSubjects.some(subject => subject.includes('physics')),
        chemistry: normalizedSubjects.some(subject => subject.includes('chemistry')),
        biology: normalizedSubjects.some(subject => subject.includes('biology')),
        mathematics: normalizedSubjects.some(subject => subject.includes('math'))
      };

      if (
        nextSubjectSpecific.physics !== prev.subjectSpecific.physics ||
        nextSubjectSpecific.chemistry !== prev.subjectSpecific.chemistry ||
        nextSubjectSpecific.biology !== prev.subjectSpecific.biology ||
        nextSubjectSpecific.mathematics !== prev.subjectSpecific.mathematics
      ) {
        next.subjectSpecific = nextSubjectSpecific;
        changed = true;
      }

      if (guidelineSummary.abbreviationsDetected.length > 0) {
        const abbreviationMap: Record<string, keyof ExtractionRules['abbreviations']> = {
          ORA: 'ora',
          OWTTE: 'owtte',
          ECF: 'ecf',
          CAO: 'cao'
        };
        const nextAbbreviations = { ...next.abbreviations };
        let abbreviationsChanged = false;

        Object.entries(abbreviationMap).forEach(([label, key]) => {
          const shouldEnable = guidelineSummary.abbreviationsDetected.includes(label);
          if (shouldEnable && !prev.abbreviations[key]) {
            nextAbbreviations[key] = true;
            abbreviationsChanged = true;
          }
        });

        if (abbreviationsChanged) {
          next.abbreviations = nextAbbreviations;
          changed = true;
        }
      }

      if (guidelineSummary.includesContextualAnswers && !prev.answerStructure.requireContext) {
        next.answerStructure.requireContext = true;
        changed = true;
      }

      if ((guidelineSummary.usesAlternativeLinking || guidelineSummary.answerRequirements.length > 0) && !prev.answerStructure.validateLinking) {
        next.answerStructure.validateLinking = true;
        changed = true;
      }

      if ((guidelineSummary.variationSignals.length > 0 || guidelineSummary.usesAlternativeLinking) && !prev.answerStructure.acceptAlternatives) {
        next.answerStructure.acceptAlternatives = true;
        changed = true;
      }

      if (guidelineSummary.hasMultiMarkAllocations && !prev.answerStructure.validateMarks) {
        next.answerStructure.validateMarks = true;
        changed = true;
      }

      if (guidelineSummary.partialCreditDetected && !prev.answerStructure.validateMarks) {
        next.answerStructure.validateMarks = true;
        changed = true;
      }

      if (guidelineSummary.requiresManualMarking && !prev.markScheme.requiresManualMarking) {
        next.markScheme.requiresManualMarking = true;
        changed = true;
      }

      if (guidelineSummary.hasComponentMarking && !prev.markScheme.componentMarking) {
        next.markScheme.componentMarking = true;
        changed = true;
      }

      if (guidelineSummary.hasMultiMarkAllocations && !prev.markScheme.markingCriteria) {
        next.markScheme.markingCriteria = true;
        changed = true;
      }

      if (guidelineSummary.partialCreditDetected && !prev.markScheme.markingCriteria) {
        next.markScheme.markingCriteria = true;
        changed = true;
      }

      const normalizedBoard = normalizeExamBoard(guidelineSummary.examBoard);
      if (normalizedBoard && normalizedBoard !== prev.examBoard) {
        next.examBoard = normalizedBoard;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [guidelineSummary]);

  // Check for existing in-progress session on mount
  useEffect(() => {
    if (!hasCheckedForSession.current && user) {
      hasCheckedForSession.current = true;
      checkForExistingSession();
    }
  }, [user]);

  // Check for existing import session
  const checkForExistingSession = async () => {
    setIsLoadingSession(true);
    try {
      // Get the most recent in-progress session for the current user
      const { data, error } = await supabase
        .from('past_paper_import_sessions')
        .select('*')
        .eq('status', 'in_progress')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setImportSession(data);
        if (data.raw_json) {
          setParsedData(data.raw_json);
          // Create a mock file for UI display
          const mockFile = new File(
            [JSON.stringify(data.raw_json)], 
            data.json_file_name || 'previous_import.json',
            { type: 'application/json' }
          );
          setUploadedFile(mockFile);
        }
        
        // Update tab statuses based on session metadata
        const newStatuses = { ...tabStatuses };
        newStatuses.upload = 'completed';
        
        if (data.metadata?.structure_complete) {
          newStatuses.structure = 'completed';
          setStructureComplete(true);
        }
        
        if (data.metadata?.metadata_complete) {
          newStatuses.metadata = 'completed';
          setExistingPaperId(data.metadata?.paper_id);
          setSavedPaperDetails(data.metadata?.paper_details);
        }
        
        if (data.metadata?.questions_imported) {
          newStatuses.questions = 'completed';
        }
        
        setTabStatuses(newStatuses);
        
        // Show notification
        toast.success('Previous import session restored', {
          id: 'papers-setup-session-status',
          duration: 3500,
        });
        
        // Update subject-specific rules based on parsed data
        if (data.raw_json?.subject) {
          updateSubjectRules(data.raw_json.subject);
        }
      }
    } catch (error) {
      console.error('Error checking for existing session:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Update subject-specific rules based on parsed data
  const updateSubjectRules = (subject: string) => {
    const subjectLower = subject.toLowerCase();
    setExtractionRules(prev => ({
      ...prev,
      subjectSpecific: {
        physics: subjectLower.includes('physics'),
        chemistry: subjectLower.includes('chemistry'),
        biology: subjectLower.includes('biology'),
        mathematics: subjectLower.includes('math'),
      },
    }));
  };

  // Update URL with tab changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('tab', activeTab);
    const newUrl = `${location.pathname}?${params.toString()}`;
    if (location.pathname + location.search !== newUrl) {
      navigate(newUrl, { replace: true });
    }
  }, [activeTab, location.pathname, location.search, navigate]);

  useEffect(() => {
    return () => {
      if (tabTransitionTimeoutRef.current) {
        clearTimeout(tabTransitionTimeoutRef.current);
      }
    };
  }, []);

  // Load session from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session');

    if (sessionId && sessionId !== displayedSessionIdRef.current) {
      displayedSessionIdRef.current = sessionId;
      loadImportSession(sessionId);
    }
  }, [location.search]);

  useEffect(() => {
    if (!pendingTab) {
      return;
    }

    if (pendingTab === activeTab && !isLoadingSession) {
      if (tabTransitionTimeoutRef.current) {
        clearTimeout(tabTransitionTimeoutRef.current);
      }

      tabTransitionTimeoutRef.current = setTimeout(() => {
        setIsTabTransitioning(false);
        setTransitionMessage('');
        setPendingTab(null);
        tabTransitionTimeoutRef.current = null;
      }, 800);
    }

    return () => {
      if (tabTransitionTimeoutRef.current && pendingTab === activeTab) {
        clearTimeout(tabTransitionTimeoutRef.current);
      }
    };
  }, [activeTab, pendingTab, isLoadingSession]);

  const loadImportSession = async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      const { data, error } = await supabase
        .from('past_paper_import_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (data) {
        // Don't restore sessions that are failed or completed
        if (data.status === 'failed' || data.status === 'completed') {
          console.log('Session is not in progress, clearing URL and starting fresh');
          // Clear URL parameters
          const params = new URLSearchParams(location.search);
          params.delete('session');
          params.delete('tab');
          const newUrl = params.toString()
            ? `${location.pathname}?${params.toString()}`
            : location.pathname;
          navigate(newUrl, { replace: true });

          toast.info('Previous session was closed. Starting a new import.', {
            id: 'papers-setup-session-status',
            duration: 4000,
          });
          setIsLoadingSession(false);
          return;
        }

        setImportSession(data);
        if (data.raw_json) {
          setParsedData(data.raw_json);
          const mockFile = new File(
            [JSON.stringify(data.raw_json)], 
            data.json_file_name || 'imported_data.json',
            { type: 'application/json' }
          );
          setUploadedFile(mockFile);
        }
        
        // Update tab statuses based on session state and metadata
        const newStatuses = { ...tabStatuses };
        newStatuses.upload = 'completed';
        
        // Check metadata for completion states
        if (data.metadata?.structure_complete) {
          newStatuses.structure = 'completed';
          setStructureComplete(true);
        }
        
        if (data.metadata?.metadata_complete) {
          newStatuses.metadata = 'completed';
          setExistingPaperId(data.metadata?.paper_id);
          setSavedPaperDetails(data.metadata?.paper_details);
        }
        
        if (data.metadata?.questions_imported) {
          newStatuses.questions = 'completed';
        }
        
        setTabStatuses(newStatuses);
        
        // Navigate to appropriate tab
        if (data.metadata?.questions_imported) {
          setActiveTab('questions');
        } else if (data.metadata?.metadata_complete) {
          setActiveTab('questions');
        } else if (data.metadata?.structure_complete) {
          setActiveTab('metadata');
        } else {
          setActiveTab('structure');
        }
        
        // Update subject rules if data available
        if (data.raw_json?.subject) {
          updateSubjectRules(data.raw_json.subject);
        }
      }
    } catch (error) {
      console.error('Error loading import session:', error);
      toast.error('Failed to load import session', {
        id: 'papers-setup-session-error',
      });

      // Clear URL parameters on error
      const params = new URLSearchParams(location.search);
      params.delete('session');
      params.delete('tab');
      const newUrl = params.toString()
        ? `${location.pathname}?${params.toString()}`
        : location.pathname;
      navigate(newUrl, { replace: true });
    } finally {
      setIsLoadingSession(false);
      if (tabTransitionTimeoutRef.current) {
        clearTimeout(tabTransitionTimeoutRef.current);
        tabTransitionTimeoutRef.current = null;
      }
      setIsTabTransitioning(false);
      setTransitionMessage('');
      setPendingTab(null);
    }
  };

  const handleFileSelected = async (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      // Read and parse the file
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Validate JSON structure
      if (!jsonData.exam_board || !jsonData.qualification || !jsonData.questions) {
        throw new Error('Invalid JSON structure. Missing required fields: exam_board, qualification, or questions.');
      }

      // Transform imported JSON to internal format
      try {
        const transformed = transformImportedPaper(jsonData);
        // Store both original and transformed data
        setParsedData({
          ...jsonData,
          transformedQuestions: transformed.questions,
          transformedMetadata: transformed.metadata
        });
      } catch (transformError) {
        console.error('JSON transformation error:', transformError);
        // Fall back to original if transformation fails
        setParsedData(jsonData);
        toast.warning('Some questions may not display correctly', {
          id: 'papers-setup-session-warning',
          duration: 4500,
        });
      }
      
      // Generate hash for duplicate detection
      const jsonHash = await generateJsonHash(jsonData);
      
      // Check for exact duplicate (same hash) within user's own sessions
      try {
        const { data: exactDuplicate } = await supabase
          .from('past_paper_import_sessions')
          .select('*')
          .eq('json_hash', jsonHash)
          .eq('status', 'in_progress')
          .eq('created_by', user?.id)
          .maybeSingle();
        
        if (exactDuplicate) {
          // Silently use existing session for exact duplicate
          setImportSession(exactDuplicate);
          toast.info('Resuming existing import session with identical content', {
            id: 'papers-setup-session-status',
            duration: 4000,
          });
          
          // Update URL with session ID
          const params = new URLSearchParams(location.search);
          params.set('session', exactDuplicate.id);
          params.set('tab', 'structure');
          navigate({ search: params.toString() });
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          setTabStatuses(prev => ({
            ...prev,
            upload: 'completed',
            structure: 'active',
          }));
          
          handleTabChange('structure', { message: 'Preparing academic structure review...' });
          return;
        }
      } catch (hashError) {
        // If json_hash column doesn't exist yet, continue without hash checking
        console.log('Hash-based duplicate detection not available yet');
      }
      
      // Check for similar files (same paper code and year but different content)
      const paperCode = jsonData.paper_code || jsonData.paper_metadata?.paper_code;
      const examYear = jsonData.exam_year || jsonData.paper_metadata?.exam_year;
      
      if (paperCode && examYear) {
        const { data: similarSessions } = await supabase
          .from('past_paper_import_sessions')
          .select('*')
          .eq('status', 'in_progress')
          .eq('created_by', user?.id)
          .order('created_at', { ascending: false });
        
        // Check if we have a session with the same paper code and year but different content
        const similarSession = similarSessions?.find(session => {
          const sessionPaperCode = session.raw_json?.paper_code || session.raw_json?.paper_metadata?.paper_code;
          const sessionYear = session.raw_json?.exam_year || session.raw_json?.paper_metadata?.exam_year;
          const isDifferentContent = !session.json_hash || session.json_hash !== jsonHash;
          return sessionPaperCode === paperCode && sessionYear === examYear && isDifferentContent;
        });
        
        if (similarSession) {
          // Ask user about similar but different content
          const createNew = confirm(
            `You have an existing import session for ${paperCode} (${examYear}), but with different content. ` +
            `This might be a corrected version or different variant.\n\n` +
            `Would you like to create a new session for this version?\n\n` +
            `Click OK to create new session, or Cancel to resume the existing one.`
          );
          
          if (!createNew) {
            // Use the existing similar session
            setImportSession(similarSession);
            toast.info('Using existing import session for this paper', {
              id: 'papers-setup-session-status',
              duration: 4000,
            });
            
            // Update URL with session ID
            const params = new URLSearchParams(location.search);
            params.set('session', similarSession.id);
            params.set('tab', 'structure');
            navigate({ search: params.toString() });
            
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            setTabStatuses(prev => ({
              ...prev,
              upload: 'completed',
              structure: 'active',
            }));
            
            handleTabChange('structure', { message: 'Preparing academic structure review...' });
            return;
          }
          // Continue to create new session if user chose OK
        }
      }
      
      // Create new import session
      const sessionData: any = {
        json_file_name: file.name,
        raw_json: jsonData,
        status: 'in_progress',
        created_by: user?.id,
        metadata: {
          upload_timestamp: new Date().toISOString(),
          file_size: file.size,
          extraction_rules: extractionRules
        }
      };
      
      // Try to include hash if supported
      try {
        sessionData.json_hash = jsonHash;
      } catch (e) {
        // Column might not exist yet
      }
      
      const { data: session, error: sessionError } = await supabase
        .from('past_paper_import_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) throw sessionError;

      setImportSession(session);
      
      // Update URL with session ID
      const params = new URLSearchParams(location.search);
      params.set('session', session.id);
      params.set('tab', 'structure');
      navigate({ search: params.toString() });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTabStatuses(prev => ({
        ...prev,
        upload: 'completed',
        structure: 'active',
      }));
      
      toast.success('File uploaded successfully', {
        id: 'papers-setup-upload-status',
        duration: 3500,
      });
      
      // Auto-navigate to structure tab
      handleTabChange('structure', { message: 'Preparing academic structure review...' });
      
      // Update subject rules based on parsed data
      if (jsonData.subject) {
        updateSubjectRules(jsonData.subject);
      }
      
      // Update exam board
      if (jsonData.exam_board) {
        setExtractionRules(prev => ({
          ...prev,
          examBoard: jsonData.exam_board.includes('Cambridge') ? 'Cambridge' : 
                     jsonData.exam_board.includes('Edexcel') ? 'Edexcel' : 'Both'
        }));
      }
    } catch (error) {
      console.error('Error processing file:', error);
      let errorMessage = 'Failed to process file';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for Supabase schema errors
        if (error.message.includes('Could not find') && error.message.includes('column')) {
          errorMessage = 'Database schema error: Some required columns are missing. Please ensure the database is properly set up.';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        id: 'papers-setup-upload-error',
      });
      setTabStatuses(prev => ({
        ...prev,
        upload: 'error',
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPreviousSession = async (session: any) => {
    const params = new URLSearchParams(location.search);
    params.set('session', session.id);

    const nextTab = getAppropriateTab(session);
    params.set('tab', nextTab);

    if (tabTransitionTimeoutRef.current) {
      clearTimeout(tabTransitionTimeoutRef.current);
    }

    setTransitionMessage('Restoring previous session...');
    setIsTabTransitioning(true);
    setPendingTab(nextTab);

    if (activeTab !== nextTab) {
      setActiveTab(nextTab);
    }

    navigate({ search: params.toString() });
  };

  const getAppropriateTab = (session: any) => {
    if (session.metadata?.questions_imported) return 'questions';
    if (session.metadata?.metadata_complete) return 'questions';
    if (session.metadata?.structure_complete) return 'metadata';
    return 'structure';
  };

  const handleQuestionsContinue = () => {
    if (tabTransitionTimeoutRef.current) {
      clearTimeout(tabTransitionTimeoutRef.current);
      tabTransitionTimeoutRef.current = null;
    }

    setTransitionMessage('Opening question management workspace...');
    setIsTabTransitioning(true);
    setPendingTab(null);

    navigate('/system-admin/learning/practice-management/questions-setup');
  };

  const handleTabChange = useCallback((tabId: string, options?: { message?: string }) => {
    if (!tabId || tabId === activeTab) {
      return;
    }

    if (tabTransitionTimeoutRef.current) {
      clearTimeout(tabTransitionTimeoutRef.current);
    }

    const tabName = IMPORT_TABS.find(t => t.id === tabId)?.label || 'content';

    setTransitionMessage(options?.message || `Preparing ${tabName}...`);
    setIsTabTransitioning(true);
    setPendingTab(tabId);
    setActiveTab(tabId);

    setTabStatuses(prev => {
      const updatedStatuses = { ...prev };
      if (updatedStatuses[tabId] !== 'completed') {
        updatedStatuses[tabId] = 'active';
      }
      return updatedStatuses;
    });
  }, [activeTab]);

  const handleStructureComplete = async () => {
    if (structureCompleteCalled) return;
    setStructureCompleteCalled(true);
    
    setStructureComplete(true);
    setTabStatuses(prev => ({
      ...prev,
      structure: 'completed',
      metadata: 'active',
    }));
    
    // Auto-navigate to metadata tab
    handleTabChange('metadata', { message: 'Configuring paper metadata workspace...' });
  };

  const handleMetadataSave = async (paperId: string, paperDetails: any) => {
    try {
      // Update session metadata first
      if (importSession?.id) {
        const { data: existingSession } = await supabase
          .from('past_paper_import_sessions')
          .select('metadata')
          .eq('id', importSession.id)
          .maybeSingle();

        const updatedMetadata = {
          ...(existingSession?.metadata || {}),
          metadata_complete: true,
          paper_id: paperId,
          paper_details: paperDetails
        };

        await supabase
          .from('past_paper_import_sessions')
          .update({
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', importSession.id);

        // Update local importSession state with new metadata
        setImportSession((prev: any) => ({
          ...prev,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        }));
      }

      // Use React's batched state updates with flushSync for immediate updates
      // This ensures all state is set before navigation
      await new Promise<void>((resolve) => {
        setExistingPaperId(paperId);
        setSavedPaperDetails(paperDetails);
        setTabStatuses(prev => ({
          ...prev,
          metadata: 'completed',
          questions: 'active',
        }));

        // Use requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      // Now navigate to questions tab after state is guaranteed to be set
      handleTabChange('questions', { message: 'Preparing questions review...' });
    } catch (error) {
      console.error('Error in handleMetadataSave:', error);
      toast.error('Failed to save metadata. Please try again.', {
        id: 'papers-setup-metadata-error',
      });
    }
  };

  const getTabStatus = (tabId: string): TabStatus => {
    if (activeTab === tabId) return 'active';
    return tabStatuses[tabId] || 'pending';
  };

  const isTabDisabled = (tabId: string) => {
    const tabIndex = IMPORT_TABS.findIndex(tab => tab.id === tabId);
    
    if (tabId === 'upload') return false;
    
    // Check if previous tabs are completed
    for (let i = 0; i < tabIndex; i++) {
      if (tabStatuses[IMPORT_TABS[i].id] !== 'completed') {
        return true;
      }
    }
    
    return false;
  };

  // Update staged attachments
  const updateStagedAttachments = (questionId: string, attachments: any[]) => {
    setStagedAttachments(prev => ({
      ...prev,
      [questionId]: attachments
    }));
  };

  // Scroll navigation sections
  const scrollSections = [
    { id: 'workflow', label: 'Import Workflow' },
    { id: 'upload-section', label: 'Upload JSON' },
    { id: 'extraction-rules', label: 'Extraction Rules' },
    { id: 'previous-sessions', label: 'Previous Sessions' },
  ];

  if (isLoadingSession && !uploadedFile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {isTabTransitioning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80"
          role="status"
          aria-live="assertive"
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white/90 p-8 text-center shadow-xl dark:border-gray-700 dark:bg-gray-900/90">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/40" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {transitionMessage || 'Preparing the next step...'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {activeTabDefinition?.label
                    ? `Moving to ${activeTabDefinition.label}`
                    : 'Hang tight while we set things up.'}
                </p>
              </div>
              <div className="w-full">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 max-w-7xl" ref={contentRef}>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Past Papers Import Wizard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Import and configure past exam papers with structured question extraction
          </p>
        </div>

        {/* Scroll Navigator */}
        <ScrollNavigator
          sections={scrollSections}
          containerRef={contentRef}
          offset={100}
        />

        {/* Progress Indicator */}
        <div id="workflow" className="mb-8 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Workflow progress
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeTabDefinition?.label
                      ? `Currently on: ${activeTabDefinition.label}`
                      : 'Getting things ready'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {workflowProgress}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${workflowProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            {IMPORT_TABS.map((tab) => {
              const status = getTabStatus(tab.id);
              const Icon = tab.icon;

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  tabStatus={status}
                  disabled={isTabDisabled(tab.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div id="upload-section">
              <UploadTab
                onFileSelected={handleFileSelected}
                uploadedFile={uploadedFile}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                error={error}
                parsedData={parsedData}
                onSelectPreviousSession={handleSelectPreviousSession}
                importSession={importSession}
                onNavigateToTab={handleTabChange}
              />
            </div>
          
          {/* Extraction Rules - moved here as requested */}
          <div id="extraction-rules" className="mt-6">
            <ExtractionRulesPanel
              rules={extractionRules}
              onChange={setExtractionRules}
              isExpanded={extractionRulesExpanded}
              onToggle={() => setExtractionRulesExpanded(!extractionRulesExpanded)}
            />
          </div>

          {guidelineSummary && (
            <div className="mt-4">
              <JsonGuidelineChecklist summary={guidelineSummary} extractionRules={extractionRules} />
            </div>
          )}

          {/* Previous Sessions */}
          <div id="previous-sessions" className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-between px-6 py-4 h-auto text-left rounded-t-lg"
                onClick={() => setPreviousSessionsExpanded(!previousSessionsExpanded)}
              >
                <div className="flex w-full items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Previous Import Sessions
                  </h3>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-gray-500 transition-transform",
                      previousSessionsExpanded && "transform rotate-180"
                    )}
                  />
                </div>
              </Button>
              
              {previousSessionsExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                  <PreviousSessionsTable 
                    onSelectSession={handleSelectPreviousSession}
                    currentSessionId={importSession?.id}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="structure">
          {importSession && parsedData ? (
            <StructureTab
              importSession={importSession}
              parsedData={parsedData}
              onNext={handleStructureComplete}
              onPrevious={() => handleTabChange('upload', { message: 'Returning to upload review...' })}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Please complete the upload step first
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="metadata">
          {importSession && parsedData ? (
            <MetadataTab
              importSession={importSession}
              parsedData={parsedData}
              onSave={handleMetadataSave}
              onPrevious={() => handleTabChange('structure', { message: 'Going back to academic structure...' })}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Please complete the previous steps first
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions">
          {importSession && parsedData && existingPaperId ? (
            <QuestionsTab
              importSession={importSession}
              parsedData={parsedData}
              existingPaperId={existingPaperId}
              savedPaperDetails={savedPaperDetails}
              onPrevious={() => handleTabChange('metadata', { message: 'Returning to metadata setup...' })}
              onContinue={handleQuestionsContinue}
              extractionRules={extractionRules}
              updateStagedAttachments={updateStagedAttachments}
              stagedAttachments={stagedAttachments}
            />
          ) : importSession && parsedData && !existingPaperId ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">
                Loading paper data...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Preparing questions review workspace
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Please complete the previous steps first
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
