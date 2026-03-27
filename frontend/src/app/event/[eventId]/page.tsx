'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { thumbnailUrl } from '@/lib/cloudinary';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import JSZip from 'jszip';
import QRCode from 'react-qr-code';
import ProtectedRoute from '@/components/ProtectedRoute';
import UploadZone from '@/components/UploadZone';
import PhotoModal from '@/components/PhotoModal';
import OtpInput from '@/components/OtpInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { usePhotos } from '@/hooks/usePhotos';
import { eventApi, photoApi, folderApi, otpApi } from '@/lib/api';
import { Photo, Folder } from '@/types';
import { toast } from 'sonner';
import {
  Users, UserPlus, Trash2, Download, Calendar, AlertTriangle,
  ChevronLeft, ChevronRight, Upload, Shield, X, ArrowUp,
  LogOut, ImageIcon, QrCode, Copy, Check, Loader2,
  Heart, FolderPlus, FolderOpen, BarChart2,
  RotateCcw, SortDesc, Folder as FolderIcon, Settings,
  LayoutGrid, List, ChevronDown, Film,
} from 'lucide-react';

export default function EventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { user } = useAuth();
  const router = useRouter();

  const { event, isLoading: eventLoading, error: eventError, refetch: refetchEvent } = useEvent(eventId);
  const { photos, isLoading: photosLoading, refetch: refetchPhotos } = usePhotos(eventId);

  // Optimistically-added photos — shown immediately after upload, before the next full refetch
  const [optimisticPhotos, setOptimisticPhotos] = useState<Photo[]>([]);

  // Merge: show newly-uploaded items at the top, de-dup once refetch arrives
  const allPhotos = useMemo(() => {
    const fetchedIds = new Set(photos.map((p) => p._id));
    return [...optimisticPhotos.filter((p) => !fetchedIds.has(p._id)), ...photos];
  }, [optimisticPhotos, photos]);

  const handlePhotoUploaded = useCallback((photo: Photo) => {
    setOptimisticPhotos((prev) => [photo, ...prev]);
  }, []);

  const handleUploadComplete = useCallback(() => {
    refetchPhotos();
    setOptimisticPhotos([]);
  }, [refetchPhotos]);

  // FAB upload ref (for admin quick upload)
  const fabInputRef = useRef<HTMLInputElement>(null);

  // Closed by default on mobile, open on md+
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Photo interactions
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Delete event
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [deleteOtpStep, setDeleteOtpStep] = useState<'confirm' | 'otp'>('confirm');
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteOtpTimer, setDeleteOtpTimer] = useState(0);

  // Members modal
  const [membersOpen, setMembersOpen] = useState(false);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);

  // QR / event code modal
  const [qrOpen, setQrOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Edit event
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Leave event
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Remove member confirmation
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirmMember, setRemoveConfirmMember] = useState<{ _id: string; name: string } | null>(null);

  // Delete photo confirmation (single + bulk)
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<{ ids: string[]; label: string } | null>(null);

  // Download confirmation (bulk only)
  const [downloadConfirm, setDownloadConfirm] = useState(false);

  // Delete progress overlay
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(null);

  // ── New features ────────────────────────────────────────────────────────────

  // Views: 'all' | 'favorites' | folderId
  const [activeView, setActiveView] = useState<string>('all');

  // Media type filter
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');

  // Group by captured date
  const [groupByDate, setGroupByDate] = useState(false);

  // View mode: tile grid or list
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile');

  // Collapsed date groups (label → collapsed)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  // Favorites
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  // Folders
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderAccessOpen, setFolderAccessOpen] = useState<Folder | null>(null);
  const [folderAccessType, setFolderAccessType] = useState<'all' | 'custom'>('all');
  const [folderAccessMembers, setFolderAccessMembers] = useState<Set<string>>(new Set());
  const [savingFolderAccess, setSavingFolderAccess] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState<{ _id: string; name: string } | null>(null);

  // Bulk move to folder
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveFolder, setBulkMoveFolder] = useState<string>('none');
  const [bulkMoving, setBulkMoving] = useState(false);

  // Approve join request with access picker
  const [approveAccessOpen, setApproveAccessOpen] = useState<{ userId: string; name: string } | null>(null);
  const [approveAccessType, setApproveAccessType] = useState<'all' | 'custom'>('all');
  const [approveAccessFolders, setApproveAccessFolders] = useState<Set<string>>(new Set());
  const [approvingAccess, setApprovingAccess] = useState(false);

  // Edit member access
  const [editMemberAccessOpen, setEditMemberAccessOpen] = useState<{ userId: string; name: string } | null>(null);
  const [editAccessType, setEditAccessType] = useState<'all' | 'custom'>('all');
  const [editAccessFolders, setEditAccessFolders] = useState<Set<string>>(new Set());
  const [savingMemberAccess, setSavingMemberAccess] = useState(false);

  // Invite access
  const [inviteAccessType, setInviteAccessType] = useState<'all' | 'custom'>('all');
  const [inviteAccessFolders, setInviteAccessFolders] = useState<Set<string>>(new Set());

  // Assign photo to folder
  const [assignFolderOpen, setAssignFolderOpen] = useState<string | null>(null); // photoId
  const [selectedFolderForAssign, setSelectedFolderForAssign] = useState<string>('none');
  const [assigningFolder, setAssigningFolder] = useState(false);


  const isAdmin = event && user && event.adminId._id === user._id;

  // ── Load favorites & folders ─────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    try {
      const { data } = await photoApi.getFavorites(eventId);
      setFavoritedIds(new Set((data.photos as Photo[]).map((f) => f._id)));
    } catch { /* silent */ }
  }, [eventId]);

  const loadFolders = useCallback(async () => {
    try {
      const { data } = await folderApi.list(eventId);
      setFolders(data.folders);
    } catch { /* silent */ }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadFavorites();
      loadFolders();
    }
  }, [eventId, loadFavorites, loadFolders]);

  // ── Helper: close sidebar on mobile when a view is selected ─────────────
  const selectView = (view: string) => {
    setActiveView(view);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // ── Computed: displayed & grouped photos ─────────────────────────────────
  const displayedPhotos = useMemo(() => {
    let base: typeof allPhotos;
    if (activeView === 'favorites') base = allPhotos.filter((p) => favoritedIds.has(p._id));
    else if (activeView !== 'all') base = allPhotos.filter((p) => p.folderId === activeView);
    else base = allPhotos;

    if (mediaFilter === 'photo') return base.filter((p) => !p.mediaType || p.mediaType === 'photo');
    if (mediaFilter === 'video') return base.filter((p) => p.mediaType === 'video');
    return base;
  }, [allPhotos, activeView, favoritedIds, mediaFilter]);

  const groupedPhotos = useMemo(() => {
    if (!groupByDate) return null;
    const groups = new Map<string, Photo[]>();
    displayedPhotos.forEach((photo) => {
      const raw = photo.metadata?.capturedAt ?? photo.createdAt;
      const label = new Date(raw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(photo);
    });
    return [...groups.entries()].sort(
      (a, b) =>
        new Date(b[1][0].metadata?.capturedAt ?? b[1][0].createdAt).getTime() -
        new Date(a[1][0].metadata?.capturedAt ?? a[1][0].createdAt).getTime()
    );
  }, [displayedPhotos, groupByDate]);

  // ── Multi-select helpers ──────────────────────────────────────────────────
  const selectMode = selected.size > 0;
  const allSelected = selected.size === displayedPhotos.length && displayedPhotos.length > 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(displayedPhotos.map((p) => p._id)));
  };

  const clearSelection = () => setSelected(new Set());

  // ── Bulk download as ZIP ──────────────────────────────────────────────────
  const executeBulkDownload = async () => {
    setDownloadConfirm(false);
    setBulkDownloading(true);
    const toDownload = allPhotos.filter((p) => selected.has(p._id));
    const zipName =
      activeView === 'all' || activeView === 'favorites'
        ? event?.name ?? 'photos'
        : folders.find((f) => f._id === activeView)?.name ?? 'folder';
    const toastId = toast.loading(`Zipping ${toDownload.length} photo${toDownload.length > 1 ? 's' : ''}…`);
    try {
      const zip = new JSZip();
      await Promise.all(
        toDownload.map(async (photo) => {
          const res = await fetch(photo.imageUrl);
          const blob = await res.blob();
          zip.file(photo.originalName, blob);
        })
      );
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${zipName}.zip"`, { id: toastId });
    } catch {
      toast.error('Download failed', { id: toastId });
    } finally {
      setBulkDownloading(false);
      clearSelection();
    }
  };

  // ── Delete photos (soft-delete → recycle bin) ─────────────────────────────
  const executeDeletePhotos = async () => {
    if (!deletePhotoConfirm) return;
    const { ids } = deletePhotoConfirm;
    setDeletePhotoConfirm(null);
    setBulkDeleting(true);
    setDeleteProgress({ done: 0, total: ids.length });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try { await photoApi.delete(ids[i], eventId); }
      catch { failed++; }
      setDeleteProgress({ done: i + 1, total: ids.length });
    }
    if (failed > 0) toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to move`);
    else toast.success(`${ids.length} photo${ids.length > 1 ? 's' : ''} moved to recycle bin`);
    refetchPhotos();
    setBulkDeleting(false);
    setDeleteProgress(null);
    clearSelection();
  };

  // ── Single download ───────────────────────────────────────────────────────
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

  // ── Join request approve / reject ─────────────────────────────────────────
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Reject runs immediately; approve opens the access picker first
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
  const handleInvite = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const access: 'all' | string[] =
      inviteAccessType === 'all' ? 'all' : [...inviteAccessFolders];
    try {
      const { data } = await eventApi.invite(eventId, inviteEmail.trim(), access);
      toast.success(data.message);
      setInviteEmail('');
      setInviteAccessType('all');
      setInviteAccessFolders(new Set());
      setInviteOpen(false);
      refetchEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  // ── Delete event ──────────────────────────────────────────────────────────
  const handleRequestDeleteOtp = async () => {
    setDeletingEvent(true);
    try {
      await otpApi.send(user!.email, 'email', 'delete-event');
      setDeleteOtpStep('otp');
      setDeleteOtpTimer(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteOtp || deleteOtp.length !== 6) {
      toast.error('Enter the 6-digit OTP sent to your email');
      return;
    }
    setDeletingEvent(true);
    try {
      await eventApi.delete(eventId, deleteOtp);
      toast.success('Event deleted');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
      setDeletingEvent(false);
    }
  };

  const handleResendDeleteOtp = async () => {
    if (deleteOtpTimer > 0) return;
    try {
      await otpApi.send(user!.email, 'email', 'delete-event');
      setDeleteOtpTimer(60);
      toast.success('OTP resent');
    } catch { toast.error('Failed to resend OTP'); }
  };

  // Delete-event OTP countdown
  useEffect(() => {
    if (deleteOtpTimer <= 0) return;
    const t = setTimeout(() => setDeleteOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteOtpTimer]);

  const handleNavigate = useCallback((photo: Photo) => setSelectedPhoto(photo), []);

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

  // ── Edit event ────────────────────────────────────────────────────────────
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

  // ── Copy event code ───────────────────────────────────────────────────────
  const copyCode = () => {
    if (!event?.code) return;
    navigator.clipboard.writeText(event.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Toggle favorite ───────────────────────────────────────────────────────
  const handleToggleFavorite = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasOn = favoritedIds.has(photoId);
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      wasOn ? next.delete(photoId) : next.add(photoId);
      return next;
    });
    try {
      await photoApi.toggleFavorite(photoId, eventId);
    } catch {
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        wasOn ? next.add(photoId) : next.delete(photoId);
        return next;
      });
      toast.error('Failed to update favourite');
    }
  };


  // ── Folders ───────────────────────────────────────────────────────────────
  const handleCreateFolder = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await folderApi.create(eventId, newFolderName.trim());
      setNewFolderName('');
      setFolderCreateOpen(false);
      loadFolders();
      toast.success('Folder created');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderDeleteConfirm) return;
    const { _id: folderId } = folderDeleteConfirm;
    setFolderDeleteConfirm(null);
    setDeletingFolderId(folderId);
    try {
      await folderApi.delete(eventId, folderId);
      if (activeView === folderId) setActiveView('all');
      loadFolders();
      refetchPhotos();
      toast.success('Folder deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete folder');
    } finally {
      setDeletingFolderId(null);
    }
  };

  // ── Download folder as ZIP ────────────────────────────────────────────────
  const [downloadingFolderId, setDownloadingFolderId] = useState<string | null>(null);

  const handleDownloadFolder = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderPhotos = photos.filter((p) => p.folderId === folder._id);
    if (folderPhotos.length === 0) { toast.error('No photos in this folder'); return; }
    setDownloadingFolderId(folder._id);
    const toastId = toast.loading(`Zipping ${folderPhotos.length} photo${folderPhotos.length > 1 ? 's' : ''}…`);
    try {
      const zip = new JSZip();
      await Promise.all(
        folderPhotos.map(async (photo) => {
          const res = await fetch(photo.imageUrl);
          const blob = await res.blob();
          zip.file(photo.originalName, blob);
        })
      );
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${folder.name}"`, { id: toastId });
    } catch {
      toast.error('Download failed', { id: toastId });
    } finally {
      setDownloadingFolderId(null);
    }
  };

  const handleBulkMoveToFolder = async () => {
    setBulkMoving(true);
    const ids = [...selected];
    let failed = 0;
    for (const photoId of ids) {
      try {
        if (bulkMoveFolder === 'none') {
          await folderApi.removePhoto(photoId, eventId);
        } else {
          await folderApi.assignPhoto(photoId, eventId, bulkMoveFolder);
        }
      } catch {
        failed++;
      }
    }
    setBulkMoving(false);
    setBulkMoveOpen(false);
    if (failed > 0) toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to move`);
    else toast.success(`${ids.length} photo${ids.length > 1 ? 's' : ''} moved`);
    refetchPhotos();
    clearSelection();
  };

  const openFolderAccess = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderAccessOpen(folder);
    const isAll = folder.memberAccess === 'all';
    setFolderAccessType(isAll ? 'all' : 'custom');
    setFolderAccessMembers(isAll ? new Set() : new Set(folder.memberAccess as string[]));
  };

  const handleSaveFolderAccess = async () => {
    if (!folderAccessOpen) return;
    setSavingFolderAccess(true);
    const access: 'all' | string[] = folderAccessType === 'all' ? 'all' : [...folderAccessMembers];
    try {
      await folderApi.updateAccess(eventId, folderAccessOpen._id, access);
      setFolderAccessOpen(null);
      loadFolders();
      toast.success('Folder access updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update access');
    } finally {
      setSavingFolderAccess(false);
    }
  };

  // ── Assign photo to folder ────────────────────────────────────────────────
  const openAssignFolder = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const photo = photos.find((p) => p._id === photoId);
    setSelectedFolderForAssign(photo?.folderId ?? 'none');
    setAssignFolderOpen(photoId);
  };

  const handleAssignFolder = async () => {
    if (!assignFolderOpen) return;
    setAssigningFolder(true);
    try {
      if (selectedFolderForAssign === 'none') {
        await folderApi.removePhoto(assignFolderOpen, eventId);
      } else {
        await folderApi.assignPhoto(assignFolderOpen, eventId, selectedFolderForAssign);
      }
      setAssignFolderOpen(null);
      refetchPhotos();
      toast.success('Photo moved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to move photo');
    } finally {
      setAssigningFolder(false);
    }
  };


  // ── Loading / error ───────────────────────────────────────────────────────
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

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${event.code}`
    : `/join?code=${event.code}`;

  // ── Photo grid renderer ───────────────────────────────────────────────────
  const renderPhotoGrid = (photosToRender: Photo[]) => (
    <div data-tag="gallery-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
      {photosToRender.map((photo) => {
        const isSelected = selected.has(photo._id);
        const isFav = favoritedIds.has(photo._id);
        return (
          <div
            data-tag="photo-tile"
            key={photo._id}
            className={`group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer ring-2 transition-all duration-150 ${
              isSelected
                ? 'ring-primary ring-offset-2 ring-offset-background'
                : 'ring-transparent'
            }`}
            onClick={() => {
              if (selectMode) toggleSelect(photo._id);
              else setSelectedPhoto(photo);
            }}
          >
            {photo.mediaType === 'video' ? (
              <>
                {/* Use a JPEG thumbnail of the first frame — far cheaper than a <video> tag */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl(photo.imageUrl, 'video')}
                  alt={photo.originalName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Play icon — always visible, not on hover */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/55 rounded-full p-2.5">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white drop-shadow">
                      <path d="M8 5.14v13.72L19 12 8 5.14z" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <Image
                src={thumbnailUrl(photo.imageUrl, 'photo')}
                alt={photo.originalName}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              />
            )}

            {isSelected && <div className="absolute inset-0 bg-primary/15 pointer-events-none" />}

            {/* Checkbox — top-left on hover/select */}
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

            {/* Favourite button — bottom-right, always available */}
            {!selectMode && (
              <button
                onClick={(e) => handleToggleFavorite(photo._id, e)}
                className={`absolute bottom-2 right-2 p-1.5 rounded-lg backdrop-blur-sm transition-all duration-150 ${
                  isFav
                    ? 'opacity-100 bg-black/40 text-red-400'
                    : 'opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 text-white/80 hover:text-red-400'
                }`}
                title={isFav ? 'Remove from favourites' : 'Add to favourites'}
              >
                <Heart className={`h-3.5 w-3.5 transition-all ${isFav ? 'fill-current' : ''}`} />
              </button>
            )}

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
                  <>
                    <button
                      onClick={(e) => openAssignFolder(photo._id, e)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                      title="Move to folder"
                    >
                      <FolderIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePhotoConfirm({ ids: [photo._id], label: photo.originalName });
                      }}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white backdrop-blur-sm transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── List view renderer ────────────────────────────────────────────────────
  const renderPhotoList = (photosToRender: Photo[]) => (
    <div data-tag="photo-list" className="flex flex-col divide-y divide-border rounded-xl border overflow-hidden">
      {photosToRender.map((photo) => {
        const isSelected = selected.has(photo._id);
        const isFav = favoritedIds.has(photo._id);
        return (
          <div
            data-tag="photo-list-row"
            key={photo._id}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
              isSelected ? 'bg-primary/8' : 'hover:bg-muted/60'
            }`}
            onClick={() => {
              if (selectMode) toggleSelect(photo._id);
              else setSelectedPhoto(photo);
            }}
          >
            {/* Checkbox */}
            <div
              className={`shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
              }`}
              onClick={(e) => { e.stopPropagation(); toggleSelect(photo._id); }}
            >
              {isSelected && (
                <svg viewBox="0 0 10 8" className="h-2 w-2 fill-none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Thumbnail */}
            <div className="shrink-0 h-10 w-10 rounded-md overflow-hidden bg-muted relative">
              {photo.mediaType === 'video' ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl(photo.imageUrl, 'video')}
                    alt={photo.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                      <path d="M8 5.14v13.72L19 12 8 5.14z" />
                    </svg>
                  </div>
                </>
              ) : (
                <Image
                  src={thumbnailUrl(photo.imageUrl, 'photo')}
                  alt={photo.originalName}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{photo.originalName}</p>
            </div>

            {/* Actions */}
            {!selectMode && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => handleToggleFavorite(photo._id, e)}
                  className={`p-1.5 rounded-md transition-colors ${isFav ? 'text-red-400' : 'text-muted-foreground hover:text-red-400 hover:bg-muted'}`}
                  title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => openAssignFolder(photo._id, e)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Move to folder"
                    >
                      <FolderIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletePhotoConfirm({ ids: [photo._id], label: photo.originalName }); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderPhotos = (photosToRender: Photo[]) =>
    viewMode === 'list' ? renderPhotoList(photosToRender) : renderPhotoGrid(photosToRender);

  return (
    <ProtectedRoute>
      <div data-tag="event-page-layout" className="max-w-screen-2xl mx-auto w-full flex h-[calc(100vh-3.5rem)] overflow-hidden px-4 py-3 gap-3">

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            data-tag="sidebar-mobile-backdrop"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          data-tag="sidebar"
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
            {/* Mobile close button */}
            <div data-tag="sidebar-mobile-header" className="flex items-center justify-between p-4 border-b md:hidden">
              <div className='flex items-center gap-2 flex-wrap'>
                <span className="font-semibold text-sm truncate">{event.name}</span>
                {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </div>
              <button
                data-tag="sidebar-close-btn"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Event info */}
            <div data-tag="sidebar-event-info" className="p-5 border-b space-y-1 hidden md:block">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base leading-snug">{event.name}</h2>
                {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
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
                {photos.length} / 500 items
              </div>
            </div>

            {/* Views navigation */}
            <div data-tag="sidebar-library-nav" className="p-3 border-b space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-1">Library</p>
              <button
                data-tag="nav-all-photos-btn"
                onClick={() => selectView('all')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                  activeView === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                All Photos
                <span className="ml-auto text-[11px] text-muted-foreground">{photos.length}</span>
              </button>
              <button
                data-tag="nav-favorites-btn"
                onClick={() => selectView('favorites')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                  activeView === 'favorites' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                }`}
              >
                <Heart className="h-3.5 w-3.5 shrink-0" />
                Favourites
                <span className="ml-auto text-[11px] text-muted-foreground">{favoritedIds.size}</span>
              </button>
            </div>

            {/* Folders */}
            <div data-tag="sidebar-folders-nav" className="p-3 border-b space-y-0.5">
              <div className="flex items-center justify-between px-2 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Folders</p>
                {isAdmin && (
                  <button
                    data-tag="create-folder-btn"
                    onClick={() => setFolderCreateOpen(true)}
                    className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="New folder"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {folders.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  {isAdmin ? 'No folders yet' : 'No folders'}
                </p>
              ) : (
                folders.map((folder) => {
                  const photoCount = photos.filter((p) => p.folderId === folder._id).length;
                  return (
                    <div
                      data-tag="folder-item"
                      key={folder._id}
                      className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                        activeView === folder._id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                      }`}
                      onClick={() => selectView(folder._id)}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{folder.name}</span>
                      <span className="text-[11px] text-muted-foreground">{photoCount}</span>
                      <div className="flex items-center gap-2 md:gap-1 md:hidden md:group-hover:flex">
                        <button
                          data-tag="download-folder-btn"
                          onClick={(e) => handleDownloadFolder(folder, e)}
                          disabled={downloadingFolderId === folder._id}
                          className="p-0.5 rounded hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          title="Download folder as ZIP"
                        >
                          {downloadingFolderId === folder._id
                            ? <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                            : <Download className="h-3 w-3" />
                          }
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              data-tag="folder-access-btn"
                              onClick={(e) => openFolderAccess(folder, e)}
                              className="p-0.5 rounded hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                              title="Manage access"
                            >
                              <Settings className="h-3 w-3" />
                            </button>
                            <button
                              data-tag="delete-folder-btn"
                              onClick={(e) => { e.stopPropagation(); setFolderDeleteConfirm({ _id: folder._id, name: folder.name }); }}
                              disabled={deletingFolderId === folder._id}
                              className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-40"
                              title="Delete folder"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tools */}
            <div data-tag="sidebar-tools-nav" className="p-3 border-b space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-1">Tools</p>
              <button
                data-tag="nav-settings-btn"
                onClick={() => { setSidebarOpen(false); router.push(`/event/${eventId}/settings`); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors hover:bg-muted text-foreground"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                Settings
                {isAdmin && event.joinRequests?.length > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {event.joinRequests.length}
                  </span>
                )}
              </button>
              {isAdmin && (
                <>
                  <button
                    data-tag="nav-analytics-btn"
                    onClick={() => { setSidebarOpen(false); router.push(`/event/${eventId}/analytics`); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors hover:bg-muted text-foreground"
                  >
                    <BarChart2 className="h-3.5 w-3.5 shrink-0" />
                    Analytics
                  </button>
                  <button
                    data-tag="nav-trash-btn"
                    onClick={() => { setSidebarOpen(false); router.push(`/event/${eventId}/trash`); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors hover:bg-muted text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                    Recycle bin
                  </button>
                </>
              )}
            </div>

            {/* Upload (admin only) */}
            {isAdmin ? (
              <div data-tag="sidebar-upload-zone" className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload photos & videos</span>
                </div>
                <UploadZone
  eventId={eventId}
  onUploadComplete={handleUploadComplete}
  onPhotoUploaded={handlePhotoUploaded}
  externalInputRef={fabInputRef}
/>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  {photos.length} item{photos.length !== 1 ? 's' : ''} in this event
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div data-tag="main-content" className="flex-1 flex flex-col min-w-0 overflow-hidden border bg-card rounded-xl">

          {/* Top bar */}
          <div data-tag="topbar" className="flex items-center gap-3 px-4 py-3 border-b shrink-0 flex-wrap">
            {/* Sidebar toggle */}
            <Button
              data-tag="sidebar-toggle-btn"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen
                ? <ChevronLeft className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
            </Button>

            {/* Event name (when sidebar closed) */}
            {/* <div className={`flex items-center gap-2 min-w-0 ${sidebarOpen ? 'hidden md:hidden' : ''}`}>
              <span className="font-semibold text-sm truncate">{event.name}</span>
              {isAdmin && <Badge variant="secondary" className="text-xs shrink-0">Admin</Badge>}
            </div> */}

            {/* View label */}
            {activeView !== 'all' && (
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <span>/</span>
                <span className="font-medium text-foreground">
                  {activeView === 'favorites' ? 'Favourites'
                    : folders.find((f) => f._id === activeView)?.name ?? 'Folder'}
                </span>
              </div>
            )}

            {/* Media type filter */}
            <div className="flex items-center rounded-lg border overflow-hidden text-[12px]">
              {(['all', 'photo', 'video'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMediaFilter(f)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                    mediaFilter === f ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/60'
                  } ${f !== 'all' ? 'border-l border-border' : ''}`}
                  title={f === 'all' ? 'All media' : f === 'photo' ? 'Photos only' : 'Videos only'}
                >
                  {f === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  <span className="hidden sm:inline capitalize">{f === 'all' ? 'All' : f === 'photo' ? 'Photos' : 'Videos'}</span>
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* ── View controls ───────────────────────────────────────────── */}
            <div data-tag="view-controls" className="shrink-0 flex items-center gap-2">
              {/* Group by date */}
              <button
                data-tag="group-by-date-btn"
                onClick={() => { setGroupByDate((v) => !v); setCollapsedGroups(new Set()); }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  groupByDate
                    ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                    : 'text-muted-foreground border-border hover:bg-muted/60'
                }`}
                title={groupByDate ? 'Ungroup' : 'Group by date'}
              >
                <SortDesc className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{groupByDate ? 'Grouped' : 'Group by date'}</span>
              </button>
              {/* Tile / List segmented */}
              <div data-tag="view-mode-toggle" className="flex items-center rounded-lg border overflow-hidden">
                <button
                  data-tag="tile-view-btn"
                  onClick={() => setViewMode('tile')}
                  className={`p-1.5 transition-colors ${viewMode === 'tile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
                  title="Tile view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-border" />
                <button
                  data-tag="list-view-btn"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
                  title="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Selection action bar */}
          {selectMode && (
            <div data-tag="selection-bar" className="flex items-center gap-2 px-4 py-2 border-b bg-muted/60 shrink-0">
              {/* Select-all checkbox */}
              <button
                data-tag="select-all-btn"
                onClick={toggleAll}
                className={`shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                  allSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
                }`}
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected && (
                  <svg viewBox="0 0 10 8" className="h-2 w-2 fill-none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <span className="text-[13px] font-medium text-foreground">
                {selected.size} selected
              </span>

              <div className="flex-1" />

              {/* Download */}
              <button
                data-tag="bulk-download-btn"
                onClick={() => setDownloadConfirm(true)}
                disabled={bulkDownloading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                title="Download selected"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              {/* Move to folder (admin only) */}
              {isAdmin && (
                <button
                  data-tag="bulk-move-btn"
                  onClick={() => setBulkMoveOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Move to folder"
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Move</span>
                </button>
              )}

              {/* Delete (admin only) */}
              {isAdmin && (
                <button
                  data-tag="bulk-delete-btn"
                  onClick={() => setDeletePhotoConfirm({ ids: [...selected], label: `${selected.size} photo${selected.size > 1 ? 's' : ''}` })}
                  disabled={bulkDeleting}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  title="Delete selected"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}

              {/* Clear */}
              <button
                data-tag="clear-selection-btn"
                onClick={clearSelection}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Gallery */}
          <div data-tag="gallery-area" className="flex-1 overflow-y-auto p-4">
            {photosLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : displayedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[40vh] border-2 border-dashed rounded-2xl text-center gap-3">
                {activeView === 'favorites' ? <Heart className="h-12 w-12 text-muted-foreground/40" />
                  : <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                }
                <div>
                  <p className="font-medium text-muted-foreground">
                    {activeView === 'favorites' ? 'No favourites yet'
                      : activeView !== 'all' ? 'No photos in this folder'
                      : 'No photos yet'}
                  </p>
                  {activeView === 'all' && isAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">Use the sidebar to upload photos</p>
                  )}
                </div>
              </div>
            ) : groupedPhotos ? (
              <div data-tag="gallery-grouped" className="space-y-6">
                {groupedPhotos.map(([dateLabel, groupPhotos]) => {
                  const collapsed = collapsedGroups.has(dateLabel);
                  return (
                    <div data-tag="date-group" key={dateLabel}>
                      <button
                        data-tag="date-group-header"
                        onClick={() => toggleGroupCollapse(dateLabel)}
                        className="flex items-center gap-2 mb-3 w-full text-left group"
                      >
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <h3 className="text-sm font-semibold text-muted-foreground">{dateLabel}</h3>
                        <span className="text-xs text-muted-foreground">({groupPhotos.length})</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
                        />
                      </button>
                      {!collapsed && renderPhotos(groupPhotos)}
                    </div>
                  );
                })}
              </div>
            ) : (
              renderPhotos(displayedPhotos)
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      <PhotoModal
        photo={selectedPhoto}
        photos={displayedPhotos}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={handleNavigate}
      />

      {/* ── Members modal ─────────────────────────────────────────────────── */}
      {membersOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-members" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Members
              </h2>
              <button onClick={() => setMembersOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul data-tag="members-list" className="space-y-2 overflow-y-auto flex-1">
              {event.members.map((member) => {
                const isSelf = member._id === user?._id;
                const isAdminMember = event.adminId._id === member._id;
                const showEmail = isAdmin || isSelf || isAdminMember;
                return (
                  <li data-tag="member-row" key={member._id} className="flex items-center justify-between gap-2 py-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}{isSelf ? ' (you)' : ''}</p>
                      {showEmail && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                    </div>
                    {isAdminMember ? (
                      <Badge variant="outline" className="text-xs shrink-0">Admin</Badge>
                    ) : isAdmin && !isSelf ? (
                      <button
                        onClick={() => { setMembersOpen(false); setRemoveConfirmMember({ _id: member._id, name: member.name }); }}
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

            {/* Pending invites (admin sent) */}
            {isAdmin && event.pendingInvites && event.pendingInvites.length > 0 && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending invites</p>
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

            {/* Join requests */}
            {isAdmin && event.joinRequests && event.joinRequests.length > 0 && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  Join requests
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{event.joinRequests.length}</Badge>
                </p>
                {event.joinRequests.map((u) => (
                  <div key={u._id} className="flex items-center justify-between gap-2 py-0.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setMembersOpen(false);
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
      )}

      {/* ── Invite modal ──────────────────────────────────────────────────── */}
      {inviteOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-invite-member" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Invite member
              </h2>
              <button onClick={() => setInviteOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form data-tag="invite-member-form" onSubmit={handleInvite} className="space-y-3">
              <p className="text-xs text-muted-foreground">Invite an existing Pixora user by email. They'll receive a notification to accept.</p>
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
              {/* Folder access grant */}
              <div className="space-y-2">
                <Label className="text-xs">Folder access</Label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" checked={inviteAccessType === 'all'} onChange={() => setInviteAccessType('all')} className="accent-primary" />
                    <span className="text-sm">All folders</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" checked={inviteAccessType === 'custom'} onChange={() => setInviteAccessType('custom')} className="accent-primary" />
                    <span className="text-sm">Specific folders only</span>
                  </label>
                </div>
                {inviteAccessType === 'custom' && folders.length > 0 && (
                  <div className="border rounded-xl p-2 space-y-0.5 max-h-32 overflow-y-auto">
                    {folders.map((f) => (
                      <label key={f._id} className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-muted cursor-pointer">
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
                        <span className="text-sm">{f.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {inviteAccessType === 'custom' && folders.length === 0 && (
                  <p className="text-xs text-muted-foreground">No folders yet — create folders first.</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={inviting}>
                  {inviting ? 'Sending…' : 'Send invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR / Event code modal ─────────────────────────────────────────── */}
      {qrOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-qr-code" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                Event code & QR
              </h2>
              <button onClick={() => setQrOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Share this code or QR so others can join directly.</p>
            {event.code ? (
              <>
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCode value={joinUrl} size={160} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-center font-mono font-bold text-lg tracking-[0.25em] text-foreground">
                    {event.code}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} title="Copy code">
                    {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-[13px]"
                  onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success('Invite link copied — share it anywhere!'); }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy invite link
                </Button>
                <p className="text-xs text-center text-muted-foreground">Anyone who opens this link will be sent to you for approval.</p>
              </>
            ) : (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                Generating code…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete photo confirmation ─────────────────────────────────────── */}
      {deletePhotoConfirm && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-delete-photo-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Move to recycle bin?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Move{' '}
              <span className="font-semibold text-foreground">
                {deletePhotoConfirm.ids.length > 1
                  ? `${deletePhotoConfirm.ids.length} photos`
                  : `"${deletePhotoConfirm.label}"`}
              </span>
              {' '}to the recycle bin? You can restore or permanently delete from there.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDeletePhotoConfirm(null)} disabled={bulkDeleting}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={executeDeletePhotos} disabled={bulkDeleting}>
                {bulkDeleting ? 'Moving…' : 'Move to bin'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk download confirmation ────────────────────────────────────── */}
      {downloadConfirm && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-bulk-download-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Download {selected.size} photo{selected.size > 1 ? 's' : ''}?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This will download <span className="font-semibold text-foreground">{selected.size} photo{selected.size > 1 ? 's' : ''}</span> to your device in zip.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDownloadConfirm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={executeBulkDownload}>Download</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete event confirmation ─────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-delete-event-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border">
            {deleteOtpStep === 'confirm' ? (
              <>
                <div className="flex items-center gap-3 text-destructive">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">Delete event?</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently delete{' '}
                  <span className="font-semibold text-foreground">"{event.name}"</span>,{' '}
                  all <span className="font-semibold text-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>,
                  and remove all members. This cannot be undone.
                </p>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={deletingEvent}>Cancel</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleRequestDeleteOtp} disabled={deletingEvent}>
                    {deletingEvent ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Sending OTP…</> : 'Yes, delete'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-destructive">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold">Confirm with OTP</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  An OTP was sent to <span className="font-medium text-foreground">{user?.email}</span>. Enter it below to confirm deletion.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">OTP</span>
                    <button
                      onClick={handleResendDeleteOtp}
                      disabled={deleteOtpTimer > 0}
                      className="text-[12px] text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      {deleteOtpTimer > 0 ? `Resend in ${deleteOtpTimer}s` : 'Resend'}
                    </button>
                  </div>
                  <OtpInput value={deleteOtp} onChange={setDeleteOtp} disabled={deletingEvent} />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => { setDeleteOtpStep('confirm'); setDeleteOtp(''); }} disabled={deletingEvent}>Back</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDeleteEvent} disabled={deletingEvent || deleteOtp.length !== 6}>
                    {deletingEvent ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Deleting…</> : 'Delete event'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit event modal ──────────────────────────────────────────────── */}
      {editOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-edit-event" className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Edit event</h2>
              <button onClick={() => setEditOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form data-tag="edit-event-form" onSubmit={handleSaveEdit} className="space-y-3">
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
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Leave event confirmation ──────────────────────────────────────── */}
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
              You will lose access to <span className="font-semibold text-foreground">"{event.name}"</span> and all its photos. The admin can re-invite you later.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowLeaveConfirm(false)} disabled={leaving}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleLeaveEvent} disabled={leaving}>
                {leaving ? 'Leaving…' : 'Leave event'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove member confirmation ────────────────────────────────────── */}
      {removeConfirmMember && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-remove-member-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
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
              <Button variant="outline" className="flex-1" onClick={() => setRemoveConfirmMember(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleRemoveMember} disabled={!!removingId}>
                {removingId ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create folder modal ───────────────────────────────────────────── */}
      {folderCreateOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-create-folder" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                New folder
              </h2>
              <button onClick={() => setFolderCreateOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form data-tag="create-folder-form" onSubmit={handleCreateFolder} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="folder-name" className="text-[13px]">Folder name</Label>
                <Input
                  id="folder-name"
                  placeholder="e.g. Ceremony, Reception…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  maxLength={60}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setFolderCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={creatingFolder}>
                  {creatingFolder ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Folder access modal ───────────────────────────────────────────── */}
      {folderAccessOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-folder-access" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Folder access — {folderAccessOpen.name}
              </h2>
              <button onClick={() => setFolderAccessOpen(null)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  checked={folderAccessType === 'all'}
                  onChange={() => setFolderAccessType('all')}
                  className="accent-primary"
                />
                <span className="text-sm">All event members</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  checked={folderAccessType === 'custom'}
                  onChange={() => setFolderAccessType('custom')}
                  className="accent-primary"
                />
                <span className="text-sm">Specific members only</span>
              </label>
            </div>

            {folderAccessType === 'custom' && (
              <div className="overflow-y-auto flex-1 space-y-1 border rounded-xl p-2">
                {event.members
                  .filter((m) => m._id !== event.adminId._id)
                  .map((member) => (
                    <label key={member._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={folderAccessMembers.has(member._id)}
                        onChange={() => {
                          setFolderAccessMembers((prev) => {
                            const next = new Set(prev);
                            next.has(member._id) ? next.delete(member._id) : next.add(member._id);
                            return next;
                          });
                        }}
                        className="accent-primary"
                      />
                      <span className="text-sm">{member.name}</span>
                      {member._id === user?._id && (
                        <span className="text-xs text-muted-foreground">(you)</span>
                      )}
                    </label>
                  ))}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setFolderAccessOpen(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveFolderAccess} disabled={savingFolderAccess}>
                {savingFolderAccess ? 'Saving…' : 'Save access'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete progress overlay ──────────────────────────────────────── */}
      {deleteProgress && (
        <div data-tag="delete-progress-overlay" className="fixed bottom-4 right-4 z-50 w-72 bg-card border rounded-xl shadow-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">Moving to recycle bin…</span>
            <span className="text-primary font-semibold tabular-nums">
              {deleteProgress.done}/{deleteProgress.total}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${Math.round((deleteProgress.done / deleteProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {deleteProgress.total - deleteProgress.done} remaining
          </p>
        </div>
      )}

      {/* ── Assign photo to folder modal ──────────────────────────────────── */}
      {assignFolderOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-assign-folder" className="bg-background rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Move to folder
              </h2>
              <button onClick={() => setAssignFolderOpen(null)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div data-tag="assign-folder-list" className="space-y-1">
              <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="radio"
                  checked={selectedFolderForAssign === 'none'}
                  onChange={() => setSelectedFolderForAssign('none')}
                  className="accent-primary"
                />
                <span className="text-sm text-muted-foreground italic">No folder</span>
              </label>
              {folders.map((folder) => (
                <label key={folder._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                  <input
                    type="radio"
                    checked={selectedFolderForAssign === folder._id}
                    onChange={() => setSelectedFolderForAssign(folder._id)}
                    className="accent-primary"
                  />
                  <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{folder.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAssignFolderOpen(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAssignFolder} disabled={assigningFolder}>
                {assigningFolder ? 'Moving…' : 'Move'}
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
              <button onClick={() => setApproveAccessOpen(null)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Choose what this member can access after joining.</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" checked={approveAccessType === 'all'} onChange={() => setApproveAccessType('all')} className="accent-primary" />
                <span className="text-sm">All folders (full access)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" checked={approveAccessType === 'custom'} onChange={() => setApproveAccessType('custom')} className="accent-primary" />
                <span className="text-sm">Specific folders only</span>
              </label>
            </div>
            {approveAccessType === 'custom' && (
              <div className="overflow-y-auto flex-1 border rounded-xl p-2 space-y-0.5">
                {folders.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-2">No folders yet.</p>
                ) : folders.map((f) => (
                  <label key={f._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
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
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setApproveAccessOpen(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleApproveWithAccess} disabled={approvingAccess}>
                {approvingAccess ? 'Approving…' : 'Approve & add'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Folder delete confirmation ────────────────────────────────────── */}
      {folderDeleteConfirm && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-delete-folder-confirm" className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Delete folder?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Delete <span className="font-semibold text-foreground">"{folderDeleteConfirm.name}"</span>?
              Photos inside will be moved to the root. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setFolderDeleteConfirm(null)}
                disabled={!!deletingFolderId}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteFolder}
                disabled={!!deletingFolderId}>
                {deletingFolderId ? 'Deleting…' : 'Delete folder'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload FAB (admin only, mobile-friendly) ──────────────────────── */}
      {isAdmin && (
        <button
          data-tag="upload-fab"
          onClick={() => fabInputRef.current?.click()}
          className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1"
          aria-label="Upload photos"
        >
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all">
            <ArrowUp className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Upload</span>
        </button>
      )}

      {/* ── Bulk move to folder ───────────────────────────────────────────── */}
      {bulkMoveOpen && (
        <div data-tag="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-tag="modal-bulk-move-folder" className="bg-background rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Move {selected.size} photo{selected.size > 1 ? 's' : ''} to folder
              </h2>
              <button onClick={() => setBulkMoveOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div data-tag="bulk-move-folder-list" className="space-y-1 max-h-48 overflow-y-auto">
              <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                <input type="radio" checked={bulkMoveFolder === 'none'}
                  onChange={() => setBulkMoveFolder('none')} className="accent-primary" />
                <span className="text-sm text-muted-foreground italic">No folder (remove from folder)</span>
              </label>
              {folders.map((folder) => (
                <label key={folder._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                  <input type="radio" checked={bulkMoveFolder === folder._id}
                    onChange={() => setBulkMoveFolder(folder._id)} className="accent-primary" />
                  <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{folder.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setBulkMoveOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleBulkMoveToFolder} disabled={bulkMoving}>
                {bulkMoving ? 'Moving…' : 'Move'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
