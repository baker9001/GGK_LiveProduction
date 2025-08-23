// Add this after the setAuthenticatedUser function

// SECURITY: Dispatch auth change event
export function dispatchAuthChange(): void {
  window.dispatchEvent(new Event('auth-change'));
}

// Update the setAuthenticatedUser function to dispatch event
export function setAuthenticatedUser(user: User): void {
  // Check if remember me is enabled
  const rememberMe = localStorage.getItem(REMEMBER_SESSION_KEY) === 'true';
  
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  const token = generateAuthToken(user, rememberMe);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  
  console.log(`Session created with ${rememberMe ? '30-day' : '24-hour'} expiration`);
  
  // SECURITY: Dispatch auth change event
  dispatchAuthChange();
}

// Update the clearAuthenticatedUser function to dispatch event
export function clearAuthenticatedUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TEST_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_SESSION_KEY);
  
  // SECURITY: Clear cached user scope
  localStorage.removeItem('user_scope_cache');
  localStorage.removeItem('last_user_id');
  
  // Clear remembered email only if user explicitly logs out
  // (not on session expiration)
  if (localStorage.getItem('ggk_user_logout') === 'true') {
    localStorage.removeItem('ggk_remembered_email');
    localStorage.removeItem('ggk_user_logout');
  }
  
  sessionStorage.clear();
  console.log('User logged out, all auth data cleared');
  
  // SECURITY: Dispatch auth change event
  dispatchAuthChange();
}