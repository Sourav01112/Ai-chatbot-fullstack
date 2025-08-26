import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CreditCard, 
  Zap, 
  Star, 
  Crown, 
  ExternalLink, 
  Check,
  Menu,
  BarChart3,
  MessageCircle,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Subscription() {
  const { preferences, updatePreferences } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleTheme = async () => {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light';
    await updatePreferences({ theme: newTheme });
  };

  // Mock subscription data
  const currentPlan = {
    name: 'Free Tier',
    price: '$0',
    period: 'month',
    features: [
      'Basic AI access',
      '100 messages per day',
      'Limited models',
      'Community support'
    ]
  };

  const usage = {
    messages: { used: 0, limit: 100 },
    conversations: { used: 0, limit: 10 }
  };

  const features = [
    {
      icon: MessageCircle,
      title: 'Unlimited Messages',
      description: 'Send unlimited messages to AI models'
    },
    {
      icon: Bot,
      title: 'Premium AI Models',
      description: 'Access to GPT-4, Claude-3, and more'
    },
    {
      icon: Zap,
      title: 'Faster Responses',
      description: 'Priority processing for quicker replies'
    },
    {
      icon: Star,
      title: 'Advanced Features',
      description: 'Custom personas, RAG, and more'
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="hidden md:flex"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Subscription</h1>
                <p className="text-muted-foreground">
                  Manage your plan and usage
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Subscription Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Current Plan */}
            <Card className="border-primary/20 bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span>Current Plan</span>
                </CardTitle>
                <CardDescription>
                  Your active subscription details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{currentPlan.name}</h3>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <span className="text-3xl font-bold text-foreground">{currentPlan.price}</span>
                      <span>/ {currentPlan.period}</span>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {currentPlan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="hero" size="lg" asChild>
                    <a href="https://x.ai/grok" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Upgrade to SuperAI
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Usage Meters */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Messages</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {usage.messages.used} / {usage.messages.limit}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(usage.messages.used / usage.messages.limit) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resets daily at midnight
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {usage.conversations.used} / {usage.conversations.limit}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(usage.conversations.used / usage.conversations.limit) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Concurrent conversation limit
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Premium Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-accent" />
                  <span>Unlock Premium Features</span>
                </CardTitle>
                <CardDescription>
                  Upgrade to SuperAI for unlimited access and advanced features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button variant="hero" size="lg" asChild className="glow-effect">
                    <a href="" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit SuperAI
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    External link to x.ai/grok - pricing details available there
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Billing Information</span>
                </CardTitle>
                <CardDescription>
                  Manage your payment methods and billing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Billing information coming soon</h3>
                  <p className="text-muted-foreground">
                    Payment management features will be available in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Subscription History */}
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle>Subscription History</CardTitle>
                <CardDescription>
                  View your past billing and subscription changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No billing history yet</h3>
                  <p className="text-muted-foreground">
                    Your subscription history will appear here once you upgrade.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}