
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, FileText, Menu, X, Settings as SettingsIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import clsx from 'clsx';
import { AppPlatform, AppTheme } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const themes: Record<AppTheme, { bg: string, sidebar: string, text: string, primary: string, accent: string }> = {
  blue: { bg: 'bg-slate-50 dark:bg-slate-950', sidebar: 'bg-blue-600 dark:bg-blue-900', text: 'text-slate-900 dark:text-slate-100', primary: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-100 dark:bg-blue-900/30' },
  green: { bg: 'bg-stone-50 dark:bg-stone-950', sidebar: 'bg-emerald-700 dark:bg-emerald-900', text: 'text-stone-900 dark:text-stone-100', primary: 'text-emerald-700 dark:text-emerald-400', accent: 'bg-emerald-100 dark:bg-emerald-900/30' },
  purple: { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950', sidebar: 'bg-purple-700 dark:bg-purple-900', text: 'text-slate-900 dark:text-slate-100', primary: 'text-purple-700 dark:text-purple-400', accent: 'bg-purple-100 dark:bg-purple-900/30' },
  dark: { bg: 'bg-gray-900', sidebar: 'bg-gray-800', text: 'text-gray-100', primary: 'text-blue-400', accent: 'bg-gray-700' },
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Use a default object to prevent 'undefined' errors during initial load
  const profile = useLiveQuery(() => db.settings.get(1));
  
  // Platform Detection & Theming
  const [activePlatform, setActivePlatform] = useState<AppPlatform>('windows');
  
  useEffect(() => {
    if (profile?.platform) {
      setActivePlatform(profile.platform);
    } else {
      // Auto-detect
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setActivePlatform(isMobile ? 'android' : 'windows');
    }

    // Handle Dark Mode on HTML element
    const html = document.documentElement;
    if (profile?.darkMode === 'dark') {
      html.classList.add('dark');
    } else if (profile?.darkMode === 'light') {
      html.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, [profile]);

  // Safe theme access: Ensure we always have a valid theme object
  const themeKey = (profile?.theme && themes[profile.theme]) ? profile.theme : 'blue';
  const currentTheme = themes[themeKey];
  
  const isWindows = activePlatform === 'windows';
  
  // Platform specific styles
  const containerClass = isWindows 
    ? "max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6" // Windows: Compact, padded
    : "w-full px-4 py-4 pb-24"; // Android: Full width, padding for bottom nav

  const headerClass = isWindows
    ? `${currentTheme.sidebar} text-white shadow-lg sticky top-0 z-50 backdrop-blur-xl bg-opacity-90 transition-colors duration-300`
    : `bg-white dark:bg-gray-900 text-slate-800 dark:text-white sticky top-0 z-50 shadow-sm border-b border-gray-100 dark:border-gray-800`;

  const navLinkClass = (active: boolean) => isWindows
    ? clsx(
        'flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        active ? 'bg-white/20 text-white shadow-inner backdrop-blur-md' : 'text-white/80 hover:bg-white/10 hover:text-white'
      )
    : clsx(
        'flex flex-col items-center justify-center p-2 text-xs font-medium transition-all duration-200',
        active ? `${currentTheme.primary}` : 'text-slate-400 dark:text-slate-500'
      );

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'New Bill', path: '/billing', icon: ShoppingCart },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Inventory', path: '/inventory', icon: Package },
    { label: 'Parties', path: '/parties', icon: Users },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${currentTheme.bg}`}>
      
      {/* Top Header (Different for Win/Android) */}
      <header className={headerClass}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 font-display">
                <div className={clsx(
                  "w-10 h-10 flex items-center justify-center backdrop-blur-sm",
                  isWindows ? "bg-white/20 rounded-lg" : "bg-blue-100 dark:bg-blue-900 rounded-2xl text-blue-600 dark:text-blue-300"
                )}>
                   <FileText className="w-6 h-6" />
                </div>
                <span>{profile?.companyName || 'Gopi Distributors'}</span>
              </Link>
            </div>
            
            {/* Windows Desktop Nav */}
            {isWindows && (
              <nav className="hidden md:flex space-x-1">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} className={navLinkClass(isActive(item.path))}>
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Android/Mobile Menu Toggle (Right Side) */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={clsx("p-2 rounded-full", isWindows ? "text-white hover:bg-white/10" : "text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-gray-800")}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown (Common Fallback) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/20 backdrop-blur-lg pb-4 absolute w-full z-50">
            <div className="px-2 pt-2 space-y-1 bg-white dark:bg-gray-900 shadow-xl border-b border-gray-200 dark:border-gray-800 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    'block px-4 py-3 rounded-2xl text-base font-medium',
                    isActive(item.path) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={clsx("flex-grow", containerClass)}>
        <div className={clsx(
          "animate-in fade-in slide-in-from-bottom-2 duration-500", 
          isWindows ? "" : "pb-16" // Extra padding for bottom nav on Android
        )}>
           {children}
        </div>
      </main>

      {/* Android Bottom Navigation */}
      {!isWindows && (
        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-40 pb-safe shadow-2xl">
          <div className="flex justify-around items-center h-16">
             {navItems.slice(0, 5).map(item => (
                <Link key={item.path} to={item.path} className={navLinkClass(isActive(item.path))}>
                  <div className={clsx("p-1 rounded-full mb-1 transition-all", isActive(item.path) ? "bg-blue-100 dark:bg-blue-900/40" : "bg-transparent")}>
                     <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px]">{item.label}</span>
                </Link>
             ))}
          </div>
        </div>
      )}

      {/* Footer (Windows Only) */}
      {isWindows && (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} {profile?.companyName} • <span className="text-blue-500">Windows Platform Mode</span>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};
