import React from 'react';
import { ShieldCheck, Lock, FileText } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const PrivacyPage = () => (
  <SimpleInfoPage
    title="Privacy Policy"
    description="We respect your data. Learn how GGK collects, stores, and protects learner and guardian information across our services."
    icon={ShieldCheck}
    highlights={[
      { title: 'Transparent data use', description: 'We only collect information required for learning analytics and account management.' },
      { title: 'Secure infrastructure', description: 'Data is encrypted at rest and in transit via industry-standard practices.' }
    ]}
    primaryLink={{ label: 'Contact data officer', to: '/contact' }}
    secondaryLink={{ label: 'Return to home', to: '/' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Lock className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Accounts use multi-factor authentication for staff access.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <FileText className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Full policy text is being finalised and will appear here soon.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default PrivacyPage;
