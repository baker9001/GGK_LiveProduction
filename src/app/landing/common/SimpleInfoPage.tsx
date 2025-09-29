import React from 'react';
import { Link } from 'react-router-dom';
import { type LucideIcon, CheckCircle } from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

interface HighlightItem {
  title: string;
  description?: string;
}

interface PageLink {
  label: string;
  to: string;
}

export interface SimpleInfoPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  highlights?: HighlightItem[];
  status?: string;
  primaryLink?: PageLink;
  secondaryLink?: PageLink;
  children?: React.ReactNode;
}

export function SimpleInfoPage({
  title,
  description,
  icon: Icon,
  highlights = [],
  status,
  primaryLink,
  secondaryLink,
  children
}: SimpleInfoPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#8CC63F] to-[#7AB635] flex items-center justify-center shadow-lg">
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {description}
          </p>
          {status && (
            <span className="inline-flex mt-6 px-4 py-1.5 rounded-full text-sm font-semibold bg-[#8CC63F]/10 text-[#4C7A1E] dark:text-[#A4E066]">
              {status}
            </span>
          )}
        </div>

        {highlights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {highlights.map((highlight) => (
              <div
                key={highlight.title}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm text-left"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold">{highlight.title}</h3>
                    {highlight.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{highlight.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {children}

        {(primaryLink || secondaryLink) && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryLink && (
              <Link
                to={primaryLink.to}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-[#8CC63F] to-[#7AB635] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                {primaryLink.label}
              </Link>
            )}
            {secondaryLink && (
              <Link
                to={secondaryLink.to}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-[#8CC63F] bg-[#8CC63F]/10 hover:bg-[#8CC63F]/20 transition-all duration-300"
              >
                {secondaryLink.label}
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default SimpleInfoPage;
