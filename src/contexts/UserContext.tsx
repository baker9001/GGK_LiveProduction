// /src/contexts/UserContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, getCurrentUser, isInTestMode, getRealAdminUser } from '../lib/auth';

interface UserContextType {
  user: User | null;
  realAdminUser: User | null; // The actual admin when in test mode
  isTestMode: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [realAdminUser, setRealAdminUser] = useState<User | null>(getRealAdminUser());
  const [isTestMode, setIsTestMode] = useState(isInTestMode());

  const refreshUser = () => {
    setUser(getCurrentUser());
    setRealAdminUser(getRealAdminUser());
    setIsTestMode(isInTestMode());
  };

  useEffect(() => {
    refreshUser();
    
    // Listen for storage changes (in case test mode is started/stopped)
    const handleStorageChange = () => {
      refreshUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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