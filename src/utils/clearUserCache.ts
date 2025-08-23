// src/utils/clearUserCache.ts
/**
 * Utility to clear all cached user data
 * Call this on logout or when user needs fresh data
 */

export function clearAllUserCache() {
  console.log('Clearing all user cache...');
  
  // Clear localStorage items
  const keysToRemove = [
    'supabase.auth.token',
    'authenticated_user',
    'user_permissions',
    'user_scope',
    'ggk_remember_session',
    'ggk_remembered_email'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear all items that start with specific prefixes
  const prefixesToClear = ['sb-', 'supabase', 'permission', 'scope', 'admin'];
  
  Object.keys(localStorage).forEach(key => {
    if (prefixesToClear.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear React Query cache if available
  if (window.__REACT_QUERY_STATE__) {
    window.__REACT_QUERY_STATE__ = undefined;
  }
  
  console.log('✅ Cache cleared successfully');
}

// Add this to your logout function
export function handleLogoutWithCacheClear() {
  clearAllUserCache();
  window.location.href = '/signin';
}

// Force refresh function for testing
export function forceRefreshUserData() {
  clearAllUserCache();
  window.location.reload();
}