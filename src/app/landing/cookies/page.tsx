import React from 'react';
import { Cookie, Settings, Bell } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const CookiesPage = () => (
  <SimpleInfoPage
    title="Cookie Policy"
    description="How and why GGK uses cookies and similar technologies to improve learning experiences."
    icon={Cookie}
    highlights={[
      { title: 'Essential cookies', description: 'Keep you signed in securely and remember your subject preferences.' },
      { title: 'Analytics options', description: 'Help us improve course materials while respecting privacy controls.' }
    ]}
    primaryLink={{ label: 'Update consent choices', to: '/contact' }}
    secondaryLink={{ label: 'Back to homepage', to: '/' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Settings className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>Preference centre launching soon for fine-grained control.</span>
      </div>
      <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <Bell className="w-5 h-5 text-[#8CC63F] mt-1" />
        <span>We never use cookies for spam or unrelated advertising.</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default CookiesPage;
