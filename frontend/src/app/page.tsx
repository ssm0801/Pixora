'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, ImageIcon, Plus, ArrowRight, Lock, Share2, Download, Zap, Bell, Check, X } from 'lucide-react';
import { eventApi } from '@/lib/api';
import { EventInvite } from '@/types';
import { toast } from 'sonner';

// ── Landing page (logged-out) ────────────────────────────────────────────────
function LandingPage() {
  const features = [
    {
      icon: <Lock className="h-5 w-5" />,
      title: 'Private by default',
      desc: 'Only invited members can see your event photos. No public links, no surprises.',
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      title: 'Easy invite',
      desc: 'Add guests by email in seconds. They get instant access to the album.',
    },
    {
      icon: <Download className="h-5 w-5" />,
      title: 'Bulk download',
      desc: 'Multi-select and download all your favourites at once with original filenames.',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Fast & organised',
      desc: 'Per-event photo collections keep everything tidy, no matter how many events.',
    },
  ];

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[420px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute left-1/3 top-1/3 w-[300px] h-[300px] rounded-full bg-[oklch(0.60_0.28_295)]/8 blur-[80px]" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-primary text-[12px] font-medium mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Private event photo sharing
        </div>

        <h1
          className="text-[4rem] sm:text-[5.5rem] font-bold leading-none tracking-tight mb-5 bg-gradient-to-br from-primary via-primary/80 to-[oklch(0.60_0.28_295)] bg-clip-text text-transparent"
          style={{ fontFamily: 'var(--font-pixelify)' }}
        >
          Pixora
        </h1>

        <p className="text-[1.1rem] text-muted-foreground max-w-[30rem] leading-relaxed mb-10">
          Create private photo albums for your events. Invite guests, upload memories, and share them — only with the people who were there.
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            href="/register"
            className={cn(buttonVariants({ size: 'lg' }), 'text-[14px] px-7 gap-2')}
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-[14px] px-7')}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-screen-lg mx-auto w-full px-6 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {f.icon}
              </div>
              <div>
                <p className="font-semibold text-[14px]">{f.title}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Dashboard (logged-in) ────────────────────────────────────────────────────
function Dashboard() {
  const { user } = useAuth();
  const { events, isLoading: eventsLoading, refetch: refetchEvents } = useEvents();
  const [invites, setInvites] = useState<EventInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    eventApi.getMyInvites().then(({ data }) => setInvites(data.invites)).catch(() => {});
  }, []);

  const handleInviteResponse = async (id: string, accept: boolean) => {
    setRespondingId(id);
    try {
      if (accept) {
        await eventApi.acceptInvite(id);
        toast.success('Invite accepted!');
        setInvites((prev) => prev.filter((inv) => inv._id !== id));
        refetchEvents();
      } else {
        await eventApi.declineInvite(id);
        toast.success('Invite declined');
        setInvites((prev) => prev.filter((inv) => inv._id !== id));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setRespondingId(null);
    }
  };

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10">

      {/* Pending invites banner */}
      {invites.length > 0 && (
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-semibold text-primary">
              {invites.length} pending invite{invites.length > 1 ? 's' : ''}
            </p>
          </div>
          {invites.map((inv) => (
            <div
              key={inv._id}
              className="flex items-center justify-between gap-4 bg-card border border-primary/20 rounded-xl px-4 py-3 flex-wrap"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold truncate">{inv.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  Invited by {inv.adminId.name} · {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-[12px] text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={respondingId === inv._id}
                  onClick={() => handleInviteResponse(inv._id, false)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-[12px]"
                  disabled={respondingId === inv._id}
                  onClick={() => handleInviteResponse(inv._id, true)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-[13px] text-muted-foreground font-medium mb-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1>Hey, {firstName} 👋</h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            {events.length === 0
              ? 'You have no events yet. Create one to get started.'
              : `You're part of ${events.length} event${events.length > 1 ? 's' : ''}.`}
          </p>
        </div>
        <Link
          href="/create-event"
          className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 text-[13px]')}
        >
          <Plus className="h-3.5 w-3.5" />
          New Event
        </Link>
      </div>

      {/* Events */}
      {eventsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[7.5rem] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/60 rounded-2xl gap-4 text-center">
          <div className="p-4 rounded-2xl bg-muted">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-[15px]">No events yet</p>
            <p className="text-muted-foreground text-[13px] mt-0.5">
              Create an event to start sharing photos with your guests
            </p>
          </div>
          <Link href="/create-event" className={cn(buttonVariants({ size: 'sm' }), 'text-[13px]')}>
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.map((event) => {
            const isAdmin = event.adminId._id === user?._id;
            return (
              <Link
                key={event._id}
                href={`/event/${event._id}`}
                className="group block bg-card border border-border/60 rounded-xl p-5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-[14.5px] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>
                  {isAdmin && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary border-0"
                    >
                      Admin
                    </Badge>
                  )}
                </div>

                {event.description && (
                  <p className="text-[12.5px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.members.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Root page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LandingPage />;
}
