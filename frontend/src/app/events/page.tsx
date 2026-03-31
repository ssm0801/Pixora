'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Calendar, Users, ImageIcon, Plus, ArrowRight, QrCode, Search } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function EventsPage() {
  const { user } = useAuth();
  const { events, isLoading: eventsLoading } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="max-w-screen-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1>Hey, {firstName} 👋</h1>
            <p className="text-muted-foreground text-[14px] mt-1">
              {events.length === 0
                ? 'You have no events yet. Create one to get started.'
                : `You're part of ${events.length} event${events.length > 1 ? 's' : ''}.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/join"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-[13px]')}
            >
              <QrCode className="h-3.5 w-3.5" />
              Join Event
            </Link>
            <Link
              href="/create-event"
              className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 text-[13px]')}
            >
              <Plus className="h-3.5 w-3.5" />
              New Event
            </Link>
          </div>
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
          <>
            <div className="mb-6 relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-[13.5px]"
              />
            </div>

            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-2xl">
                <p className="text-[14px] text-muted-foreground">
                  No events found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEvents.map((event) => {
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
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
