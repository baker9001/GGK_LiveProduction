import React from 'react';
import { Layers, Microscope, Calculator } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const CambridgeALevelPage = () => (
  <SimpleInfoPage
    title="Cambridge International A Level"
    description="Advanced resources that extend IGCSE foundations into A Level mastery, covering sciences, mathematics, and humanities tracks."
    icon={Layers}
    highlights={[
      { title: 'Structured bridging units', description: 'Link IGCSE concepts to AS/A2 expectations with curated playlists.' },
      { title: 'Examiner-style walkthroughs', description: 'Step-by-step solutions for long-form questions and data response items.' }
    ]}
    primaryLink={{ label: 'Plan your progression', to: '/subjects' }}
    secondaryLink={{ label: 'Chat with an advisor', to: '/contact' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Microscope className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Practical skill boosters for lab-based subjects.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Calculator className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Pure and applied mathematics revision frameworks.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default CambridgeALevelPage;
