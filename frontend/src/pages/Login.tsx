
// pages/Login.tsx
import { useLogin, useAuthError, useAuthLoading, useIsAuthenticated, useClearError } from "../store/index";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/toast-provider';
import { MessageCircle, Mail, Lock } from 'lucide-react';



const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const loginFunc = useLogin();
  const clearError = useClearError();
  const isLoading = useAuthLoading();
  const error = useAuthError();
  const isAuthenticated = useIsAuthenticated();
  
  const navigate = useNavigate();
  const location = useLocation();

  console.log("isAuthenticated", isAuthenticated)
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginFunc(email, password, rememberMe);
      // Navigation will happen automatically due to useEffect above
    } catch (error) {
      // Error is already handled by the store
      console.error("Login failed:", error);
    }
  };

  return (
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
                <Link to="/" className="inline-flex items-center space-x-2">
                    <MessageCircle className="h-8 w-8 text-primary" />
                    <span className="text-2xl font-bold gradient-text">AIChatOps</span>
                </Link>
            </div>

            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    <CardDescription>
                        Sign in to your account to continue your AI conversations
                    </CardDescription>
                </CardHeader>
                   {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInput
                            name="email"
                            type="email"
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            // onChange={handleChange}
                            // error={errors.email}
                            icon={<Mail className="h-4 w-4" />}
                            required
                        />

                        <FormInput
                            name="password"
                            type="password"
                            label="Password"
                            placeholder="Enter your password"
                            // value={formData.password}
                            // onChange={handleChange}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            minLength={8}
                            // error={errors.password}
                            icon={<Lock className="h-4 w-4" />}
                            required
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    id="remember-me"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={isLoading}

                                    type="checkbox"
                                    name="remember_me"
                                    className="rounded border-border"
                                />
                                <span className="text-sm text-muted-foreground">Remember me</span>
                            </label>
                            <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                disabled
                            >
                                Forgot password?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="hero"
                            size="lg"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary hover:underline font-medium">
                                Create one now
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>


    // <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    //   <Card className="w-full max-w-md">
    //     <CardHeader className="text-center">
    //       <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
    //       <CardDescription>Enter your credentials to access your account</CardDescription>
    //     </CardHeader>
    //     <CardContent>
    //       {error && (
    //         <Alert variant="destructive" className="mb-4">
    //           <AlertDescription>{error}</AlertDescription>
    //         </Alert>
    //       )}

    //       <form onSubmit={handleSubmit} className="space-y-4">
    //         <div>
    //           <Input
    //             type="email"
    //             placeholder="Email address"
    //             value={email}
    //             onChange={(e) => setEmail(e.target.value)}
    //             disabled={isLoading}
    //             required
    //           />
    //         </div>
            
    //         <div>
    //           <Input
    //             type="password"
    //             placeholder="Password"
    //             value={password}
    //             onChange={(e) => setPassword(e.target.value)}
    //             required
    //             disabled={isLoading}
    //             minLength={8}
    //           />
    //         </div>

    //         <div className="flex items-center">
    //           <input
    //             id="remember-me"
    //             type="checkbox"
    //             checked={rememberMe}
    //             onChange={(e) => setRememberMe(e.target.checked)}
    //             className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    //             disabled={isLoading}
    //           />
    //           <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
    //             Remember me
    //           </label>
    //         </div>

    //         <Button type="submit" className="w-full" disabled={isLoading}>
    //           {isLoading ? (
    //             <>
    //               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    //               Signing in...
    //             </>
    //           ) : (
    //             "Sign in"
    //           )}
    //         </Button>
    //       </form>

    //       <div className="mt-4 text-center">
    //         <p className="text-sm text-gray-600">
    //           Don't have an account?{" "}
    //           <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium">
    //             Register here
    //           </Link>
    //         </p>
    //       </div>
    //     </CardContent>
    //   </Card>
    // </div>




  );
};

export default Login;

// import React, { useState } from 'react';
// import { Link, useNavigate, useLocation } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { FormInput } from '@/components/ui/form-input';
// import { LoadingSpinner } from '@/components/ui/loading-spinner';
// import { useAuth } from '@/contexts/AuthContext';
// import { useToast } from '@/components/ui/toast-provider';
// import { MessageCircle, Mail, Lock } from 'lucide-react';

// export default function Login() {
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//     remember_me: false
//   });
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [isLoading, setIsLoading] = useState(false);
  
//   const { login } = useAuth();
//   const { success, error } = useToast();
//   const navigate = useNavigate();
//   const location = useLocation();
  
//   const from = location.state?.from?.pathname || '/dashboard';

//   const validateForm = () => {
//     const newErrors: Record<string, string> = {};
    
//     if (!formData.email) {
//       newErrors.email = 'Email is required';
//     } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
//       newErrors.email = 'Please enter a valid email';
//     }
    
//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     }
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!validateForm()) return;
    
//     setIsLoading(true);
    
//     try {
//       await login(formData.email, formData.password, formData.remember_me);
//       success('Welcome back!', 'You have been logged in successfully.');
//       navigate(from, { replace: true });
//     } catch (err) {
//       error('Login failed', 'Please check your credentials and try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value, type, checked } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === 'checkbox' ? checked : value
//     }));
//     if (errors[name]) {
//       setErrors(prev => ({ ...prev, [name]: '' }));
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
//       <div className="w-full max-w-md">
//         {/* Logo */}
//         <div className="text-center mb-8">
//           <Link to="/" className="inline-flex items-center space-x-2">
//             <MessageCircle className="h-8 w-8 text-primary" />
//             <span className="text-2xl font-bold gradient-text">AIChatOps</span>
//           </Link>
//         </div>

//         <Card className="shadow-lg">
//           <CardHeader className="text-center">
//             <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
//             <CardDescription>
//               Sign in to your account to continue your AI conversations
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <FormInput
//                 name="email"
//                 type="email"
//                 label="Email"
//                 placeholder="Enter your email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 error={errors.email}
//                 icon={<Mail className="h-4 w-4" />}
//                 required
//               />

//               <FormInput
//                 name="password"
//                 type="password"
//                 label="Password"
//                 placeholder="Enter your password"
//                 value={formData.password}
//                 onChange={handleChange}
//                 error={errors.password}
//                 icon={<Lock className="h-4 w-4" />}
//                 required
//               />

//               <div className="flex items-center justify-between">
//                 <label className="flex items-center space-x-2 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     name="remember_me"
//                     checked={formData.remember_me}
//                     onChange={handleChange}
//                     className="rounded border-border"
//                   />
//                   <span className="text-sm text-muted-foreground">Remember me</span>
//                 </label>
//                 <button
//                   type="button"
//                   className="text-sm text-primary hover:underline"
//                   disabled
//                 >
//                   Forgot password?
//                 </button>
//               </div>

//               <Button
//                 type="submit"
//                 variant="hero"
//                 size="lg"
//                 className="w-full"
//                 disabled={isLoading}
//               >
//                 {isLoading ? (
//                   <>
//                     <LoadingSpinner size="sm" className="mr-2" />
//                     Signing in...
//                   </>
//                 ) : (
//                   'Sign In'
//                 )}
//               </Button>
//             </form>

//             <div className="mt-6 text-center">
//               <p className="text-sm text-muted-foreground">
//                 Don't have an account?{' '}
//                 <Link to="/register" className="text-primary hover:underline font-medium">
//                   Create one now
//                 </Link>
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }