// /src/lib/logout.ts

import { clearAuthenticatedUser, exitTestMode, isInTestMode } from './auth';

/**
 * Secure logout function that clears all session data
 * CRITICAL: Always clears test mode on logout
 */
export function secureLogout() {
  // 1. Clear test mode if active
  if (isInTestMode()) {
    console.warn('Test mode was active during logout - clearing for security');
    exitTestMode();
  }
  
  // 2. Clear authenticated user
  clearAuthenticatedUser();
  
  // 3. Clear all localStorage except theme preferences
  const themePreference = localStorage.getItem('theme');
  localStorage.clear();
  if (themePreference) {
    localStorage.setItem('theme', themePreference);
  }
  
  // 4. Clear sessionStorage
  sessionStorage.clear();
  
  // 5. Clear cookies (if any)
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // 6. Redirect to signin page
  window.location.href = '/signin';
}

/**
 * Check if user is logged in and handle test mode security
 */
export function checkAuthSecurity() {
  const authUser = localStorage.getItem('ggk_authenticated_user');
  const testMode = localStorage.getItem('test_mode_user');
  
  // If test mode exists but no authenticated user, clear test mode
  if (testMode && !authUser) {
    console.error('SECURITY: Test mode active without authenticated user - clearing');
    localStorage.removeItem('test_mode_user');
    return false;
  }
  
  return !!authUser;
}