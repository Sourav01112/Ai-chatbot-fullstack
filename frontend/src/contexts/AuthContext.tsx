// import React, { createContext, useContext, useState, useEffect } from 'react';

// interface User {
//   id: string;
//   email: string;
//   username: string;
//   first_name: string;
//   last_name: string;
//   avatar?: string;
// }

// interface Preferences {
//   theme: 'light' | 'dark';
//   language: string;
//   timezone: string;
//   notifications_enabled: boolean;
//   email_notifications: boolean;
//   ai_preferences: {
//     default_persona: string;
//     temperature: number;
//     max_tokens: number;
//     enable_rag: boolean;
//     preferred_models: string[];
//   };
// }

// interface AuthContextType {
//   user: User | null;
//   preferences: Preferences;
//   isAuthenticated: boolean;
//   login: (email: string, password: string, remember_me?: boolean) => Promise<void>;
//   register: (data: { email: string; password: string; username: string; first_name: string; last_name: string }) => Promise<void>;
//   logout: () => void;
//   updateProfile: (data: Partial<User>) => Promise<void>;
//   updatePreferences: (data: Partial<Preferences>) => Promise<void>;
//   deleteAccount: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [preferences, setPreferences] = useState<Preferences>({
//     theme: 'light',
//     language: 'en',
//     timezone: 'America/New_York',
//     notifications_enabled: true,
//     email_notifications: true,
//     ai_preferences: {
//       default_persona: 'helpful',
//       temperature: 0.7,
//       max_tokens: 1024,
//       enable_rag: false,
//       preferred_models: ['gpt-4']
//     }
//   });
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const root = document.documentElement;
//     if (preferences.theme === 'dark') {
//       root.classList.add('dark');
//     } else {
//       root.classList.remove('dark');
//     }
//   }, [preferences.theme]);

//   const login = async (email: string, password: string, remember_me?: boolean) => {
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     const mockUser: User = {
//       id: '1',
//       email,
//       username: email.split('@')[0],
//       first_name: 'Test',
//       last_name: 'User'
//     };
    
//     setUser(mockUser);
//     setIsAuthenticated(true);
//     localStorage.setItem('auth_token', 'mock_token');
//   };

//   const register = async (data: { email: string; password: string; username: string; first_name: string; last_name: string }) => {
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     const userData: User = {
//       id: '1',
//       email: data.email,
//       username: data.username,
//       first_name: data.first_name,
//       last_name: data.last_name
//     };


//     console.log({userData})
    
  


//     setUser(userData);
//     setIsAuthenticated(true);
//     localStorage.setItem('auth_token', 'mock_token');
//   };

//   const logout = () => {
//     setUser(null);
//     setIsAuthenticated(false);
//     localStorage.removeItem('auth_token');
//   };

//   const updateProfile = async (data: Partial<User>) => {
//     await new Promise(resolve => setTimeout(resolve, 500));
    
//     if (user) {
//       setUser({ ...user, ...data });
//     }
//   };

//   const updatePreferences = async (data: Partial<Preferences>) => {
//     await new Promise(resolve => setTimeout(resolve, 500));
    
//     setPreferences(prev => ({ ...prev, ...data }));
//   };

//   const deleteAccount = async () => {
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     logout();
//   };

//   useEffect(() => {
//     const token = localStorage.getItem('auth_token');
//     if (token) {
//       const mockUser: User = {
//         id: '1',
//         email: 'user@example.com',
//         username: 'user',
//         first_name: 'Test',
//         last_name: 'user'
//       };
//       setUser(mockUser);
//       setIsAuthenticated(true);
//     }
//   }, []);

//   return (
//     <AuthContext.Provider value={{
//       user,
//       preferences,
//       isAuthenticated,
//       login,
//       register,
//       logout,
//       updateProfile,
//       updatePreferences,
//       deleteAccount
//     }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }