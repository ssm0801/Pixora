'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notificationApi } from '@/lib/api';
import { Sun, Moon, Camera, User, LogOut, ChevronDown, Bell } from 'lucide-react';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-8" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? <Sun className="h-[1.05rem] w-[1.05rem]" />
        : <Moon className="h-[1.05rem] w-[1.05rem]" />}
    </Button>
  );
}

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await notificationApi.list();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore
    }
  }, []);

  // Poll for unread count every 30 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnread]);

  return (
    <nav className="border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6 h-[3.5rem] flex items-center justify-between">

        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-[15px] tracking-tight text-foreground hover:text-primary transition-colors"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 text-primary">
            <Camera className="h-3.5 w-3.5" />
          </div>
          <span
            className="bg-gradient-to-r from-primary to-[oklch(0.60_0.28_295)] bg-clip-text text-transparent text-[1.15rem]"
            style={{ fontFamily: "var(--font-pixelify)" }}
          >
            Pixora
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* Notification bell */}
              <Link
                href="/notifications"
                className="relative inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                onClick={() => setUnreadCount(0)}
              >
                <Bell className="h-[1.05rem] w-[1.05rem]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg hover:bg-muted transition-colors text-xs font-medium text-muted-foreground"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
                    {user?.firstName?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block max-w-[100px] truncate">{user?.firstName}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 w-44 bg-popover border rounded-xl shadow-lg overflow-hidden py-1">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted transition-colors"
                      >
                        <User className="h-3.5 w-3.5" />
                        Profile
                      </Link>
                      <div className="my-1 border-t" />
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[13px]')}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: 'sm' }), 'text-[13px]')}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
