// /src/components/layout/Header.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { getCurrentUser, isInTestMode, clearAuthenticatedUser, exitTestMode } from '../../lib/auth';
import { toast } from '../shared/Toast';

export function Header() {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const currentUser = getCurrentUser();
  const testMode = isInTestMode();

  const handleLogout = () => {
    // CRITICAL: Always clear test mode on logout
    if (testMode) {
      console.log('Clearing test mode on logout');
      exitTestMode();
    }
    
    // Clear authentication
    clearAuthenticatedUser();
    
    // Clear all session data
    sessionStorage.clear();
    
    // Show logout message
    toast.success('Logged out successfully');
    
    // Redirect to signin
    navigate('/signin');
  };

  if (!currentUser) return null;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Logo/Brand */}
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              GGK Admin
            </span>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {currentUser.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser.role}
                  {testMode && <span className="ml-1 text-orange-500">(Test Mode)</span>}
                </p>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <button
                    onClick={() => navigate('/app/system-admin/profile')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <User className="inline h-4 w-4 mr-2" />
                    Profile
                  </button>
                  
                  <hr className="my-1 border-gray-200 dark:border-gray-600" />
                  
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="inline h-4 w-4 mr-2" />
                    Logout
                    {testMode && <span className="text-xs ml-1">(Ends Test Mode)</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}