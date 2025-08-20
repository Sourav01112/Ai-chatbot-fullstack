import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Settings, CreditCard, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Preferences', href: '/preferences', icon: Settings },
    { name: 'Subscription', href: '/subscription', icon: CreditCard },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <nav className="flex">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}