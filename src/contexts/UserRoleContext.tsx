//home/project/src/contexts/UserRoleContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type UserRole, getUserRole } from '../lib/auth';

interface UserRoleContextType {
  role: UserRole | null;
  refreshRole: () => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(getUserRole());

  const refreshRole = () => {
    setRole(getUserRole());
  };

  useEffect(() => {
    refreshRole();
  }, []);

  return (
    <UserRoleContext.Provider value={{ role, refreshRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}