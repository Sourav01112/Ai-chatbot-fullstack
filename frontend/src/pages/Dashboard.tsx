import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageCircle, 
  User, 
  Settings, 
  CreditCard, 
  Menu, 
  X, 
  Sparkles, 
  ArrowRight,
  Bot,
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const { user, preferences, updatePreferences } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleTheme = async () => {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light';
    await updatePreferences({ theme: newTheme });
  };

  const quickActions = [
    {
      title: 'Update Profile',
      description: 'Manage your account information',
      icon: User,
      href: '/profile',
      color: 'bg-blue-500'
    },
    {
      title: 'AI Preferences',
      description: 'Customize your AI experience',
      icon: Settings,
      href: '/preferences',
      color: 'bg-purple-500'
    },
    {
      title: 'Subscription',
      description: 'Manage your plan and billing',
      icon: CreditCard,
      href: '/subscription',
      color: 'bg-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <span className="text-lg font-bold gradient-text">AI Chatbot</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar onToggleTheme={handleToggleTheme} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="hidden md:flex"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome back, {user?.first_name}! 
                </h1>
                <p className="text-muted-foreground">
                  Ready to continue your AI conversations?
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Hero Card */}
            <Card className="relative overflow-hidden bg-gradient-card border-primary/20">
              <div className="absolute inset-0 bg-gradient-primary opacity-10" />
              <CardHeader className="relative">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">AI Chat Assistant</CardTitle>
                    <CardDescription className="text-lg">
                      Your intelligent conversation partner is ready
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Start a new conversation or continue where you left off.
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span>Powered by advanced AI models</span>
                    </div>
                  </div>
                  <Button variant="hero" size="lg" className="group" disabled>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Start Chatting
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Chat Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Chat Interface</span>
                </CardTitle>
                <CardDescription>
                  Your conversation interface (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-8 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Chat Coming Soon</h3>
                    <p className="text-muted-foreground">
                      We're working on bringing you an amazing chat experience. 
                      Stay tuned for updates!
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button variant="outline" disabled>
                      <Zap className="mr-2 h-4 w-4" />
                      Type your message...
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <Card key={index} className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                    <Link to={action.href}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg ${action.color} text-white`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {action.description}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Messages Today</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">AI Model</p>
                      <p className="text-lg font-bold">{preferences.ai_preferences.preferred_models[0] || 'GPT-4'}</p>
                    </div>
                    <Bot className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plan</p>
                      <p className="text-lg font-bold">Free Tier</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}