'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { saveAuth, clearAuth, getToken, getUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (firstName: string, lastName: string, email: string, password: string, phone?: string, emailOtp?: string, phoneOtp?: string) => Promise<any>;
  logout: () => void;
  setAuthUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const stored = getUser();
    if (stored && getToken()) setUser(stored);
    setIsLoading(false);
  }, []);

  // Periodically and on tab-focus check whether the token has expired
  useEffect(() => {
    const check = () => {
      if (!getToken()) {
        clearAuth();
        setUser((prev) => {
          if (prev) {
            toast.error('Session expired. Please sign in again.');
            router.push('/login');
          }
          return null;
        });
      }
    };
    const interval = setInterval(check, 60_000); // every 60 s
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    saveAuth(data.token, data.user);
    setUser(data.user); // updates ALL consumers instantly
    return data;
  }, []);

  const register = useCallback(async (firstName: string, lastName: string, email: string, password: string, phone?: string, emailOtp?: string, phoneOtp?: string) => {
    const { data } = await authApi.register({ firstName, lastName, email, password, ...(phone && { phone }), ...(emailOtp && { emailOtp }), ...(phoneOtp && { phoneOtp }) });
    saveAuth(data.token, data.user);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push('/login');
  }, [router]);

  // Called after OAuth flows that save auth externally (e.g. Google callback)
  const setAuthUser = useCallback((u: User) => setUser(u), []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, setAuthUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
