// stores/preferencesStore.ts
import { PREFERENCES_ENDPOINT } from '@/constants/api';
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

interface Preferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  ai_preferences: {
    default_persona: string;
    temperature: number;
    max_tokens: number;
    enable_rag: boolean;
    preferred_models: string[];
  };
}

interface PreferencesStore {
  // State
  preferences: Preferences;
  isLoading: boolean;
  error: string | null;

  // Actions
  updatePreferences: (data: Partial<Preferences>) => Promise<void>;
  updateTheme: (theme: 'light' | 'dark') => void;
  updateLanguage: (language: string) => void;
  updateAIPreferences: (aiPrefs: Partial<Preferences['ai_preferences']>) => Promise<void>;
  resetPreferences: () => void;
  clearError: () => void;
}

// Default preferences
const defaultPreferences: Preferences = {
  theme: 'light',
  language: 'en',
  timezone: 'India/Mumbai',
  notifications_enabled: true,
  email_notifications: true,
  ai_preferences: {
    default_persona: 'helpful',
    temperature: 0.7,
    max_tokens: 1024,
    enable_rag: false,
    preferred_models: ['gpt-4']
  }
};


// API utility (you can also import this from a shared utils file)
const apiCall = async (url: string, options: RequestInit = {}): Promise<any> => {
  // Import auth store to get token
  const { useAuthStore } = await import('./auth');
  const token = useAuthStore.getState().token;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};

// Theme utility function
const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// Create preferences store
export const usePreferencesStore = create<PreferencesStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        preferences: defaultPreferences,
        isLoading: false,
        error: null,

        // Actions
        updatePreferences: async (data: Partial<Preferences>) => {
          set({ isLoading: true, error: null });

          try {
            // Optimistic update
            const currentPrefs = get().preferences;
            const newPrefs = { ...currentPrefs, ...data };
            set({ preferences: newPrefs });

            // Apply theme immediately if changed
            if (data.theme) {
              applyTheme(data.theme);
            }

            // Sync with server
            const response = await apiCall(PREFERENCES_ENDPOINT, {
              method: 'PATCH',
              body: JSON.stringify(data),
            });

            if (!response.success) {
              // Revert on failure
              set({ preferences: currentPrefs });
              if (data.theme) {
                applyTheme(currentPrefs.theme);
              }
              throw new Error(response.message || 'Failed to update preferences');
            }

            set({ isLoading: false });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        updateTheme: (theme: 'light' | 'dark') => {
          set((state) => ({
            preferences: { ...state.preferences, theme }
          }));
          applyTheme(theme);

          // Async sync with server (don't wait)
          get().updatePreferences({ theme }).catch(console.error);
        },

        updateLanguage: (language: string) => {
          set((state) => ({
            preferences: { ...state.preferences, language }
          }));

          // Async sync with server
          get().updatePreferences({ language }).catch(console.error);
        },

        updateAIPreferences: async (aiPrefs: Partial<Preferences['ai_preferences']>) => {
          const currentAIPrefs = get().preferences.ai_preferences;
          const newAIPrefs = { ...currentAIPrefs, ...aiPrefs };

          await get().updatePreferences({
            ai_preferences: newAIPrefs
          });
        },

        resetPreferences: () => {
          set({
            preferences: defaultPreferences,
            error: null
          });
          applyTheme(defaultPreferences.theme);

          // Async sync with server
          get().updatePreferences(defaultPreferences).catch(console.error);
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'preferences-storage',
        partialize: (state) => ({
          preferences: state.preferences
        }),
      }
    )
  )
);

// Apply theme on store initialization
usePreferencesStore.subscribe(
  (state) => state.preferences.theme,
  (theme) => applyTheme(theme),
  { fireImmediately: true }
);

// Utility hooks
export const useTheme = () => usePreferencesStore((state) => state.preferences.theme);
export const useLanguage = () => usePreferencesStore((state) => state.preferences.language);
export const useAIPreferences = () => usePreferencesStore((state) => state.preferences.ai_preferences);
export const useNotificationsEnabled = () => usePreferencesStore(state => state.preferences.notifications_enabled)
export const useEmailNotificationsEnabled = () => usePreferencesStore(state => state.preferences.email_notifications)
export const useUpdatePreferences = () => usePreferencesStore(state => state.updatePreferences)
export const useUpdateTheme = () => usePreferencesStore(state => state.updateTheme)
export const useUpdateLanguage = () => usePreferencesStore(state => state.updateLanguage)
export const useUpdateAIPreferences = () => usePreferencesStore(state => state.updateAIPreferences)
export const useResetPreferences = () => usePreferencesStore(state => state.resetPreferences)
export const useclearError = () => usePreferencesStore(state => state.clearError)


// Preferences actions hook
// export const usePreferencesActions = () => usePreferencesStore((state) => ({
//   updatePreferences: state.updatePreferences,
//   updateTheme: state.updateTheme,
//   updateLanguage: state.updateLanguage,
//   updateAIPreferences: state.updateAIPreferences,
//   resetPreferences: state.resetPreferences,
//   clearError: state.clearError,
// }));


export type { Preferences, PreferencesStore };