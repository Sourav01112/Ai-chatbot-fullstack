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
  User, 
  Mail, 
  Edit3, 
  Save, 
  X, 
  Trash2, 
  AlertTriangle,
  Menu
} from 'lucide-react';

export default function Profile() {
  const { user, updateProfile, deleteAccount, preferences, updatePreferences } = useAuth();
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || ''
  });

  const handleToggleTheme = async () => {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light';
    await updatePreferences({ theme: newTheme });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      success('Profile updated', 'Your profile has been updated successfully.');
    } catch (err) {
      error('Update failed', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || ''
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await deleteAccount();
      success('Account deleted', 'Your account has been deleted successfully.');
    } catch (err) {
      error('Delete failed', 'Failed to delete account. Please try again.');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
                <h1 className="text-2xl font-bold">Profile Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account information
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Profile Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Profile Card */}
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                  <CardDescription>
                    Your personal account details
                  </CardDescription>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email (Read-only) */}
                <FormInput
                  label="Email Address"
                  value={user?.email || ''}
                  icon={<Mail className="h-4 w-4" />}
                  disabled
                />

                {/* Editable Fields */}
                <FormInput
                  name="username"
                  label="Username"
                  value={formData.username}
                  onChange={handleChange}
                  icon={<User className="h-4 w-4" />}
                  disabled={!isEditing}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    name="first_name"
                    label="First Name"
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    name="last_name"
                    label="Last Name"
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                {/* Edit Actions */}
                {isEditing && (
                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      variant="default"
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible account actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <h3 className="font-semibold text-destructive mb-2">
                      Delete Account
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all associated data. 
                      This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Confirm Account Deletion</span>
              </CardTitle>
              <CardDescription>
                This action cannot be undone. This will permanently delete your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you absolutely sure you want to delete your account? All your data will be permanently removed.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Account'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}