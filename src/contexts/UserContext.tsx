/**
 * File: /src/contexts/UserContext.tsx
 * 
 * SECURITY FIX: Properly refresh user context on login/logout
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, getCurrentUserSync, isInTestMode, getRealAdminUserSync } from '../lib/auth';

interface UserContextType {
  user: User | null;
  realAdminUser: User | null;
  isTestMode: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [realAdminUser, setRealAdminUser] = useState<User | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  const refreshUser = () => {
    const currentUser = getCurrentUser();
    const realAdmin = getRealAdminUser();
    const testMode = isInTestMode();
    
    // SECURITY: Log user changes
    if (currentUser?.id !== lastUserId) {
      console.log('[UserContext] User changed:', {
        oldUserId: lastUserId,
        newUserId: currentUser?.id,
        timestamp: new Date().toISOString()
      });
      setLastUserId(currentUser?.id || null);
    }
    
    setUser(currentUser);
    setRealAdminUser(realAdmin);
    setIsTestMode(testMode);
  };

  useEffect(() => {
    // Initial load
    refreshUser();
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      // SECURITY: Refresh on auth changes
      if (e.key === 'ggk_authenticated_user' || 
          e.key === 'test_mode_user' ||
          e.key === 'ggk_auth_token') {
        console.log('[UserContext] Auth storage changed, refreshing user');
        refreshUser();
      }
    };
    
    // Listen for custom auth events
    const handleAuthChange = () => {
      console.log('[UserContext] Auth event received, refreshing user');
      refreshUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-change', handleAuthChange);
    
    // Check periodically for changes (backup)
    const interval = setInterval(() => {
      const currentUser = getCurrentUser();
      if (currentUser?.id !== user?.id) {
        console.log('[UserContext] User mismatch detected, refreshing');
        refreshUser();
      }
    }, 5000); // Check every 5 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleAuthChange);
      clearInterval(interval);
    };
  }, [user?.id]);

  return (
    <UserContext.Provider value={{ 
      user, 
      realAdminUser,
      isTestMode,
      refreshUser 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}