'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { photoApi } from '@/lib/api';
import { Photo } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RotateCcw, Trash2, LayoutGrid, List, X, CheckSquare } from 'lucide-react';

// ── Main content ──────────────────────────────────────────────────────────────

function TrashContent({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { event, isLoading: eventLoading } = useEvent(eventId);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permDeleteId, setPermDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'tile'>('list');

  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(photos.map((p) => p._id)));
  const clearSelection = () => setSelected(new Set());

  const isAdmin = event ? event.adminId._id === user?._id : false;

  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await photoApi.getTrash(eventId);
      setPhotos(data.photos);
    } catch {
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventLoading && event) {
      if (!isAdmin) {
        router.replace(`/event/${eventId}`);
        return;
      }
      fetchTrash();
    }
  }, [eventLoading, event, isAdmin, fetchTrash, router, eventId]);

  const handleRestore = async (photoId: string) => {
    setRestoringId(photoId);
    try {
      await photoApi.restorePhoto(photoId, eventId);
      setPhotos((prev) => prev.filter((p) => p._id !== photoId));
      toast.success('Photo restored');
    } catch {
      toast.error('Failed to restore photo');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (photoId: string) => {
    setPermDeleteId(photoId);
    try {
      await photoApi.permanentDelete(photoId, eventId);
      setPhotos((prev) => prev.filter((p) => p._id !== photoId));
      toast.success('Photo permanently deleted');
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setPermDeleteId(null);
    }
  };

  const handleBulkRestore = async () => {
    setBulkRestoring(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => photoApi.restorePhoto(id, eventId)));
      setPhotos((prev) => prev.filter((p) => !ids.includes(p._id)));
      clearSelection();
      toast.success(`${ids.length} photo${ids.length !== 1 ? 's' : ''} restored`);
    } catch {
      toast.error('Some photos could not be restored');
    } finally {
      setBulkRestoring(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => photoApi.permanentDelete(id, eventId)));
      setPhotos((prev) => prev.filter((p) => !ids.includes(p._id)));
      clearSelection();
      toast.success(`${ids.length} photo${ids.length !== 1 ? 's' : ''} permanently deleted`);
    } catch {
      toast.error('Some photos could not be deleted');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (eventLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const allSelected = photos.length > 0 && selected.size === photos.length;

  return (
    <div data-tag="trash-page" className="min-h-screen bg-background">
      {/* Header */}
      <div data-tag="trash-topbar" className="border-b border-border bg-card/60 backdrop-blur supports-backdrop-blur:bg-card/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2">
          <button
            data-tag="back-to-event-btn"
            onClick={() => router.push(`/event/${eventId}`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Back to event"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Recycle Bin</h1>
          <div className="ml-auto flex items-center gap-1">
            {photos.length > 0 && (
              <span className="text-sm text-muted-foreground mr-2">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              data-tag="view-tile-btn"
              onClick={() => setView('tile')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'tile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              aria-label="Tile view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              data-tag="view-list-btn"
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div data-tag="trash-selection-bar" className="sticky top-[49px] z-10 border-b border-border bg-card/95 backdrop-blur">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
            <button onClick={allSelected ? clearSelection : selectAll} className="p-1.5 rounded hover:bg-muted transition-colors">
              <CheckSquare className={`w-4 h-4 ${allSelected ? 'text-primary' : 'text-muted-foreground'}`} />
            </button>
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                data-tag="bulk-restore-btn"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleBulkRestore}
                disabled={bulkRestoring || bulkDeleting}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {bulkRestoring ? 'Restoring…' : 'Restore'}
              </Button>
              <Button
                data-tag="bulk-delete-btn"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleBulkDelete}
                disabled={bulkRestoring || bulkDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {bulkDeleting ? 'Deleting…' : 'Delete'}
              </Button>
              <button onClick={clearSelection} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-tag="trash-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-muted-foreground mb-6">
          Deleted photos are kept for 24 hours before automatic permanent deletion.
        </p>

        {photos.length === 0 ? (
          <div data-tag="trash-empty-state" className="flex flex-col items-center justify-center py-24 gap-4 text-center border-2 border-dashed rounded-2xl">
            <Trash2 className="h-14 w-14 text-muted-foreground/25" />
            <div>
              <p className="font-medium text-muted-foreground">Recycle bin is empty</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Deleted photos will appear here</p>
            </div>
          </div>
        ) : view === 'tile' ? (
          /* ── Tile view ──────────────────────────────────────────────────── */
          <div data-tag="trash-tile-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => {
              const isSelected = selected.has(photo._id);
              const deletedAt = photo.deletedAt ? new Date(photo.deletedAt) : null;
              const expiresAt = deletedAt ? new Date(deletedAt.getTime() + 24 * 60 * 60 * 1000) : null;
              const hoursLeft = expiresAt
                ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3_600_000))
                : null;
              const isExpiringSoon = hoursLeft !== null && hoursLeft <= 3;

              return (
                <div
                  data-tag="trash-tile-item"
                  key={photo._id}
                  className={`relative group rounded-xl overflow-hidden bg-muted cursor-pointer ring-2 transition-all ${isSelected ? 'ring-primary' : 'ring-transparent'}`}
                  onClick={() => toggleSelect(photo._id)}
                >
                  <div className="aspect-square relative">
                    <Image src={photo.imageUrl} alt={photo.originalName} fill className="object-cover" sizes="200px" />
                  </div>
                  {/* Selection checkbox */}
                  <div className={`absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'bg-black/30 border-white/70 group-hover:border-white'}`}>
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {/* Expiry badge */}
                  {hoursLeft !== null && (
                    <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-medium text-white ${isExpiringSoon ? 'bg-destructive/80' : 'bg-black/50'}`}>
                      ~{hoursLeft}h left
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List view ──────────────────────────────────────────────────── */
          <div data-tag="trash-list" className="bg-card border rounded-xl overflow-hidden divide-y divide-border">
            {photos.map((photo) => {
              const isSelected = selected.has(photo._id);
              const deletedAt = photo.deletedAt ? new Date(photo.deletedAt) : null;
              const expiresAt = deletedAt
                ? new Date(deletedAt.getTime() + 24 * 60 * 60 * 1000)
                : null;
              const hoursLeft = expiresAt
                ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3_600_000))
                : null;
              const isExpiringSoon = hoursLeft !== null && hoursLeft <= 3;

              return (
                <div
                  data-tag="trash-photo-row"
                  key={photo._id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(photo._id)}
                    className={`mt-1 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'}`}
                  >
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>

                  {/* Thumbnail */}
                  <div data-tag="trash-photo-thumbnail" className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={photo.imageUrl}
                      alt={photo.originalName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>

                  {/* Info + Actions */}
                  <div className="flex-1 min-w-0">
                    <div data-tag="trash-photo-info" className="min-w-0">
                      <p className="text-sm font-medium truncate">{photo.originalName}</p>
                      {hoursLeft !== null && (
                        <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {isExpiringSoon ? `Expiring in ~${hoursLeft}h` : `Expires in ~${hoursLeft}h`}
                        </p>
                      )}
                      {deletedAt && (
                        <p className="text-xs text-muted-foreground/60">
                          Deleted {deletedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div data-tag="trash-photo-actions" className="flex items-center gap-2 mt-2">
                      <Button
                        data-tag="restore-photo-btn"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleRestore(photo._id)}
                        disabled={restoringId === photo._id}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {restoringId === photo._id ? 'Restoring…' : 'Restore'}
                      </Button>
                      <Button
                        data-tag="permanent-delete-photo-btn"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handlePermanentDelete(photo._id)}
                        disabled={permDeleteId === photo._id}
                        title="Delete permanently"
                      >
                        {permDeleteId === photo._id
                          ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrashPage() {
  const params = useParams<{ eventId: string }>();
  return (
    <ProtectedRoute>
      <TrashContent eventId={params.eventId} />
    </ProtectedRoute>
  );
}
