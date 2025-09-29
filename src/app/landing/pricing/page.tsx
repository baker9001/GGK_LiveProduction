import React from 'react';
import { CreditCard, Users, ShieldCheck } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const PricingPage = () => (
  <SimpleInfoPage
    title="Flexible Pricing"
    description="Transparent plans for students, parents, and schools. Choose between monthly access or annual bundles that include past papers, videos, and live feedback."
    icon={CreditCard}
    highlights={[
      { title: 'Student plans', description: 'Affordable monthly subscriptions with unlimited practice.' },
      { title: 'School partnerships', description: 'Multi-seat licences with centralised analytics dashboards.' }
    ]}
    primaryLink={{ label: 'Talk to our team', to: '/contact' }}
    secondaryLink={{ label: 'See resource coverage', to: '/resources' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex flex-col items-start gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <span className="font-semibold text-gray-900 dark:text-white">Starter</span>
        <p>Mock exams preview & weekly revision emails.</p>
      </div>
      <div className="flex flex-col items-start gap-2 bg-white dark:bg-gray-800 border-2 border-[#8CC63F] rounded-xl px-4 py-4 shadow-md">
        <span className="font-semibold text-gray-900 dark:text-white">Pro</span>
        <p>Unlimited past papers, analytics, and video lessons.</p>
      </div>
      <div className="flex flex-col items-start gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
        <span className="font-semibold text-gray-900 dark:text-white">Institution</span>
        <p>Multi-classroom dashboard, teacher seats, and onboarding.</p>
      </div>
    </div>
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-[#8CC63F]" />
        <span>Group discounts available</span>
      </div>
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-[#8CC63F]" />
        <span>Secure payments via Stripe</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default PricingPage;
