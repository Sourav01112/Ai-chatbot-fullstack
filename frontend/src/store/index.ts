// src/store/index.ts

// Import store hooks/types from each module (auth, preference, etc)
import {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useLogin,
  useRegister,
  useClearError,
  useLogout,
  useUpdateProfile,
  useDeleteAccount,
  AuthStore
} from './auth';

import {
  usePreferencesStore,
  useTheme,
  useLanguage,
  useAIPreferences,
  useNotificationsEnabled,
  useEmailNotificationsEnabled,
  useUpdatePreferences,
  useUpdateTheme,
  useUpdateLanguage,
  useUpdateAIPreferences,
  useResetPreferences,
  useclearError,
  Preferences,
  PreferencesStore
} from './preference';

// Export all store hooks/types directly; do NOT use re-export syntax like export * from './auth'
export {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useLogin,
  useRegister,
  useClearError,
  useLogout,
  useUpdateProfile,
  useDeleteAccount,
  usePreferencesStore,
  useTheme,
  useLanguage,
  useAIPreferences,
  useNotificationsEnabled,
  useEmailNotificationsEnabled,
  useUpdatePreferences,
  useUpdateTheme,
  useUpdateLanguage,
  useUpdateAIPreferences,
  useResetPreferences,
  useclearError,
};

export type { AuthStore, Preferences, PreferencesStore };

// Utility functions (declare AFTER all exports)
export const resetAllStores = () => {
  useAuthStore.getState().logout();
  usePreferencesStore.getState().resetPreferences();
};

export const useGlobalLoading = () => {
  const authLoading = useAuthStore(state => state.isLoading);
  const prefsLoading = usePreferencesStore(state => state.isLoading);
  return authLoading || prefsLoading;
};

export const useGlobalError = () => {
  const authError = useAuthStore(state => state.error);
  const prefsError = usePreferencesStore(state => state.error);
  return authError || prefsError;
};

export const useIsAdmin = () => {
  return useAuthStore(state => state.user?.role === 'admin');
};

// Development helpers (bottom of file)
if (process.env.NODE_ENV === 'development') {
  (window as any).stores = {
    auth: useAuthStore,
    preferences: usePreferencesStore,
    reset: resetAllStores,
  };
}
