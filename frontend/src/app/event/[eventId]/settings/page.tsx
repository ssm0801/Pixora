'use client';

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { eventApi, folderApi } from '@/lib/api';
import { Folder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Users,
  UserPlus,
  Trash2,
  X,
  Check,
  Copy,
  LogOut,
  Pencil,
  QrCode,
  Shield,
  Calendar,
  FolderOpen,
} from 'lucide-react';

function SettingsContent({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { event, isLoading: eventLoading, refetch: refetchEvent } = useEvent(eventId);

  const isAdmin = event ? event.adminId._id === user?._id : false;

  // ── Edit event ────────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Members ───────────────────────────────────────────────────────────────
  const [removeConfirmMember, setRemoveConfirmMember] = useState<{ _id: string; name: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Join request approval ─────────────────────────────────────────────────
  const [approveAccessOpen, setApproveAccessOpen] = useState<{ userId: string; name: string } | null>(null);
  const [approveAccessType, setApproveAccessType] = useState<'all' | 'custom'>('all');
  const [approveAccessFolders, setApproveAccessFolders] = useState<Set<string>>(new Set());
  const [approvingAccess, setApprovingAccess] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // ── Invite ────────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteAccessType, setInviteAccessType] = useState<'all' | 'custom'>('all');
  const [inviteAccessFolders, setInviteAccessFolders] = useState<Set<string>>(new Set());

  // ── Folders (for access picker) ───────────────────────────────────────────
  const [folders, setFolders] = useState<Folder[]>([]);

  // ── QR code ───────────────────────────────────────────────────────────────
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyCode = () => {
    if (!event?.code) return;
    navigator.clipboard.writeText(event.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyInviteLink = () => {
    if (!event?.code) return;
    const url = `${window.location.origin}/join?code=${event.code}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Delete / Leave ────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'soft' | 'hard' | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const { data } = await folderApi.list(eventId);
      setFolders(data.folders);
    } catch { /* silent */ }
  }, [eventId]);

  useEffect(() => {
    if (eventId) loadFolders();
  }, [eventId, loadFolders]);

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEditName = () => {
    setEditName(event?.name ?? '');
    setEditingName(true);
  };

  const openEditDesc = () => {
    setEditDesc(event?.description ?? '');
    setEditingDesc(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) { toast.error('Event name is required'); return; }
    setSaving(true);
    try {
      await eventApi.update(eventId, { name: editName.trim() });
      toast.success('Event name updated');
      refetchEvent();
      setEditingName(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDesc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventApi.update(eventId, { description: editDesc.trim() });
      toast.success('Description updated');
      refetchEvent();
      setEditingDesc(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update description');
    } finally {
      setSaving(false);
    }
  };

  // ── Remove member ─────────────────────────────────────────────────────────
  const handleRemoveMember = async () => {
    if (!removeConfirmMember) return;
    setRemovingId(removeConfirmMember._id);
    setRemoveConfirmMember(null);
    try {
      await eventApi.removeMember(eventId, removeConfirmMember._id);
      toast.success('Member removed');
      refetchEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  // ── Join request handlers ─────────────────────────────────────────────────
  const handleRejectRequest = async (userId: string) => {
    setProcessingRequestId(userId);
    try {
      await eventApi.rejectJoinRequest(eventId, userId);
      toast.success('Join request rejected');
      refetchEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleApproveWithAccess = async () => {
    if (!approveAccessOpen) return;
    setApprovingAccess(true);
    const access: 'all' | string[] = approveAccessType === 'all' ? 'all' : [...approveAccessFolders];
    try {
      await eventApi.approveJoinRequest(eventId, approveAccessOpen.userId, access);
      toast.success(`${approveAccessOpen.name} approved and added to event`);
      setApproveAccessOpen(null);
      setApproveAccessType('all');
      setApproveAccessFolders(new Set());
      refetchEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setApprovingAccess(false);
    }
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const access: 'all' | string[] = inviteAccessType === 'all' ? 'all' : [...inviteAccessFolders];
    try {
      const { data } = await eventApi.invite(eventId, inviteEmail.trim(), access);
      toast.success(data.message);
      setInviteEmail('');
      setInviteAccessType('all');
      setInviteAccessFolders(new Set());
      refetchEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  // ── Delete event ──────────────────────────────────────────────────────────
  const handleDeleteEvent = async () => {
    if (!showDeleteConfirm) return;
    setDeletingEvent(true);
    try {
      if (showDeleteConfirm === 'hard') {
        await eventApi.hardDelete(eventId);
        toast.success('Event permanently deleted');
      } else {
        await eventApi.delete(eventId);
        toast.success('Event deleted — data retained for 30 days');
      }
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
      setDeletingEvent(false);
      setShowDeleteConfirm(null);
    }
  };

  // ── Leave event ───────────────────────────────────────────────────────────
  const handleLeaveEvent = async () => {
    setShowLeaveConfirm(false);
    setLeaving(true);
    try {
      await eventApi.leave(eventId);
      toast.success('You have left the event');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave event');
      setLeaving(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div data-tag="settings-page" className="min-h-screen bg-background">
      {/* Header */}
      <div data-tag="settings-topbar" className="border-b border-border bg-card/60 backdrop-blur supports-backdrop-blur:bg-card/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2">
          <button
            data-tag="back-btn"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      <div data-tag="settings-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Section 1: Event Info ──────────────────────────────────────── */}
        <div data-tag="settings-event-info-section" className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Event info</h2>
          </div>
          <div className="p-5 space-y-4">

            {/* Name */}
            <div data-tag="settings-event-name-field" className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Name</Label>
                {isAdmin && !editingName && (
                  <button
                    data-tag="edit-event-name-btn"
                    onClick={openEditName}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
              {editingName ? (
                <form data-tag="edit-event-name-form" onSubmit={handleSaveName} className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    required
                    autoFocus
                    className="h-8 text-sm flex-1"
                  />
                  <Button type="submit" size="sm" className="h-8" disabled={saving}>
                    {saving ? '…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setEditingName(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <p className="text-sm font-medium text-foreground">{event.name}</p>
              )}
            </div>

            {/* Description */}
            <div data-tag="settings-event-desc-field" className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Description</Label>
                {isAdmin && !editingDesc && (
                  <button
                    data-tag="edit-event-desc-btn"
                    onClick={openEditDesc}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
              {editingDesc ? (
                <form data-tag="edit-event-desc-form" onSubmit={handleSaveDesc} className="space-y-2">
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    maxLength={500}
                    rows={3}
                    autoFocus
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition-shadow"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="h-8" disabled={saving}>
                      {saving ? '…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => setEditingDesc(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-foreground">
                  {event.description || <span className="text-muted-foreground italic">No description</span>}
                </p>
              )}
            </div>

            {/* Created date + member count */}
            <div className="flex flex-wrap gap-4 pt-1 border-t border-border">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created {new Date(event.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{event.members.length} member{event.members.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Members ────────────────────────────────────────────── */}
        <div data-tag="settings-members-section" className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Members
            </h2>
          </div>
          <div className="p-5 space-y-4">

            {/* Members list */}
            <ul data-tag="members-list" className="space-y-2">
              {event.members.map((member) => {
                const isSelf = member._id === user?._id;
                const isAdminMember = event.adminId._id === member._id;
                const showEmail = isAdmin || isSelf;
                return (
                  <li data-tag="member-row" key={member._id} className="flex items-center justify-between gap-2 py-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {member.name}{isSelf ? ' (you)' : ''}
                      </p>
                      {showEmail && (
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      )}
                    </div>
                    {isAdminMember ? (
                      <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </Badge>
                    ) : isAdmin && !isSelf ? (
                      <button
                        data-tag="remove-member-btn"
                        onClick={() => setRemoveConfirmMember({ _id: member._id, name: member.name })}
                        disabled={removingId === member._id}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        title="Remove member"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {/* Pending invites (admin only) */}
            {isAdmin && event.pendingInvites && event.pendingInvites.length > 0 && (
              <div data-tag="pending-invites-list" className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pending invites
                </p>
                {event.pendingInvites.map((u) => (
                  <div data-tag="pending-invite-row" key={u._id} className="flex items-center justify-between gap-2 py-0.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Invited</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Join requests (admin only) */}
            {isAdmin && event.joinRequests && event.joinRequests.length > 0 && (
              <div data-tag="join-requests-list" className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  Join requests
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                    {event.joinRequests.length}
                  </Badge>
                </p>
                {event.joinRequests.map((u) => (
                  <div data-tag="join-request-row" key={u._id} className="flex items-center justify-between gap-2 py-0.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div data-tag="join-request-actions" className="flex items-center gap-1 shrink-0">
                      <button
                        data-tag="approve-request-btn"
                        onClick={() => {
                          setApproveAccessOpen({ userId: u._id, name: u.name });
                          setApproveAccessType('all');
                          setApproveAccessFolders(new Set());
                        }}
                        disabled={processingRequestId === u._id}
                        className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-40"
                        title="Approve"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        data-tag="reject-request-btn"
                        onClick={() => handleRejectRequest(u._id)}
                        disabled={processingRequestId === u._id}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        title="Reject"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Invite Member (admin only) ────────────────────────── */}
        {isAdmin && (
          <div data-tag="settings-invite-section" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Invite member
              </h2>
            </div>
            <div className="p-5">
              <form data-tag="invite-member-form" onSubmit={handleInvite} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Invite an existing Pixora user by email. They'll receive a notification to accept.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email" className="text-sm">Email address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" disabled={inviting}>
                      {inviting ? 'Sending…' : 'Send invite'}
                    </Button>
                  </div>
                </div>

                {/* Folder access */}
                <div data-tag="invite-folder-access" className="space-y-2">
                  <Label className="text-sm">Folder access</Label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={inviteAccessType === 'all'}
                        onChange={() => setInviteAccessType('all')}
                        className="accent-primary"
                      />
                      <span className="text-sm">All folders</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={inviteAccessType === 'custom'}
                        onChange={() => setInviteAccessType('custom')}
                        className="accent-primary"
                      />
                      <span className="text-sm">Specific folders only</span>
                    </label>
                  </div>
                  {inviteAccessType === 'custom' && folders.length > 0 && (
                    <div className="border rounded-xl p-2 space-y-0.5 max-h-32 overflow-y-auto">
                      {folders.map((f) => (
                        <label
                          key={f._id}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={inviteAccessFolders.has(f._id)}
                            onChange={() => setInviteAccessFolders((prev) => {
                              const next = new Set(prev);
                              next.has(f._id) ? next.delete(f._id) : next.add(f._id);
                              return next;
                            })}
                            className="accent-primary"
                          />
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{f.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {inviteAccessType === 'custom' && folders.length === 0 && (
                    <p className="text-xs text-muted-foreground">No folders yet — create folders first.</p>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Section 4: Event code & QR (admin only) ──────────────────────── */}
        {isAdmin && (
          <div data-tag="settings-qr-section" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                Event code &amp; QR
              </h2>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-start gap-6">
              <div data-tag="qr-code-display" className="bg-white p-3 rounded-xl border shrink-0">
                <QRCode value={typeof window !== 'undefined' ? `${window.location.origin}/join?code=${event.code}` : `/join?code=${event.code}`} size={120} />
              </div>
              <div data-tag="qr-code-info" className="space-y-3 flex-1 min-w-0">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Event code</p>
                  <div data-tag="event-code-row" className="flex items-center gap-2">
                    <code className="text-xl font-mono font-bold tracking-widest text-foreground select-all">
                      {event.code}
                    </code>
                    <button
                      data-tag="copy-event-code-btn"
                      onClick={copyCode}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      title="Copy code"
                    >
                      {codeCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  data-tag="copy-invite-link-btn"
                  onClick={copyInviteLink}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-foreground w-fit"
                >
                  {linkCopied
                    ? <Check className="h-3.5 w-3.5 text-green-500" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  {linkCopied ? 'Copied!' : 'Copy invite link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 5: Leave Event (non-admin only) ───────────────────────── */}
        {!isAdmin && (
          <div data-tag="settings-leave-section" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Leave event
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground mb-4">
                You will lose access to this event and all its photos. The admin can re-invite you later.
              </p>
              <Button
                data-tag="leave-event-btn"
                variant="destructive"
                onClick={() => setShowLeaveConfirm(true)}
                disabled={leaving}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {leaving ? 'Leaving…' : 'Leave event'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Section 5: Delete Event (admin only) ──────────────────────────── */}
        {isAdmin && (
          <div data-tag="settings-danger-zone" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-base font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Danger zone
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {/* Soft delete */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Delete event</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Suspends all member access. Data is retained for 30 days — resubscribe to restore access. After 30 days, everything is permanently removed.
                  </p>
                </div>
                <Button
                  data-tag="delete-event-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm('soft')}
                  disabled={deletingEvent}
                  className="shrink-0 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>

              {/* Hard delete */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-destructive">Permanently delete</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Immediately removes all photos, videos, and data from our servers. <span className="font-medium text-destructive">This cannot be undone.</span>
                  </p>
                </div>
                <Button
                  data-tag="hard-delete-event-btn"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm('hard')}
                  disabled={deletingEvent}
                  className="shrink-0 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Wipe
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Remove member confirmation ─────────────────────────────────────── */}
      {removeConfirmMember && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-remove-member-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <X className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Remove member?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Remove{' '}
              <span className="font-semibold text-foreground">{removeConfirmMember.name}</span>{' '}
              from this event? They will lose access to all photos.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRemoveConfirmMember(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRemoveMember}
                disabled={!!removingId}
              >
                {removingId ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve join request — access picker ──────────────────────────── */}
      {approveAccessOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-approve-access" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Approve — {approveAccessOpen.name}
              </h2>
              <button
                onClick={() => setApproveAccessOpen(null)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose what this member can access after joining.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  checked={approveAccessType === 'all'}
                  onChange={() => setApproveAccessType('all')}
                  className="accent-primary"
                />
                <span className="text-sm">All folders (full access)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  checked={approveAccessType === 'custom'}
                  onChange={() => setApproveAccessType('custom')}
                  className="accent-primary"
                />
                <span className="text-sm">Specific folders only</span>
              </label>
            </div>
            {approveAccessType === 'custom' && (
              <div className="overflow-y-auto flex-1 border rounded-xl p-2 space-y-0.5">
                {folders.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-2">No folders yet.</p>
                ) : (
                  folders.map((f) => (
                    <label
                      key={f._id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={approveAccessFolders.has(f._id)}
                        onChange={() => setApproveAccessFolders((prev) => {
                          const next = new Set(prev);
                          next.has(f._id) ? next.delete(f._id) : next.add(f._id);
                          return next;
                        })}
                        className="accent-primary"
                      />
                      <span className="text-sm">{f.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setApproveAccessOpen(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleApproveWithAccess}
                disabled={approvingAccess}
              >
                {approvingAccess ? 'Approving…' : 'Approve & add'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave event confirmation ───────────────────────────────────────── */}
      {showLeaveConfirm && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-leave-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <LogOut className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Leave event?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You will lose access to{' '}
              <span className="font-semibold text-foreground">"{event.name}"</span>{' '}
              and all its photos. The admin can re-invite you later.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleLeaveEvent}
                disabled={leaving}
              >
                {leaving ? 'Leaving…' : 'Leave event'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete event confirmation ──────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-delete-event-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">
                {showDeleteConfirm === 'hard' ? 'Permanently delete event?' : 'Delete event?'}
              </h2>
            </div>

            {showDeleteConfirm === 'hard' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will <span className="font-semibold text-destructive">immediately and permanently</span> delete{' '}
                  <span className="font-semibold text-foreground">"{event.name}"</span> — all photos, videos, and data will be wiped from our servers right now.
                </p>
                <p className="text-xs font-semibold text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  ⚠ This cannot be undone. There is no recovery.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Access to <span className="font-semibold text-foreground">"{event.name}"</span> will be suspended for all members. Your data is retained for <span className="font-semibold text-foreground">30 days</span> — resubscribe within that window to restore access. After 30 days, everything is permanently deleted.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingEvent}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
              >
                {deletingEvent
                  ? 'Deleting…'
                  : showDeleteConfirm === 'hard'
                  ? 'Yes, wipe everything'
                  : 'Yes, delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  return (
    <ProtectedRoute>
      <SettingsContent eventId={eventId} />
    </ProtectedRoute>
  );
}
