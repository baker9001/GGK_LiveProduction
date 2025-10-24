// /src/components/admin/TestModeBar.tsx

import React from 'react';
import { X, Eye, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { isInTestMode, exitTestMode, getTestModeUser, getRealAdminUser } from '../../lib/auth';

// List of public pages where test mode bar should NOT appear
const PUBLIC_PAGES = [
  '/',
  '/signin',
  '/forgot-password',
  '/reset-password',
  '/landing',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
];

export function TestModeBar() {
  const location = useLocation();
  
  // Don't show test mode bar on public pages
  const isPublicPage = PUBLIC_PAGES.some(page => 
    location.pathname === page || 
    location.pathname.startsWith('/landing')
  );
  
  // Only show if in test mode AND not on a public page
  if (!isInTestMode() || isPublicPage) {
    return null;
  }

  const testUser = getTestModeUser();
  const adminUser = getRealAdminUser();

  if (!testUser || !adminUser) {
    // If we can't get the users, exit test mode for safety
    exitTestMode();
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white shadow-lg">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <Eye className="h-5 w-5" />
              <span className="font-bold text-lg">TEST MODE ACTIVE</span>
            </div>
            <div className="border-l border-orange-400 pl-3">
              <span className="text-sm">
                Viewing as: <strong>{testUser.name}</strong> ({testUser.email})
              </span>
              <span className="text-xs ml-2 opacity-80">
                Role: {testUser.role}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs opacity-80">
              Admin: {adminUser?.name}
            </span>
            <button 
              onClick={exitTestMode}
              className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-1.5 rounded-md flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
              <X className="h-4 w-4" /> 
              Exit Test Mode
            </button>
          </div>
        </div>
      </div>
      
      {/* Additional info bar */}
      <div className="bg-orange-600 px-4 py-1 text-xs text-center">
        ⚠️ You are viewing the system with {testUser.name}'s permissions and access levels. Test mode will be cleared on logout.
      </div>
    </div>
  );
}