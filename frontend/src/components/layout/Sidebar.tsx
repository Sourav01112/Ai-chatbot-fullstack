import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Settings, CreditCard, LogOut, MessageCircle, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleTheme?: () => void;
}

export function Sidebar({ className, isCollapsed = false, onToggleTheme }: SidebarProps) {
  const { user, logout, preferences } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Preferences', href: '/preferences', icon: Settings },
    { name: 'Subscription', href: '/subscription', icon: CreditCard },
  ];

  return (
    <div className={cn(
      "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-4">
        {!isCollapsed ? (
          <h1 className="text-xl font-bold gradient-text">AI Chatbot</h1>
        ) : (
          <MessageCircle className="h-8 w-8 text-sidebar-primary" />
        )}
      </div>

      {/* User Info */}
      {user && !isCollapsed && (
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed && "justify-center"
              )
            }
          >
            <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-sidebar-border p-4 space-y-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={onToggleTheme}
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground",
            isCollapsed && "justify-center"
          )}
        >
          {preferences.theme === 'dark' ? (
            <Sun className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          ) : (
            <Moon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          )}
          {!isCollapsed && (
            <span>{preferences.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={logout}
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:text-destructive",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}