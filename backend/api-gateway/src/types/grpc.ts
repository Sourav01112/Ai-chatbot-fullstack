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






// ================================= CHAT types



// Chat Service Types

// Common interfaces
export interface Session {
  id: string;
  userId: string;
  title: string;
  status: string;
  settings?: SessionSettings;
  createdAt?: {
    seconds: number;
    nanos: number;
  };
  updatedAt?: {
    seconds: number;
    nanos: number;
  };
  lastActivity?: {
    seconds: number;
    nanos: number;
  };
}

export interface SessionSettings {
  aiPersona: string;
  temperature: number;
  maxTokens: number;
  enableRag: boolean;
  documentSources: string[];
  systemPrompt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  type: string;
  metadata?: MessageMetadata;
  createdAt?: {
    seconds: number;
    nanos: number;
  };
  parentMessageId?: string;
  orderIndex: number;
}

export interface MessageMetadata {
  sourceCitations: { [key: string]: string };
  relevanceScore: number;
  tags: string[];
  modelUsed: string;
  tokenCount: number;
  responseTimeMs: number;
  processingSteps: string[];
}

// Session Request/Response types
export interface CreateSessionRequest {
  userId: string;
  title: string;
  settings?: SessionSettings;
}

export interface CreateSessionResponse {
  session?: Session;
  success: boolean;
  error?: string;
}

export interface GetSessionRequest {
  sessionId: string;
  userId: string;
}

export interface GetSessionResponse {
  session?: Session;
  success: boolean;
  error?: string;
}

export interface GetUserSessionsRequest {
  userId: string;
  limit: number;
  offset: number;
}

export interface GetUserSessionsResponse {
  sessions: Session[];
  totalCount: number;
  hasMore: boolean;
  success: boolean;
  error?: string;
}

export interface UpdateSessionRequest {
  sessionId: string;
  userId: string;
  title?: string;
  status?: string;
  settings?: SessionSettings;
}

export interface UpdateSessionResponse {
  session?: Session;
  success: boolean;
  error?: string;
}

export interface DeleteSessionRequest {
  sessionId: string;
  userId: string;
}

// Message Request/Response types
export interface SendMessageRequest {
  sessionId: string;
  userId: string;
  content: string;
  type: string;
  metadata?: MessageMetadata;
  parentMessageId?: string;
}

export interface SendMessageResponse {
  message?: Message;
  success: boolean;
  error?: string;
}

export interface GetChatHistoryRequest {
  sessionId: string;
  userId: string;
  limit: number;
  offset: number;
  fromDate?: {
    seconds: number;
    nanos: number;
  };
  toDate?: {
    seconds: number;
    nanos: number;
  };
}

export interface GetChatHistoryResponse {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
  success: boolean;
  error?: string;
}

export interface DeleteMessageRequest {
  messageId: string;
  userId: string;
}

export interface SearchMessagesRequest {
  sessionId: string;
  userId: string;
  query: string;
  limit: number;
  offset: number;
}

export interface SearchMessagesResponse {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
  success: boolean;
  error?: string;
}

export interface UpdateTypingStatusRequest {
  sessionId: string;
  userId: string;
  isTyping: boolean;
}

export interface GetTypingUsersRequest {
  sessionId: string;
}

export interface GetTypingUsersResponse {
  userIds: string[];
  success: boolean;
  error?: string;
}