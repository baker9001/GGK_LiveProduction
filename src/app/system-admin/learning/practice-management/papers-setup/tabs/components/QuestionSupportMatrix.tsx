import React from 'react';
import { Layers, GitBranch, FileText, Target, Link, Lightbulb, CheckCircle2, Info, Shapes, ListChecks, MapPin } from 'lucide-react';
import { QuestionSupportSummary } from '../../types';

interface QuestionSupportMatrixProps {
  summary: QuestionSupportSummary;
}

type FlagStatus = 'active' | 'inactive';

const FlagIndicator: React.FC<{ label: string; description: string; status: FlagStatus }> = ({ label, description, status }) => {
  const icon = status === 'active' ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
  ) : (
    <Info className="h-3.5 w-3.5 text-gray-400" />
  );

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${status === 'active' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'}`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className={`text-xs font-semibold ${status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'}`}>{label}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

const CountPills: React.FC<{ title: string; icon: React.ReactNode; items: Record<string, number> }> = ({ title, icon, items }) => {
  const entries = Object.entries(items);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        {icon}
        <span>{title}</span>
      </div>
      {entries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {entries.map(([label, count]) => (
            <span
              key={label}
              className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-200"
            >
              {label} <span className="ml-1 text-[11px] text-blue-500/80 dark:text-blue-200/70">({count})</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">No data detected yet.</p>
      )}
    </div>
  );
};

const QuestionSupportMatrix: React.FC<QuestionSupportMatrixProps> = ({ summary }) => {
  const { structureFlags, logicFlags, totalQuestions, optionTypeCounts, contextTypes } = summary;

  const questionTypeIcon = <Layers className="h-4 w-4 text-indigo-500" />;
  const answerFormatIcon = <FileText className="h-4 w-4 text-rose-500" />;
  const answerRequirementIcon = <Link className="h-4 w-4 text-emerald-500" />;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Question Support Coverage</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Snapshot of detected question types, answer entry formats, and marking logic so you can cross-check the JSON payload
            against the authoring workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/40">
          <Target className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{totalQuestions} questions</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Shapes className="h-4 w-4 text-sky-500" />
            <span>Question structures</span>
          </div>
          <CountPills title="Type distribution" icon={questionTypeIcon} items={summary.questionTypeCounts} />
          <div className="space-y-2">
            <FlagIndicator
              label="Parts detected"
              description={structureFlags.hasParts ? 'Multi-part questions present.' : 'No structured parts detected yet.'}
              status={structureFlags.hasParts ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Sub-parts detected"
              description={structureFlags.hasSubparts ? 'Nested sub-parts present for tiered marking.' : 'No sub-part tiers in this batch.'}
              status={structureFlags.hasSubparts ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Figures & attachments"
              description={structureFlags.hasFigures || structureFlags.hasAttachments ? 'Diagrams, tables, or file uploads detected.' : 'All questions are text-only.'}
              status={structureFlags.hasFigures || structureFlags.hasAttachments ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Interactive options"
              description={structureFlags.hasOptions ? 'Multiple choice or input options detected.' : 'No interactive options provided.'}
              status={structureFlags.hasOptions ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Matching grids"
              description={structureFlags.hasMatching ? 'Matching or pairing exercises present.' : 'No matching grids detected.'}
              status={structureFlags.hasMatching ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Sequencing flows"
              description={structureFlags.hasSequencing ? 'Ordering or sequencing tasks identified.' : 'No sequencing logic detected.'}
              status={structureFlags.hasSequencing ? 'active' : 'inactive'}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <FileText className="h-4 w-4 text-rose-500" />
            <span>Answer entry coverage</span>
          </div>
          <CountPills title="Answer formats" icon={answerFormatIcon} items={summary.answerFormatCounts} />
          <CountPills title="Option variants" icon={<ListChecks className="h-4 w-4 text-purple-500" />} items={optionTypeCounts} />
          <FlagIndicator
            label="Manual marking required"
            description={logicFlags.manualMarking ? 'At least one answer format needs human verification.' : 'All detected formats can be auto-marked.'}
            status={logicFlags.manualMarking ? 'active' : 'inactive'}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <GitBranch className="h-4 w-4 text-emerald-500" />
            <span>Marking logic</span>
          </div>
          <CountPills title="Requirement logic" icon={answerRequirementIcon} items={summary.answerRequirementCounts} />
          <div className="space-y-2">
            <FlagIndicator
              label="Alternative/linked answers"
              description={logicFlags.alternativeLinking ? 'AND/OR or alternative chains detected.' : 'No alternative logic detected.'}
              status={logicFlags.alternativeLinking ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="All-required combinations"
              description={logicFlags.allRequired ? 'At least one marking point requires all listed responses.' : 'No “all required” combinations detected.'}
              status={logicFlags.allRequired ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Any-from logic"
              description={logicFlags.anyOf ? 'Detected “any of” style requirements in the mark scheme.' : 'No optional pick lists detected.'}
              status={logicFlags.anyOf ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Alternative methods accepted"
              description={logicFlags.alternativeMethods ? 'Mark scheme references alternative methods or approaches.' : 'No alternative method phrasing detected.'}
              status={logicFlags.alternativeMethods ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Component marking"
              description={logicFlags.componentMarking ? 'Marks split across parts or subparts.' : 'Single-block questions only.'}
              status={logicFlags.componentMarking ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Partial credit logic"
              description={logicFlags.partialCredit ? 'Partial or tiered credit rules detected.' : 'No partial credit patterns present.'}
              status={logicFlags.partialCredit ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Error carried forward"
              description={logicFlags.errorCarriedForward ? 'Error carried forward (ECF) handling required.' : 'No ECF references detected.'}
              status={logicFlags.errorCarriedForward ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Reverse arguments"
              description={logicFlags.reverseArgument ? 'Reverse argument (ORA) acceptance detected.' : 'No reverse argument markers found.'}
              status={logicFlags.reverseArgument ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Equivalent phrasing"
              description={logicFlags.acceptsEquivalentPhrasing ? 'OWTTE or equivalent phrasing allowed.' : 'No equivalent phrasing signals found.'}
              status={logicFlags.acceptsEquivalentPhrasing ? 'active' : 'inactive'}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span>Teacher-facing signals</span>
          </div>
          <CountPills title="Context types" icon={<MapPin className="h-4 w-4 text-amber-500" />} items={contextTypes} />
          <div className="space-y-2">
            <FlagIndicator
              label="Context metadata"
              description={structureFlags.hasContext ? 'Answers carry units or contextual qualifiers.' : 'No context metadata attached to answers.'}
              status={structureFlags.hasContext ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Hints captured"
              description={structureFlags.hasHints ? 'At least one question includes a hint for students.' : 'No hints provided in this JSON.'}
              status={structureFlags.hasHints ? 'active' : 'inactive'}
            />
            <FlagIndicator
              label="Explanations captured"
              description={structureFlags.hasExplanations ? 'Worked explanations detected for review or teaching.' : 'No step-by-step explanations included.'}
              status={structureFlags.hasExplanations ? 'active' : 'inactive'}
            />
          </div>
          <FlagIndicator
            label="Multi-mark allocations"
            description={logicFlags.multiMark ? 'Detected questions with multi-mark allocations or tiered marks.' : 'All questions are single-mark.'}
            status={logicFlags.multiMark ? 'active' : 'inactive'}
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionSupportMatrix;
