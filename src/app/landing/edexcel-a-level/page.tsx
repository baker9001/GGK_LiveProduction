import React from 'react';
import { LineChart, Brain, Target } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const EdexcelALevelPage = () => (
  <SimpleInfoPage
    title="Edexcel International A Level"
    description="Guided revision pathways for Pearson Edexcel A Level students, from topic consolidation to final exam rehearsal."
    icon={LineChart}
    highlights={[
      { title: 'Modular practice sets', description: 'AS and A2 question banks grouped by specification points.' },
      { title: 'Evidence-based feedback', description: 'Self-marking rubrics that mirror Edexcel mark schemes.' }
    ]}
    primaryLink={{ label: 'Discuss school partnerships', to: '/contact' }}
    secondaryLink={{ label: 'Preview revision notes', to: '/resources' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Brain className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Cognitive science-backed study schedules.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Target className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Exam technique clinics focusing on scoring strategies.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default EdexcelALevelPage;
