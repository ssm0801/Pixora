'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      toast.error('Google login failed. Please try again.');
      setStatus('error');
      setTimeout(() => router.replace('/login'), 2000);
      return;
    }

    const finalise = async () => {
      try {
        localStorage.setItem('pixora_token', token);
        const { data } = await authApi.me();
        saveAuth(token, data.user);
        setAuthUser(data.user); // push user into shared context immediately
        toast.success(`Welcome, ${data.user.name}!`);
        const stored = sessionStorage.getItem('pixora_redirect');
        sessionStorage.removeItem('pixora_redirect');
        const dest = stored?.startsWith('/') ? stored : '/';
        router.replace(dest);
      } catch {
        localStorage.removeItem('pixora_token');
        toast.error('Failed to complete sign-in. Please try again.');
        setStatus('error');
        setTimeout(() => router.replace('/login'), 2000);
      }
    };

    finalise();
  }, [searchParams, router, setAuthUser]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
      {status === 'loading' ? (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm">Completing sign-in…</p>
        </>
      ) : (
        <p className="text-sm text-destructive">Something went wrong. Redirecting…</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
