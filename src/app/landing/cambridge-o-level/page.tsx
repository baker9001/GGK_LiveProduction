import React from 'react';
import { Compass, ClipboardList, Globe } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const CambridgeOLevelPage = () => (
  <SimpleInfoPage
    title="Cambridge O Level"
    description="Dedicated revision packs and teacher guidance to support Cambridge O Level classrooms across sciences, mathematics, and humanities."
    icon={Compass}
    highlights={[
      { title: 'Past paper walk-throughs', description: 'Annotated scripts that demonstrate full-mark responses.' },
      { title: 'Teacher toolkits', description: 'Lesson starters, worksheets, and assessment rubrics.' }
    ]}
    primaryLink={{ label: 'Contact academic support', to: '/contact' }}
    secondaryLink={{ label: 'View available materials', to: '/resources' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <ClipboardList className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Year-long schemes of work mapped to term assessments.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Globe className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Support for international centres with blended delivery.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default CambridgeOLevelPage;
