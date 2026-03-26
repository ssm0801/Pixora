'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { notificationApi, eventApi } from '@/lib/api';
import { Notification, NotificationType } from '@/types';
import { toast } from 'sonner';
import {
  Bell, CheckCheck, UserPlus, UserX, UserCheck, LogIn,
  ThumbsUp, ThumbsDown, Check, X, ChevronLeft,
} from 'lucide-react';

// ── Icon + colour per notification type ─────────────────────────────────────
const typeConfig: Record<NotificationType, { icon: React.ReactNode; colour: string; label: string }> = {
  join_requested:  { icon: <LogIn className="h-4 w-4" />,       colour: 'text-primary bg-primary/10',         label: 'Join request' },
  join_approved:   { icon: <UserCheck className="h-4 w-4" />,   colour: 'text-green-500 bg-green-500/10',     label: 'Request approved' },
  join_rejected:   { icon: <UserX className="h-4 w-4" />,       colour: 'text-destructive bg-destructive/10', label: 'Request declined' },
  invite_received: { icon: <UserPlus className="h-4 w-4" />,    colour: 'text-primary bg-primary/10',         label: 'Invite received' },
  invite_accepted: { icon: <ThumbsUp className="h-4 w-4" />,    colour: 'text-green-500 bg-green-500/10',     label: 'Invite accepted' },
  invite_declined: { icon: <ThumbsDown className="h-4 w-4" />,  colour: 'text-muted-foreground bg-muted',     label: 'Invite declined' },
  member_removed:  { icon: <UserX className="h-4 w-4" />,       colour: 'text-destructive bg-destructive/10', label: 'Removed from event' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationApi.list();
      setNotifications(data.notifications);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    await notificationApi.markRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  // ── Admin: approve / reject a join request ───────────────────────────────
  const handleJoinRequest = async (n: Notification, approve: boolean) => {
    if (!n.eventId) return;
    setActingOn(n._id);
    try {
      if (approve) {
        await eventApi.approveJoinRequest(n.eventId, n.actorId!);
        toast.success('Join request approved');
      } else {
        await eventApi.rejectJoinRequest(n.eventId, n.actorId!);
        toast.success('Join request rejected');
      }
      markRead(n._id);
      fetchNotifications();
    } catch {
      toast.error('Action failed');
    } finally {
      setActingOn(null);
    }
  };

  // ── User: accept / decline an invite ────────────────────────────────────
  const handleInviteResponse = async (n: Notification, accept: boolean) => {
    if (!n.eventId) return;
    setActingOn(n._id);
    try {
      if (accept) {
        await eventApi.acceptInvite(n.eventId);
        toast.success('Invite accepted!');
      } else {
        await eventApi.declineInvite(n.eventId);
        toast.success('Invite declined');
      }
      markRead(n._id);
      fetchNotifications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActingOn(null);
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <ProtectedRoute>
      <div className="max-w-screen-2xl mx-auto px-6 py-10">
        <div className="max-w-xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 -ml-2" title="Back">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-[13px]" onClick={markAllRead} disabled={markingAll}>
                <CheckCheck className="h-3.5 w-3.5" />
                {markingAll ? 'Marking…' : 'Mark all read'}
              </Button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70">
                You'll be notified about invites, join requests, and member changes here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.join_requested;
                const isActing = actingOn === n._id;
                const showJoinActions  = n.type === 'join_requested'  && !n.read && n.eventId && n.actorId;
                const showInviteActions = n.type === 'invite_received' && !n.read && n.eventId;

                return (
                  <div
                    key={n._id}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                      n.read ? 'bg-card border-border/50 opacity-60' : 'bg-card border-primary/20 shadow-sm'
                    }`}
                  >
                    {/* Icon + unread dot */}
                    <div className="relative mt-0.5 shrink-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cfg.colour}`}>
                        {cfg.icon}
                      </div>
                      {!n.read && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-[13px] font-medium text-muted-foreground mb-0.5">{cfg.label}</p>
                        <p className="text-sm leading-snug">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* ── Invite received: Accept / Decline ── */}
                      {showInviteActions && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="h-7 px-3 text-[12px] gap-1.5"
                            disabled={isActing}
                            onClick={() => handleInviteResponse(n, true)}
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[12px] gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={isActing}
                            onClick={() => handleInviteResponse(n, false)}
                          >
                            <X className="h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {/* ── Join requested: Approve / Reject (admin) ── */}
                      {showJoinActions && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="h-7 px-3 text-[12px] gap-1.5"
                            disabled={isActing}
                            onClick={() => handleJoinRequest(n, true)}
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[12px] gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={isActing}
                            onClick={() => handleJoinRequest(n, false)}
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* ── join_requested without actorId: link to event ── */}
                      {n.type === 'join_requested' && !n.read && n.eventId && !n.actorId && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => { markRead(n._id); router.push(`/event/${n.eventId}`); }}
                        >
                          Review in event →
                        </button>
                      )}
                    </div>

                    {/* Mark read for non-actionable unread */}
                    {!n.read && !showInviteActions && !showJoinActions && n.type !== 'join_requested' && (
                      <button
                        onClick={() => markRead(n._id)}
                        className="p-1 rounded-md hover:bg-muted transition-colors shrink-0 mt-1"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
