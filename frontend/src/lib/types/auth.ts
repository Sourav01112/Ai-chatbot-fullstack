// src/lib/types/auth

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar?: string;
  created_at: string;
}

export interface Preferences {
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

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refresh_token: string;
    expires_at: string;
  };
}

