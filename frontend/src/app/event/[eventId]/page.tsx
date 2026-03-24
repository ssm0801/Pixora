'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import UploadZone from '@/components/UploadZone';
import PhotoModal from '@/components/PhotoModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { usePhotos } from '@/hooks/usePhotos';
import { eventApi, photoApi } from '@/lib/api';
import { Photo } from '@/types';
import { toast } from 'sonner';
import {
  Users, UserPlus, Trash2, Download, Calendar, AlertTriangle,
  ChevronLeft, ChevronRight, Upload, Shield, X, MoreHorizontal, LogOut, Pencil,
  ImageIcon,
} from 'lucide-react';

export default function EventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { user } = useAuth();
  const router = useRouter();

  const { event, isLoading: eventLoading, error: eventError, refetch: refetchEvent } = useEvent(eventId);
  const { photos, isLoading: photosLoading, refetch: refetchPhotos } = usePhotos(eventId);

  // Sidebar — non-admins land on members tab by default (resolved after event loads)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'invite' | 'members'>('upload');
  const [tabInitialised, setTabInitialised] = useState(false);

  // Photo interactions
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Multi-select — selectMode is derived from selected.size > 0
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Delete event
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const isAdmin = event && user && event.adminId._id === user._id;

  // Set default tab once we know the role
  if (event && user && !tabInitialised) {
    setTabInitialised(true);
    if (event.adminId._id !== user._id) setActiveTab('members');
  }

  // ── Multi-select helpers ────────────────────────────────────────────────
  const selectMode = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === photos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(photos.map((p) => p._id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  // ── Bulk download ────────────────────────────────────────────────────────
  const handleBulkDownload = async () => {
    if (selected.size === 0) return;
    setBulkDownloading(true);
    const toDownload = photos.filter((p) => selected.has(p._id));
    for (const photo of toDownload) {
      try {
        const res = await fetch(photo.imageUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = photo.originalName;
        a.click();
        URL.revokeObjectURL(url);
        // small delay to avoid browser throttling
        await new Promise((r) => setTimeout(r, 150));
      } catch {
        toast.error(`Failed to download ${photo.originalName}`);
      }
    }
    toast.success(`${selected.size} photo${selected.size > 1 ? 's' : ''} downloaded`);
    setBulkDownloading(false);
    clearSelection();
  };

  // ── Delete confirmation — covers both single and bulk ────────────────────
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<{ ids: string[]; label: string } | null>(null);

  const confirmDeletePhotos = (ids: string[], label: string) => setDeletePhotoConfirm({ ids, label });

  const executeDeletePhotos = async () => {
    if (!deletePhotoConfirm) return;
    const { ids } = deletePhotoConfirm;
    setDeletePhotoConfirm(null);
    setBulkDeleting(true);
    let failed = 0;
    for (const photoId of ids) {
      try {
        await photoApi.delete(photoId, eventId);
      } catch {
        failed++;
      }
    }
    if (failed > 0) toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to delete`);
    else toast.success(`${ids.length} photo${ids.length > 1 ? 's' : ''} deleted`);
    refetchPhotos();
    setBulkDeleting(false);
    clearSelection();
  };

  // ── Single download ──────────────────────────────────────────────────────
  const downloadPhoto = async (photo: Photo) => {
    try {
      const res = await fetch(photo.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const handleInvite = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data } = await eventApi.invite(eventId, inviteEmail.trim());
      toast.success(data.message);
      setInviteEmail('');
      refetchEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  // ── Delete event ──────────────────────────────────────────────────────────
  const handleDeleteEvent = async () => {
    setDeletingEvent(true);
    try {
      await eventApi.delete(eventId);
      toast.success('Event deleted');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
      setDeletingEvent(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleNavigate = useCallback((photo: Photo) => setSelectedPhoto(photo), []);

  // ── Remove member (admin) — with confirmation ────────────────────────────
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirmMember, setRemoveConfirmMember] = useState<{ _id: string; name: string } | null>(null);

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

  // ── Three-dot menu ────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Edit event ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setEditForm({ name: event?.name ?? '', description: event?.description ?? '' });
    setMenuOpen(false);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error('Event name is required'); return; }
    setSaving(true);
    try {
      await eventApi.update(eventId, { name: editForm.name.trim(), description: editForm.description.trim() });
      toast.success('Event updated');
      refetchEvent();
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  // ── Leave event (non-admin) ───────────────────────────────────────────────
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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

  // ── Loading / error states ────────────────────────────────────────────────
  if (eventLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (eventError || !event) {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground">{eventError || 'Event not found'}</p>
        </div>
      </ProtectedRoute>
    );
  }

  const allSelected = selected.size === photos.length && photos.length > 0;

  return (
    <ProtectedRoute>
      <div className="max-w-screen-2xl mx-auto w-full flex h-[calc(100vh-3.5rem)] overflow-hidden px-4 py-3 gap-3">

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed top-[3.5rem] bottom-0 left-0 z-50 w-72 bg-card border-r flex flex-col transition-transform duration-300
            md:relative md:top-auto md:bottom-auto md:z-auto md:flex-shrink-0 md:transition-all md:overflow-hidden
            ${sidebarOpen
              ? 'translate-x-0 md:w-72 md:border md:rounded-xl'
              : '-translate-x-full md:translate-x-0 md:w-0'
            }
          `}
        >
          <div className="w-72 flex flex-col h-full overflow-y-auto">
            {/* Event info */}
            <div className="p-5 border-b space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base leading-snug">{event.name}</h2>
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
              )}
              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.members.length} member{event.members.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(event.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                {photos.length} / 500 photos
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b text-xs font-medium">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'upload'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('invite')}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'invite'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </button>
              )}
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'members'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Members
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 p-4">
              {/* Upload tab */}
              {activeTab === 'upload' && isAdmin && (
                <div className="space-y-3">
                  <UploadZone eventId={eventId} onUploadComplete={refetchPhotos} />
                </div>
              )}

              {/* Invite tab */}
              {activeTab === 'invite' && isAdmin && (
                <form onSubmit={handleInvite} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add existing Pixora users by email.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email" className="text-xs">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={inviting}>
                    {inviting ? 'Adding…' : 'Add member'}
                  </Button>
                </form>
              )}

              {/* Members tab */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  {/* Active members */}
                  <ul className="space-y-2">
                    {event.members.map((member) => {
                      const isSelf = member._id === user?._id;
                      const isAdminMember = event.adminId._id === member._id;
                      return (
                        <li key={member._id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.name}{isSelf ? ' (you)' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                          {isAdminMember ? (
                            <Badge variant="outline" className="text-xs shrink-0">Admin</Badge>
                          ) : isAdmin && !isSelf ? (
                            <button
                              onClick={() => setRemoveConfirmMember({ _id: member._id, name: member.name })}
                              disabled={removingId === member._id}
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                              title="Remove member"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Pending invites — visible to admin */}
                  {isAdmin && event.pendingInvites && event.pendingInvites.length > 0 && (
                    <div className="pt-2 border-t space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pending invites
                      </p>
                      {event.pendingInvites.map((u) => (
                        <div key={u._id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">Invited</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border bg-card rounded-xl">

          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 flex-wrap">
            {/* Sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen
                ? <ChevronLeft className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
            </Button>

            {/* Event name (always visible) */}
            <div className={`flex items-center gap-2 min-w-0 ${sidebarOpen ? 'hidden' : ''}`}>
              <span className="font-semibold text-sm truncate">{event.name}</span>
              {isAdmin && <Badge variant="secondary" className="text-xs shrink-0">Admin</Badge>}
            </div>

            <div className="flex-1" />

            {/* ⋯ Three-dot menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMenuOpen((o) => !o)}
                title="Event options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <>
                  {/* Click-outside backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-50 w-48 bg-popover border rounded-xl shadow-lg overflow-hidden py-1">
                    {isAdmin && (
                      <button
                        onClick={openEdit}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit event
                      </button>
                    )}
                    {isAdmin ? (
                      <button
                        onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete event
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMenuOpen(false); setShowLeaveConfirm(true); }}
                        disabled={leaving}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {leaving ? 'Leaving…' : 'Leave event'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selection action bar — appears when any photo is selected */}
            {selectMode && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium tabular-nums">
                  {selected.size} of {photos.length} selected
                </span>
                <div className="w-px h-4 bg-border" />
                <Button variant="ghost" size="sm" className="text-[12px] h-7 px-2.5" onClick={toggleAll}>
                  {allSelected ? 'Deselect all' : 'Select all'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[12px] gap-1.5"
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                >
                  <Download className="h-3.5 w-3.5" />
                  {bulkDownloading ? 'Downloading…' : 'Download'}
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 px-3 text-[12px] gap-1.5"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {bulkDeleting ? 'Deleting…' : 'Delete'}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearSelection} title="Clear selection">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Gallery */}
          <div className="flex-1 overflow-y-auto p-4">
            {photosLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[40vh] border-2 border-dashed rounded-2xl text-center gap-3">
                <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="font-medium text-muted-foreground">No photos yet</p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Use the Upload tab in the sidebar to add photos
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {photos.map((photo) => {
                  const isSelected = selected.has(photo._id);
                  return (
                    <div
                      key={photo._id}
                      className={`group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer ring-2 transition-all duration-150 ${
                        isSelected
                          ? 'ring-primary ring-offset-2 ring-offset-background'
                          : 'ring-transparent'
                      }`}
                      onClick={() => {
                        if (selectMode) {
                          toggleSelect(photo._id);
                        } else {
                          setSelectedPhoto(photo);
                        }
                      }}
                    >
                      <Image
                        src={photo.imageUrl}
                        alt={photo.originalName}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      />

                      {/* Dim overlay when selected */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
                      )}

                      {/* Checkbox — top-left, always on hover or when selected */}
                      <div
                        className={`absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                          isSelected
                            ? 'bg-primary border-primary opacity-100 scale-100'
                            : 'bg-black/40 border-white/80 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                        }`}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo._id); }}
                      >
                        {isSelected && (
                          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      {/* Hover action buttons — top-right, only when not in select mode */}
                      {!selectMode && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }}
                            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                photoApi.delete(photo._id, eventId).then(refetchPhotos).catch(() => toast.error('Delete failed'));
                              }}
                              className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white backdrop-blur-sm transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <PhotoModal
        photo={selectedPhoto}
        photos={photos}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={handleNavigate}
      />

      {/* Delete event confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Delete event?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">"{event.name}"</span>,
              all <span className="font-semibold text-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>,
              and remove all members. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
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
                {deletingEvent ? 'Deleting…' : 'Yes, delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit event modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border">
            <h2 className="text-base font-semibold">Edit event</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-[13px]">Event name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={100}
                  required
                  className="h-9 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc" className="text-[13px]">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition-shadow"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave event confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <LogOut className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Leave event?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You will lose access to <span className="font-semibold text-foreground">"{event.name}"</span> and all its photos. The admin can re-invite you later.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowLeaveConfirm(false)} disabled={leaving}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleLeaveEvent} disabled={leaving}>
                {leaving ? 'Leaving…' : 'Leave event'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirmation */}
      {removeConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Remove member?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Remove <span className="font-semibold text-foreground">{removeConfirmMember.name}</span> from this event? They will lose access to all photos.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setRemoveConfirmMember(null)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleRemoveMember}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
