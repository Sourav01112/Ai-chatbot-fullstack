import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useClearError, useRegister, useAuthError, useAuthLoading, useIsAuthenticated } from "@/store/index";
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/toast-provider';
import { MessageCircle, Mail, Lock, User } from 'lucide-react';




const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    first_name: "",
    last_name: "",
  });


  const registerFunc = useRegister();
  const clearError = useClearError();
  const isLoading = useAuthLoading();
  const error = useAuthError();
  const isAuthenticated = useIsAuthenticated();
  
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    console.log(isAuthenticated)
    if (isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerFunc(formData);
      // Navigation will happen automatically due to useEffect above
    } catch (error) {
      console.error("Registration failed:", error);
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
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>
              Join thousands of users having intelligent conversations
            </CardDescription>
          </CardHeader>
          <CardContent>


             {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  name="first_name"
                  type="text"
                  label="First Name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  //error={errors.first_name}
                  icon={<User className="h-4 w-4" />}
                  required
                />

                <FormInput
                  name="last_name"
                  type="text"
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  //error={errors.last_name}
                  icon={<User className="h-4 w-4" />}
                  required
                />
              </div>

              <FormInput
                name="username"
                type="text"
                label="Username"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleInputChange}
                //error={errors.username}
                icon={<User className="h-4 w-4" />}
                required
              />

              <FormInput
                name="email"
                type="email"
                label="Email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleInputChange}
                //error={errors.email}
                icon={<Mail className="h-4 w-4" />}
                required
              />

              <FormInput
                name="password"
                type="password"
                label="Password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange}
                //error={errors.password}
                icon={<Lock className="h-4 w-4" />}
                required
              />

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
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in here
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
    //       <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
    //       <CardDescription>Sign up to get started with your account</CardDescription>
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
    //             name="email"
    //             type="email"
    //             placeholder="Email address"
    //             value={formData.email}
    //             onChange={handleInputChange}
    //             required
    //             disabled={isLoading}
    //           />
    //         </div>

    //         <div>
    //           <Input
    //             name="username"
    //             type="text"
    //             placeholder="Username"
    //             value={formData.username}
    //             onChange={handleInputChange}
    //             required
    //             disabled={isLoading}
    //           />
    //         </div>

    //         <div className="grid grid-cols-2 gap-4">
    //           <Input
    //             name="first_name"
    //             type="text"
    //             placeholder="First name"
    //             value={formData.first_name}
    //             onChange={handleInputChange}
    //             required
    //             disabled={isLoading}
    //           />
    //           <Input
    //             name="last_name"
    //             type="text"
    //             placeholder="Last name"
    //             value={formData.last_name}
    //             onChange={handleInputChange}
    //             required
    //             disabled={isLoading}
    //           />
    //         </div>
            
    //         <div>
    //           <Input
    //             name="password"
    //             type="password"
    //             placeholder="Password (min 8 characters)"
    //             value={formData.password}
    //             onChange={handleInputChange}
    //             required
    //             disabled={isLoading}
    //             minLength={8}
    //           />
    //         </div>

    //         <Button type="submit" className="w-full" disabled={isLoading}>
    //           {isLoading ? (
    //             <>
    //               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    //               Creating account...
    //             </>
    //           ) : (
    //             "Create account"
    //           )}
    //         </Button>
    //       </form>

    //       <div className="mt-4 text-center">
    //         <p className="text-sm text-gray-600">
    //           Already have an account?{" "}
    //           <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
    //             Sign in here
    //           </Link>
    //         </p>
    //       </div>
    //     </CardContent>
    //   </Card>
    // </div>
  );
};

export default Register;



























// import React, { useState } from 'react';


// import { Link, useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { FormInput } from '@/components/ui/form-input';
// import { LoadingSpinner } from '@/components/ui/loading-spinner';
// import { useToast } from '@/components/ui/toast-provider';
// import { MessageCircle, Mail, Lock, User } from 'lucide-react';

// export default function Register() {
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//     username: '',
//     first_name: '',
//     last_name: ''
//   });
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [isLoading, setIsLoading] = useState(false);
  
//   const { success, error } = useToast();
//   const navigate = useNavigate();

//   const validateForm = () => {
//     const newErrors: Record<string, string> = {};
    
//     if (!formData.email) {
//       newErrors.email = 'Email is required';
//     } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
//       newErrors.email = 'Please enter a valid email';
//     }
    
//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     } else if (formData.password.length < 8) {
//       newErrors.password = 'Password must be at least 8 characters';
//     } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
//       newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
//     }
    
//     if (!formData.username) {
//       newErrors.username = 'Username is required';
//     } else if (formData.username.length < 3) {
//       newErrors.username = 'Username must be at least 3 characters';
//     }
    
//     if (!formData.first_name) {
//       newErrors.first_name = 'First name is required';
//     }
    
//     if (!formData.last_name) {
//       newErrors.last_name = 'Last name is required';
//     }
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!validateForm()) return;
    
//     setIsLoading(true);
    
//     try {
//       // await register(formData);
//       success('Account created!', 'Welcome to AIChatOps. You can now start chatting.');
//       navigate('/dashboard');
//     } catch (err) {
//       error('Registration failed', 'Please check your information and try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//     // Clear error when user starts typing
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
//             <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
//             <CardDescription>
//               Join thousands of users having intelligent conversations with AI
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <FormInput
//                   name="first_name"
//                   type="text"
//                   label="First Name"
//                   placeholder="John"
//                   value={formData.first_name}
//                   onChange={handleInputChange}
//                   //error={errors.first_name}
//                   icon={<User className="h-4 w-4" />}
//                   required
//                 />

//                 <FormInput
//                   name="last_name"
//                   type="text"
//                   label="Last Name"
//                   placeholder="Doe"
//                   value={formData.last_name}
//                   onChange={handleInputChange}
//                   //error={errors.last_name}
//                   icon={<User className="h-4 w-4" />}
//                   required
//                 />
//               </div>

//               <FormInput
//                 name="username"
//                 type="text"
//                 label="Username"
//                 placeholder="johndoe"
//                 value={formData.username}
//                 onChange={handleInputChange}
//                 //error={errors.username}
//                 icon={<User className="h-4 w-4" />}
//                 required
//               />

//               <FormInput
//                 name="email"
//                 type="email"
//                 label="Email"
//                 placeholder="john@example.com"
//                 value={formData.email}
//                 onChange={handleInputChange}
//                 //error={errors.email}
//                 icon={<Mail className="h-4 w-4" />}
//                 required
//               />

//               <FormInput
//                 name="password"
//                 type="password"
//                 label="Password"
//                 placeholder="Create a strong password"
//                 value={formData.password}
//                 onChange={handleInputChange}
//                 //error={errors.password}
//                 icon={<Lock className="h-4 w-4" />}
//                 required
//               />

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
//                     Creating account...
//                   </>
//                 ) : (
//                   'Create Account'
//                 )}
//               </Button>
//             </form>

//             <div className="mt-6 text-center">
//               <p className="text-sm text-muted-foreground">
//                 Already have an account?{' '}
//                 <Link to="/login" className="text-primary hover:underline font-medium">
//                   Sign in here
//                 </Link>
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }