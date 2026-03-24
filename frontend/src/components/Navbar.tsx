'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sun, Moon, Camera } from 'lucide-react';

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
              <div className="hidden md:flex items-center h-7 px-2.5 rounded-md bg-muted text-muted-foreground text-xs font-medium mr-1">
                {user?.name}
              </div>
              <Button variant="outline" size="sm" className="text-[13px]" onClick={logout}>
                Sign out
              </Button>
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
