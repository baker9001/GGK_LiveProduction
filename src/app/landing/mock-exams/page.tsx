import React from 'react';
import { FileQuestion, Timer, TrendingUp } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const MockExamsPage = () => (
  <SimpleInfoPage
    title="Mock Exam Platform"
    description="Run timed Cambridge and Edexcel style mock exams with instant analytics and examiner-style feedback."
    icon={FileQuestion}
    status="Coming soon"
    highlights={[
      { title: 'Adaptive papers', description: 'Dynamic mocks that match the difficulty of real exam sessions.' },
      { title: 'Instant reports', description: 'Performance summaries with focus areas and improvement tips.' }
    ]}
    primaryLink={{ label: 'Preview resources', to: '/resources' }}
    secondaryLink={{ label: 'Request beta access', to: '/contact' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <Timer className="w-5 h-5 text-[#8CC63F]" />
        <span>Real exam timers and pause controls</span>
      </div>
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <TrendingUp className="w-5 h-5 text-[#8CC63F]" />
        <span>Track progress across every sitting</span>
      </div>
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <FileQuestion className="w-5 h-5 text-[#8CC63F]" />
        <span>Past paper style question banks</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default MockExamsPage;
