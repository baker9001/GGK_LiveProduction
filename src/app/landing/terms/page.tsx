import React from 'react';
import { FileText, Scale, HelpCircle } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const TermsPage = () => (
  <SimpleInfoPage
    title="Terms of Service"
    description="Understand the agreement between GGK and our learners, guardians, and partner schools. Full legal copy is on the way."
    icon={FileText}
    highlights={[
      { title: 'Fair usage', description: 'Guidelines that keep our platform safe for every student community.' },
      { title: 'Licensing', description: 'Details on school-wide deployments and permitted classroom use.' }
    ]}
    primaryLink={{ label: 'Reach legal support', to: '/contact' }}
    secondaryLink={{ label: 'Head back home', to: '/' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Scale className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>We comply with Cambridge and Pearson partnership requirements.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <HelpCircle className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Questions? Our support team can clarify anything that is unclear.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default TermsPage;
