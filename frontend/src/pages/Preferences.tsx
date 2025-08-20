import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast-provider';
import { 
  Settings, 
  Palette, 
  Globe, 
  Clock, 
  Bell, 
  Bot, 
  Save,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Preferences() {
  const { preferences, updatePreferences } = useAuth();
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [formData, setFormData] = useState(preferences);

  const handleToggleTheme = async () => {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light';
    await updatePreferences({ theme: newTheme });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updatePreferences(formData);
      success('Preferences saved', 'Your preferences have been updated successfully.');
    } catch (err) {
      error('Save failed', 'Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Preferences', icon: Bot }
  ];

  const timezones = [
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' }
  ];

  const personas = [
    'helpful',
    'creative',
    'analytical',
    'friendly',
    'professional',
    'casual'
  ];

  const models = [
    'gpt-4',
    'gpt-3.5-turbo',
    'claude-3',
    'claude-2'
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
                <h1 className="text-2xl font-bold">Preferences</h1>
                <p className="text-muted-foreground">
                  Customize your AI chatbot experience
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              variant="hero"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Preferences Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 p-1 bg-muted rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Palette className="h-5 w-5" />
                      <span>Appearance</span>
                    </CardTitle>
                    <CardDescription>
                      Customize the look and feel of your interface
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-3 block">Theme</label>
                      <div className="flex space-x-3">
                        {['light', 'dark'].map((theme) => (
                          <button
                            key={theme}
                            onClick={() => handleChange('theme', theme)}
                            className={cn(
                              "flex-1 p-4 rounded-lg border text-left transition-colors",
                              formData.theme === theme
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <div className="font-medium capitalize">{theme}</div>
                            <div className="text-sm text-muted-foreground">
                              {theme === 'light' ? 'Clean and bright' : 'Easy on the eyes'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Language & Region</span>
                    </CardTitle>
                    <CardDescription>
                      Set your preferred language and timezone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full p-3 rounded-md border border-input bg-background"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Timezone</label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full p-3 rounded-md border border-input bg-background"
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Choose how you'd like to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Push Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications in your browser
                      </p>
                    </div>
                    <button
                      onClick={() => handleChange('notifications_enabled', !formData.notifications_enabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        formData.notifications_enabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                          formData.notifications_enabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <button
                      onClick={() => handleChange('email_notifications', !formData.email_notifications)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        formData.email_notifications ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                          formData.email_notifications ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bot className="h-5 w-5" />
                      <span>AI Behavior</span>
                    </CardTitle>
                    <CardDescription>
                      Customize how the AI responds to you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Default Persona</label>
                      <select
                        value={formData.ai_preferences.default_persona}
                        onChange={(e) => handleChange('ai_preferences.default_persona', e.target.value)}
                        className="w-full p-3 rounded-md border border-input bg-background"
                      >
                        {personas.map((persona) => (
                          <option key={persona} value={persona}>
                            {persona.charAt(0).toUpperCase() + persona.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Temperature: {formData.ai_preferences.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.ai_preferences.temperature}
                        onChange={(e) => handleChange('ai_preferences.temperature', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>More focused</span>
                        <span>More creative</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Max Tokens</label>
                      <input
                        type="number"
                        min="256"
                        max="4096"
                        step="256"
                        value={formData.ai_preferences.max_tokens}
                        onChange={(e) => handleChange('ai_preferences.max_tokens', parseInt(e.target.value))}
                        className="w-full p-3 rounded-md border border-input bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum length of AI responses
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Enable RAG</h3>
                        <p className="text-sm text-muted-foreground">
                          Use retrieval-augmented generation for better context
                        </p>
                      </div>
                      <button
                        onClick={() => handleChange('ai_preferences.enable_rag', !formData.ai_preferences.enable_rag)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          formData.ai_preferences.enable_rag ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                            formData.ai_preferences.enable_rag ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Models</CardTitle>
                    <CardDescription>
                      Select which AI models you'd like to use
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {models.map((model) => (
                        <div key={model} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={model}
                            checked={formData.ai_preferences.preferred_models.includes(model)}
                            onChange={(e) => {
                              const models = formData.ai_preferences.preferred_models;
                              if (e.target.checked) {
                                handleChange('ai_preferences.preferred_models', [...models, model]);
                              } else {
                                handleChange('ai_preferences.preferred_models', models.filter(m => m !== model));
                              }
                            }}
                            className="rounded border-border"
                          />
                          <label htmlFor={model} className="text-sm font-medium cursor-pointer">
                            {model.toUpperCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}