import { DELETE_ACCOUNT_ENDPOINT, LOGIN_ENDPOINT, PROFILE_ENDPOINT, REFRESH_ENDPOINT, REGISTER_ENDPOINT } from '@/constants/api';
import { apiCall } from '@/lib/apiCall';
import { AuthResponse, User } from '@/lib/types/auth';
import React from 'react';
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'



interface AuthStore {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, remember_me?: boolean) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    first_name: string;
    last_name: string
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;

  // Private helper methods
  _setTokens: (token: string, refreshToken: string, expiresAt: string) => void;
  _clearTokens: () => void;
}


export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        login: async (email: string, password: string, remember_me?: boolean) => {
          set({ isLoading: true, error: null });

          try {
            // Client-side validation
            if (!email.trim() || !password) {
              throw new Error('Email and password are required');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              throw new Error('Please enter a valid email address');
            }

            const response: AuthResponse = await apiCall(LOGIN_ENDPOINT, {
              method: 'POST',
              body: JSON.stringify({
                email: email.trim().toLowerCase(),
                password,
                remember_me
              }),
            });

            console.log("rsponse", response)
            if (response.success) {
              const { user, token, refresh_token, expires_at } = response.data;

              set({
                user,
                token,
                refreshToken: refresh_token,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });

              console.log('User logged in successfully:', user.username);
            } else {
              console.log("11")
              set({ error: response.message, isLoading: false });

              throw new Error(response.message || 'Login failed');
            }
          } catch (error) {
            console.log("22", error)
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        register: async (data: {
          email: string;
          password: string;
          username: string;
          first_name: string;
          last_name: string
        }) => {
          set({ isLoading: true, error: null });

          try {
            // Client-side validation
            if (!data.email.trim() || !data.password || !data.username.trim()) {
              throw new Error('All fields are required');
            }

            if (data.password.length < 8) {
              throw new Error('Password must be at least 8 characters long');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
              throw new Error('Please enter a valid email address');
            }

            // Sanitize input data
            const sanitizedData = {
              email: data.email.trim().toLowerCase(),
              password: data.password,
              username: data.username.trim(),
              first_name: data.first_name.trim(),
              last_name: data.last_name.trim()
            };

            const response: AuthResponse = await apiCall(REGISTER_ENDPOINT, {
              method: 'POST',
              body: JSON.stringify(sanitizedData),
            });

            if (response.success) {
              const { user, token, refresh_token, expires_at } = response.data;

              set({
                user,
                token,
                refreshToken: refresh_token,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });

              console.log('User registered successfully:', user.username);
            } else {
              throw new Error(response.message || 'Registration failed');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null
          });

          console.log('User logged out');

          // Optional: Call logout endpoint
          // apiCall(`${BASE_URL}/api/auth/logout`, { method: 'POST' })
          //   .catch(error => console.error('Logout API call failed:', error));
        },

        updateProfile: async (data: Partial<User>) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiCall(PROFILE_ENDPOINT, {
              method: 'PATCH',
              body: JSON.stringify(data),
            });

            if (response.success) {
              const currentUser = get().user;
              if (currentUser) {
                set({
                  user: { ...currentUser, ...response.data },
                  isLoading: false
                });
              }
            } else {
              throw new Error(response.message || 'Failed to update profile');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        deleteAccount: async () => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiCall(DELETE_ACCOUNT_ENDPOINT, {
              method: 'DELETE',
            });

            if (response.success) {
              // Clear all user data
              get().logout();
            } else {
              throw new Error(response.message || 'Failed to delete account');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Account deletion failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        refreshTokens: async (): Promise<boolean> => {
          try {
            const refreshToken = get().refreshToken;
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response: AuthResponse = await apiCall(REFRESH_ENDPOINT, {
              method: 'POST',
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (response.success) {
              const { token, refresh_token, expires_at } = response.data;
              set({
                token,
                refreshToken: refresh_token
              });
              return true;
            }

            return false;
          } catch (error) {
            console.error('Token refresh failed:', error);
            get().logout(); // Auto logout on refresh failure
            return false;
          }
        },

        clearError: () => set({ error: null }),

        setLoading: (loading: boolean) => set({ isLoading: loading }),

        // Private helper methods
        _setTokens: (token: string, refreshToken: string, expiresAt: string) => {
          set({ token, refreshToken });
        },

        _clearTokens: () => {
          set({ token: null, refreshToken: null });
        },
      }),
      {
        name: 'auth-storage', // LocalStorage key
        partialize: (state) => ({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user
        }), // Only persist these fields
      }
    )
  )
);

export const useUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);

export const useLogin = () => useAuthStore(state => state.login);
export const useRegister = () => useAuthStore(state => state.register);
export const useLogout = () => useAuthStore(state => state.logout);
export const useUpdateProfile = () => useAuthStore(state => state.updateProfile);
export const useDeleteAccount = () => useAuthStore(state => state.deleteAccount);
export const useClearError = () => useAuthStore(state => state.clearError);


export type { AuthStore };