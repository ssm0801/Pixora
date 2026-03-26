'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { eventApi } from '@/lib/api';
import { toast } from 'sonner';
import { QrCode, Hash, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Pre-fill code from URL query param (from QR scan)
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) setCode(urlCode.toUpperCase());
  }, [searchParams]);

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { toast.error('Please enter an event code'); return; }
    setJoining(true);
    try {
      const { data } = await eventApi.joinByCode(trimmed);
      toast.success(data.message);
      // Request is now pending admin approval — go back home
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send join request');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-screen-2xl mx-auto px-6 py-10">
        <div className="max-w-md mx-auto space-y-8">

          {/* Back */}
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 -ml-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-2">
              <QrCode className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Join an event</h1>
            <p className="text-muted-foreground text-sm">Enter the event code to request access. The organiser will approve your request.</p>
          </div>

          {/* Code form */}
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="event-code" className="text-[13px] flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Event code
                </Label>
                <Input
                  id="event-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A3F7C1D9"
                  maxLength={8}
                  className="text-center font-mono text-lg tracking-[0.3em] h-12"
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground text-center">8-character code from the event organiser</p>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={joining || code.trim().length === 0}>
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending request…
                  </>
                ) : (
                  <>
                    Request to join
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* QR scan hint */}
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <QrCode className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan the QR code from the event organiser's screen with your phone camera. It will open this page with the code pre-filled.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Don't have a code?{' '}
            <button onClick={() => router.push('/')} className="text-primary hover:underline">
              Go back home
            </button>
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
