// App.tsx
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "./store/auth";
import { usePreferencesStore } from "./store/preference";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Preferences from "./pages/Preferences";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { token, refreshTokens, logout } = useAuthStore();
  
  useEffect(() => {
    const initializeApp = async () => {
      // If we have a token, verify it's still valid
      if (token) {
        try {
          // Optional: Add token verification endpoint call here
          // const isValid = await verifyToken(token);
          // if (!isValid) {
          //   await refreshTokens();
          // }
          console.log('App initialized with existing token');
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        }
      }
    };

    initializeApp();
  }, [token, refreshTokens, logout]);

  // Auto token refresh setup
  useEffect(() => {
    if (!token) return;

    // Set up periodic token refresh (every 10 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        await refreshTokens();
        console.log('Token refreshed automatically');
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        logout();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, [token, refreshTokens, logout]);

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppInitializer>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                 {/*  <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/preferences" element={
                  <ProtectedRoute>
                    <Preferences />
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <Subscription />
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } /> */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppInitializer>
          </BrowserRouter>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;


// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { AuthProvider } from "@/contexts/AuthContext";
// import { ToastProvider } from "@/components/ui/toast-provider";
// import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// import Landing from "./pages/Landing";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import Dashboard from "./pages/Dashboard";
// import Profile from "./pages/Profile";
// import Preferences from "./pages/Preferences";
// import Subscription from "./pages/Subscription";
// import NotFound from "./pages/NotFound";

// const queryClient = new QueryClient();

// const App = () => (
//       <ToastProvider>
//         <TooltipProvider>
//           <Toaster />
//           <Sonner />
//           <BrowserRouter>
//             <Routes>
//               <Route path="/" element={<Landing />} />
//               <Route path="/login" element={<Login />} />
//               <Route path="/register" element={<Register />} />
//               <Route path="/dashboard" element={
//                 <ProtectedRoute>
//                   <Dashboard />
//                 </ProtectedRoute>
//               } />
//               <Route path="/profile" element={
//                 <ProtectedRoute>
//                   <Profile />
//                 </ProtectedRoute>
//               } />
//               <Route path="/preferences" element={
//                 <ProtectedRoute>
//                   <Preferences />
//                 </ProtectedRoute>
//               } />
//               <Route path="/subscription" element={
//                 <ProtectedRoute>
//                   <Subscription />
//                 </ProtectedRoute>
//               } />
//               <Route path="/chat" element={
//                 <ProtectedRoute>
//                   <Dashboard />
//                 </ProtectedRoute>
//               } />
//               <Route path="*" element={<NotFound />} />
//             </Routes>
//           </BrowserRouter>
//         </TooltipProvider>
//       </ToastProvider>
// );

// export default App;
