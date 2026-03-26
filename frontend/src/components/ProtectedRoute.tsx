'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Capture the intended URL once at mount — before any navigation begins.
  // Using a ref ensures this value never changes even if the component
  // re-renders during the router.push transition.
  const intendedPath = useRef(
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/'
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(intendedPath.current)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
