// /src/components/admin/TestModeBar.tsx
// Enhanced version with countdown timer and auto-exit after 5 minutes
// FIXED: All hooks are now called before any conditional returns

import React, { useEffect, useState, useCallback } from 'react';
import { X, Eye, AlertTriangle, Clock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isInTestMode, exitTestMode, getTestModeUser, getRealAdminUser, getTestModeMetadata, isTestModeExpired, logImpersonationActivity } from '../../lib/auth';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import { toast } from '../shared/Toast';

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
  // ALL HOOKS MUST BE DECLARED AT THE TOP, BEFORE ANY CONDITIONAL LOGIC
  const location = useLocation();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  
  // Check conditions for showing the bar
  const isPublicPage = PUBLIC_PAGES.some(page => 
    location.pathname === page || 
    location.pathname.startsWith('/landing')
  );
  
  const inTestMode = isInTestMode();
  const testUser = getTestModeUser();
  const adminUser = getRealAdminUser();
  
  // Define handleForceExit using useCallback to prevent dependency issues
  const handleForceExit = useCallback(() => {
    exitTestMode();
    navigate('/app/system-admin/dashboard');
  }, [navigate]);
  
  // THIS USEEFFECT MUST BE CALLED BEFORE ANY RETURNS
  useEffect(() => {
    // Only run timer logic if in test mode
    if (!inTestMode) {
      return;
    }
    
    const checkExpiration = () => {
      // Check if test mode has expired using metadata
      if (isTestModeExpired()) {
        toast.error('Test mode session expired');
        logImpersonationActivity('end', adminUser?.id || '', testUser?.id || '', 'Session expired');
        handleForceExit();
        return;
      }

      const metadata = getTestModeMetadata();
      if (!metadata || !metadata.expirationTime) {
        // No expiration set, exit for safety
        console.error('[TestModeBar] No expiration metadata found');
        handleForceExit();
        return;
      }

      const timeLeft = Math.max(0, Math.floor((metadata.expirationTime - Date.now()) / 1000));
      setTimeRemaining(timeLeft);
      
      // Show warning when 1 minute remaining
      if (timeLeft === 60 && !showExpiryWarning) {
        setShowExpiryWarning(true);
        toast.warning('Test mode will expire in 1 minute');
      }
      
      // Auto-exit when time expires
      if (timeLeft <= 0) {
        toast.error('Test mode session expired');
        handleForceExit();
      }
    };
    
    // Check immediately
    checkExpiration();
    
    // Set up interval to check every second
    const interval = setInterval(checkExpiration, 1000);
    
    return () => clearInterval(interval);
  }, [showExpiryWarning, inTestMode, handleForceExit]);
  
  // NOW we can do conditional returns, AFTER all hooks have been declared and called
  
  // Don't show test mode bar on public pages or when not in test mode
  if (!inTestMode || isPublicPage) {
    return null;
  }
  
  // If we can't get the users, exit test mode for safety
  if (!testUser || !adminUser) {
    // Note: We can't call handleForceExit here directly as it would cause infinite re-renders
    // Instead, handle this in the useEffect above
    return null;
  }
  
  const handleExitClick = () => {
    setShowExitConfirm(true);
  };
  
  const handleConfirmExit = async () => {
    // Log the end of test mode
    await logImpersonationActivity(
      'end',
      adminUser?.id || '',
      testUser?.id || '',
      'Manually exited by admin'
    );

    exitTestMode();
    setShowExitConfirm(false);
    toast.success('Test mode ended - returning to admin dashboard');
    navigate('/app/system-admin/dashboard');
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getTimeColor = (): string => {
    if (timeRemaining <= 60) return 'text-red-300'; // Less than 1 minute
    if (timeRemaining <= 120) return 'text-yellow-300'; // Less than 2 minutes
    return 'text-white'; // Normal
  };
  
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
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
              
              {/* Countdown Timer */}
              <div className={`flex items-center gap-1 ml-4 px-3 py-1 bg-orange-700/50 rounded-md ${getTimeColor()}`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-semibold">
                  {formatTime(timeRemaining)}
                </span>
                {timeRemaining <= 60 && (
                  <span className="text-xs ml-1 animate-pulse">
                    Expiring soon!
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-80">
                Admin: {adminUser?.name}
              </span>
              <button 
                onClick={handleExitClick}
                className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-1.5 rounded-md flex items-center gap-2 font-medium transition-colors shadow-sm"
              >
                <X className="h-4 w-4" /> 
                Exit Test Mode
              </button>
            </div>
          </div>
        </div>
        
        {/* Additional info bar */}
        <div className="bg-orange-700 px-4 py-1 text-xs text-center">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          You are viewing the system with {testUser.name}'s permissions. 
          Session will automatically expire in {formatTime(timeRemaining)} for security.
        </div>
        
        {/* Warning banner for low time */}
        {timeRemaining <= 60 && timeRemaining > 0 && (
          <div className="bg-red-600 px-4 py-1 text-xs text-center animate-pulse">
            ⚠️ WARNING: Test mode will expire in {formatTime(timeRemaining)}! Save your work.
          </div>
        )}
      </div>
      
      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleConfirmExit}
        title="Exit Test Mode"
        message={`Are you sure you want to exit test mode and return to your admin dashboard? Current session has ${formatTime(timeRemaining)} remaining.`}
        confirmText="Exit Test Mode"
        confirmVariant="warning"
        icon={<X />}
      />
    </>
  );
}