'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  description?: string;
}

export default function Sidebar() {
  const { user, isAdmin, isGuest, hasAdminAccess } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  // Admin Navigation
  const adminNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: 'D', description: 'Overview and analytics' },
    { name: 'Users', href: '/admin/users', icon: 'U', description: 'Manage users and roles' },
    { name: 'Campaigns', href: '/admin/campaigns', icon: 'C', description: 'Manage all campaigns' },
    { name: 'Donations', href: '/admin/donations', icon: '$', description: 'Monitor all donations' },
    { name: 'Totals', href: '/admin/totals', icon: 'T', description: 'Financial reports' },
    { name: 'Chat', href: '/admin/chat', icon: 'M', description: 'Support conversations' },
  ];

  // Regular User Navigation
  const userNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: 'D', description: 'Your donation summary' },
    { name: 'Running Campaigns', href: '/campaigns', icon: 'R', description: 'Active campaigns' },
    { name: 'Chat with Admin', href: '/chat', icon: 'M', description: 'Get support' },
  ];

  // Guest Navigation (very limited)
  const guestNavigation: NavigationItem[] = [
    { name: 'Campaigns', href: '/campaigns', icon: 'C', description: 'Support causes anonymously' },
  ];

  // Select navigation based on user role
  let navigation: NavigationItem[];
  if (isGuest) {
    navigation = guestNavigation;
  } else if (isAdmin) {
    navigation = adminNavigation;
  } else {
    navigation = userNavigation;
  }

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-black rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-black">CareForAll</h1>
            <p className="text-xs text-gray-500 capitalize">
              {isGuest ? 'Guest User' : user.role.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">
              {user.name}
              {isGuest && <span className="text-gray-500 ml-1">(Guest)</span>}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email || 'Guest User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`w-full text-left p-3 rounded-md transition-colors duration-200 group ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center font-semibold ${
                  isActive ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${isActive ? 'text-white' : 'text-black'}`}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div className={`text-xs mt-1 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Special Notices */}
      <div className="p-4 border-t border-gray-200">
        {isGuest && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <div>
              <p className="text-sm font-medium text-black">Guest Mode</p>
              <p className="text-xs text-gray-600 mt-1">
                You can donate anonymously. Create an account to track your impact!
              </p>
              <button
                onClick={() => router.push('/auth')}
                className="text-xs text-black hover:text-gray-600 font-medium mt-2 block underline"
              >
                Create Account
              </button>
            </div>
          </div>
        )}
        
        {!isGuest && !hasAdminAccess && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <div>
              <p className="text-sm font-medium text-black">Make a Difference</p>
              <p className="text-xs text-gray-600 mt-1">
                Every donation helps change lives. Thank you for caring!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
