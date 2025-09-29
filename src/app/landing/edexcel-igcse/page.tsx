import React from 'react';
import { Award, ClipboardCheck, BarChart3 } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const EdexcelIgcsePage = () => (
  <SimpleInfoPage
    title="Edexcel International GCSE Hub"
    description="Targeted support for Pearson Edexcel learners with structured revision checklists, examiner feedback, and digital practice papers."
    icon={Award}
    highlights={[
      { title: '4MA1 Mathematics', description: 'Exam board-specific worked solutions and formula reminders.' },
      { title: '4BI1 Biology', description: 'Interactive diagrams and practical-focused question banks.' }
    ]}
    primaryLink={{ label: 'Review subject coverage', to: '/subjects' }}
    secondaryLink={{ label: 'Download sample papers', to: '/resources' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <ClipboardCheck className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Syllabus checklists covering every assessment objective.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <BarChart3 className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Performance analytics tuned to Edexcel grading scales.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default EdexcelIgcsePage;
