import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ListChecks,
  BookOpen,
  Link,
  FileText,
  Lightbulb,
  Target,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Tag,
  MapPin
} from 'lucide-react';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { ExtractionRules, JsonGuidelineSummary } from '../types';

interface JsonGuidelineChecklistProps {
  summary: JsonGuidelineSummary;
  extractionRules: ExtractionRules;
}

type ChecklistStatus = 'satisfied' | 'warning' | 'optional';

type RequirementItem = {
  label: string;
  description: string;
  status: ChecklistStatus;
};

const RequirementRow: React.FC<RequirementItem> = ({ label, description, status }) => {
  const icon = status === 'satisfied' ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : status === 'warning' ? (
    <AlertTriangle className="h-4 w-4 text-amber-500" />
  ) : (
    <Info className="h-4 w-4 text-blue-500" />
  );

  const textColor =
    status === 'satisfied'
      ? 'text-green-700 dark:text-green-300'
      : status === 'warning'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-blue-700 dark:text-blue-300';

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
};

const renderBadgeList = (title: string, icon: React.ReactNode, items: string[]) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        {icon}
        <span>{title}</span>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <span
              key={item}
              className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-200"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">No items detected in the uploaded JSON.</p>
      )}
    </div>
  );
};

export const JsonGuidelineChecklist: React.FC<JsonGuidelineChecklistProps> = ({ summary, extractionRules }) => {
  const abbreviationKeyMap: Record<string, keyof ExtractionRules['abbreviations']> = {
    ORA: 'ora',
    OWTTE: 'owtte',
    ECF: 'ecf',
    CAO: 'cao'
  };

  const abbreviationsConfigured = summary.abbreviationsDetected.every(label => {
    const key = abbreviationKeyMap[label];
    return key ? extractionRules.abbreviations[key] : true;
  });

  const coreRequirements: RequirementItem[] = [
    {
      label: 'Forward slash alternatives handled',
      description: summary.usesForwardSlash
        ? 'Detected mark-scheme slashes. Ensure split answers map to alternative IDs.'
        : 'No slash-based alternatives detected in this JSON payload.',
      status: summary.usesForwardSlash
        ? extractionRules.forwardSlashHandling
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Line-by-line mark scheme support',
      description: summary.usesLineByLineMarking
        ? 'Multiple marking points detected. Preserve the one-point-per-line extraction.'
        : 'No multi-line marking points were found in this upload.',
      status: summary.usesLineByLineMarking
        ? extractionRules.lineByLineProcessing
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Linked alternatives logic',
      description: summary.usesAlternativeLinking
        ? 'Detected AND/OR logic or Cambridge “any from” statements. Ensure alternative chains are preserved.'
        : 'No advanced linking patterns detected.',
      status: summary.usesAlternativeLinking
        ? extractionRules.alternativeLinking && extractionRules.answerStructure.validateLinking
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Context-aware marking',
      description: summary.includesContextualAnswers
        ? 'Some answers carry context metadata (units, conditions). Require context to avoid losing grading fidelity.'
        : 'No contextual metadata detected in answers.',
      status: summary.includesContextualAnswers
        ? extractionRules.contextRequired && extractionRules.answerStructure.requireContext
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Variation and alternative acceptance',
      description: summary.variationSignals.length > 0
        ? `Detected: ${summary.variationSignals.join(', ')}. Ensure alternative acceptance stays enabled.`
        : 'No variation flags detected in this upload.',
      status: summary.variationSignals.length > 0
        ? extractionRules.answerStructure.acceptAlternatives
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Figure and attachment alignment',
      description: summary.includesFigures || summary.includesAttachments
        ? 'Questions reference diagrams, tables, or uploads. Ensure the figure detector remains enabled.'
        : 'No figure dependencies detected in this batch.',
      status: summary.includesFigures || summary.includesAttachments
        ? extractionRules.figureDetection
          ? 'satisfied'
          : 'warning'
        : 'optional'
    }
  ];

  const markSchemeRequirements: RequirementItem[] = [
    {
      label: 'Manual marking readiness',
      description: summary.requiresManualMarking
        ? 'Detected drawing, structural, or upload answer formats. Ensure manual marking flags reach reviewers.'
        : 'All detected answers are auto-markable.',
      status: summary.requiresManualMarking
        ? extractionRules.markScheme.requiresManualMarking
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Component marking structure',
      description: summary.hasComponentMarking
        ? 'Parts or sub-parts detected. Maintain component-level score aggregation.'
        : 'No multi-part structures detected.',
      status: summary.hasComponentMarking
        ? extractionRules.markScheme.componentMarking
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Mark allocation validation',
      description: summary.hasMultiMarkAllocations
        ? 'Variable mark allocations detected. Keep validation on to prevent silent mark drift.'
        : 'All questions appear single-mark.',
      status: summary.hasMultiMarkAllocations
        ? extractionRules.answerStructure.validateMarks && extractionRules.markScheme.markingCriteria
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Cambridge abbreviation coverage',
      description: summary.abbreviationsDetected.length > 0
        ? `Detected: ${summary.abbreviationsDetected.join(', ')}. Toggle the matching abbreviation processors.`
        : 'No Cambridge abbreviations present in this JSON.',
      status: summary.abbreviationsDetected.length > 0
        ? abbreviationsConfigured
          ? 'satisfied'
          : 'warning'
        : 'optional'
    },
    {
      label: 'Partial credit readiness',
      description: summary.partialCreditDetected
        ? 'Partial credit logic detected. Keep mark criteria validation enabled for QA.'
        : 'No partial credit rules detected.',
      status: summary.partialCreditDetected
        ? extractionRules.markScheme.markingCriteria
          ? 'satisfied'
          : 'warning'
        : 'optional'
    }
  ];

  const hasWarnings = [...coreRequirements, ...markSchemeRequirements].some(item => item.status === 'warning');

  const subjectChips = summary.subjectsDetected.length > 0 ? summary.subjectsDetected : ['Not provided'];
  const examBoard = summary.examBoard ? summary.examBoard : 'Not specified';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">JSON Instruction Alignment</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Auto-detected requirements from the extraction guides and uploaded mark scheme. Resolve any warnings before
            publishing to guarantee 100% compliance.
          </p>
        </div>
        <StatusBadge
          status={hasWarnings ? 'pending' : 'completed'}
          label={hasWarnings ? 'Action needed' : 'Ready'}
          showIcon
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Layers className="h-4 w-4 text-purple-500" />
            <span>Core extraction logic</span>
          </div>
          {coreRequirements.map(requirement => (
            <RequirementRow key={requirement.label} {...requirement} />
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ClipboardList className="h-4 w-4 text-emerald-500" />
            <span>Mark scheme processing</span>
          </div>
          {markSchemeRequirements.map(requirement => (
            <RequirementRow key={requirement.label} {...requirement} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-2">
        {renderBadgeList(
          'Question type coverage',
          <Target className="h-4 w-4 text-sky-500" />,
          summary.questionTypes
        )}
        {renderBadgeList(
          'Answer entry formats',
          <FileText className="h-4 w-4 text-rose-500" />,
          summary.answerFormats
        )}
        {renderBadgeList(
          'Answer requirement logic',
          <Link className="h-4 w-4 text-green-500" />,
          summary.answerRequirements
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-2">
        {renderBadgeList(
          'Context metadata types',
          <MapPin className="h-4 w-4 text-amber-500" />,
          summary.contextTypesDetected
        )}
        {renderBadgeList(
          'Variation signals detected',
          <Sparkles className="h-4 w-4 text-purple-500" />,
          summary.variationSignals
        )}
        {renderBadgeList(
          'Cambridge annotations',
          <Tag className="h-4 w-4 text-indigo-500" />,
          summary.abbreviationsDetected
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            <span>Subject signals</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjectChips.map(subject => (
              <span
                key={subject}
                className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-900/60 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <GraduationCap className="h-4 w-4 text-amber-500" />
            <span>Exam board alignment</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{examBoard}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Toggle between Cambridge and Edexcel extraction logic as needed. Mixed datasets should remain on “Both Boards”.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span>Teacher enrichment</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {summary.includesHints || summary.includesExplanations
              ? 'Hints or explanations were detected. Keep enrichment toggles enabled so QA reviewers receive pedagogical context.'
              : 'This JSON does not include hints or explanations. You can leave enrichment disabled for a lean workflow.'}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ListChecks className="h-4 w-4 text-teal-500" />
            <span>Next recommended action</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {hasWarnings
              ? 'Resolve the highlighted warnings above before mapping topics or importing questions. This keeps the JSON and UI fully synchronised.'
              : 'All detected requirements are satisfied. Proceed to academic structure or question QA.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default JsonGuidelineChecklist;
