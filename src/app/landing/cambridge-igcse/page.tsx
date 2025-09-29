import React from 'react';
import { GraduationCap, BookOpen, LineChart } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const CambridgeIgcsePage = () => (
  <SimpleInfoPage
    title="Cambridge IGCSE Hub"
    description="Syllabus-aligned resources, mock exams, and revision guides for Cambridge IGCSE students across core and extended routes."
    icon={GraduationCap}
    highlights={[
      { title: '0580 Mathematics', description: 'Topic trackers, formula sheets, and graded practice questions.' },
      { title: 'Sciences & Languages', description: 'Past papers with mark schemes plus oral exam preparation tips.' }
    ]}
    primaryLink={{ label: 'Browse subjects', to: '/subjects' }}
    secondaryLink={{ label: 'Access past papers', to: '/resources' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <BookOpen className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Detailed study plans for each syllabus code.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <LineChart className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Progress dashboards highlighting strengths and gaps.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default CambridgeIgcsePage;
