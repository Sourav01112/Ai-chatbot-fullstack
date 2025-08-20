export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt?: {
    seconds: number;
    nanos: number;
  };
  updatedAt?: {
    seconds: number;
    nanos: number;
  };
  lastLogin?: {
    seconds: number;
    nanos: number;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt?: {
    seconds: number;
    nanos: number;
  };
}

export interface AIPreferences {
  defaultPersona: string;
  temperature: number;
  maxTokens: number;
  enableRag: boolean;
  preferredModels: string[];
  customInstructions: string;
}

export interface UserPreferences {
  userId: string;
  theme: string;
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  aiPreferences?: AIPreferences;
  profileVisibility: string;
  dataSharing: boolean;
  createdAt?: {
    seconds: number;
    nanos: number;
  };
  updatedAt?: {
    seconds: number;
    nanos: number;
  };
}

// gRPC Response types
export interface VerifyTokenResponse {
  user?: User;
  valid: boolean;
  error?: string;
}

export interface RegisterResponse {
  user?: User;
  tokens?: TokenPair;
  success: boolean;
  error?: string;
}

export interface LoginResponse {
  user?: User;
  tokens?: TokenPair;
  success: boolean;
  error?: string;
}

export interface GetUserResponse {
  user?: User;
  success: boolean;
  error?: string;
}

export interface UpdateUserResponse {
  user?: User;
  success: boolean;
  error?: string;
}

export interface GetPreferencesResponse {
  preferences?: UserPreferences;
  success: boolean;
  error?: string;
}

export interface UpdatePreferencesResponse {
  preferences?: UserPreferences;
  success: boolean;
  error?: string;
}

export interface RefreshTokenResponse {
  tokens?: TokenPair;
  success: boolean;
  error?: string;
}

// Request types
export interface VerifyTokenRequest {
  accessToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface GetUserRequest {
  userId: string;
}

export interface UpdateUserRequest {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string;
}

export interface GetPreferencesRequest {
  userId: string;
}

export interface UpdatePreferencesRequest {
  preferences: UserPreferences;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  userId: string;
  accessToken: string;
}

export interface DeleteUserRequest {
  userId: string;
}