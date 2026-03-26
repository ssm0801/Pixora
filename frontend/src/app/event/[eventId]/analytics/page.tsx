'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { analyticsApi } from '@/lib/api';
import {
  Camera,
  ChevronLeft,
  Folder,
  ImageIcon,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface UploadDay {
  _id: string;   // 'YYYY-MM-DD'
  count: number;
}

interface TopUploader {
  _id: string;
  count: number;
  name?: string;
}

interface CameraEntry {
  _id: { make?: string; model?: string };
  count: number;
}

interface FolderStat {
  _id: string;
  name: string;
  count: number;
}

interface Analytics {
  summary: {
    totalPhotos: number;
    publicCount: number;
    privateCount: number;
    trashCount: number;
    memberCount: number;
    folderCount: number;
    totalFavorites: number;
    uploadsToday: number;
    totalSizeBytes: number;
    unfolderedCount: number;
  };
  uploadTimeline: UploadDay[];
  topUploaders: TopUploader[];
  folderBreakdown: FolderStat[];
  metadataCoverage: {
    capturedAt: number;
    gps: number;
    withCapturedAt: number;
    withGps: number;
    total: number;
  };
  capturedDateRange: {
    oldest: string | null;
    newest: string | null;
  };
  cameraBreakdown: CameraEntry[];
}

// ── Stat row ───────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// ── Bar chart (CSS only) ───────────────────────────────────────────────────────

function UploadBarChart({ data }: { data: UploadDay[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No uploads in the last 30 days.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  // Build a lookup for last 14 days
  const today = new Date();
  const days: { label: string; dateKey: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ dateKey: key, label });
  }

  const lookup = Object.fromEntries(data.map((d) => [d._id, d.count]));

  return (
    <div className="flex items-end gap-1 h-40 w-full" aria-label="Uploads per day chart">
      {days.map(({ dateKey, label }) => {
        const count = lookup[dateKey] ?? 0;
        const heightPct = max > 0 ? (count / max) * 100 : 0;
        return (
          <div
            key={dateKey}
            className="flex flex-col items-center flex-1 gap-1"
            title={`${label}: ${count} uploads`}
          >
            <span className="text-[10px] text-muted-foreground font-medium">{count > 0 ? count : ''}</span>
            <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
              <div
                className="w-full rounded-t bg-primary transition-all duration-300"
                style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Coverage bar ───────────────────────────────────────────────────────────────

function CoverageBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function AnalyticsContent({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { event, isLoading: eventLoading } = useEvent(eventId);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = event ? event.adminId._id === user?._id : false;

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsApi.getEvent(eventId);
      setAnalytics(res.data.analytics);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to load analytics';
      setError(msg);
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
      fetchAnalytics();
    }
  }, [eventLoading, event, isAdmin, fetchAnalytics, router, eventId]);

  if (eventLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive text-center">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="text-sm text-primary underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const { summary, uploadTimeline, topUploaders, folderBreakdown, metadataCoverage, capturedDateRange, cameraBreakdown } = analytics;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div data-tag="analytics-page" className="min-h-screen bg-background">
      {/* Header */}
      <div data-tag="analytics-topbar" className="border-b border-border bg-card/60 backdrop-blur supports-backdrop-blur:bg-card/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2">
          <button
            data-tag="back-to-event-btn"
            onClick={() => router.push(`/event/${eventId}`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Back to event"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
        </div>
      </div>

      <div data-tag="analytics-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Summary panel */}
        <section data-tag="analytics-summary-section">
          <div data-tag="summary-card" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Photos column */}
              <div data-tag="summary-photos-col" className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Photos
                </p>
                <StatRow label="Total photos" value={summary.totalPhotos} />
                <StatRow label="In trash" value={summary.trashCount} />
                {summary.totalSizeBytes > 0 && (
                  <StatRow label="Storage used" value={formatBytes(summary.totalSizeBytes)} />
                )}
                <StatRow label="Uploads today" value={summary.uploadsToday} />
              </div>
              {/* Event column */}
              <div data-tag="summary-event-col" className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Event
                </p>
                <StatRow label="Members" value={summary.memberCount} />
                <StatRow label="Folders" value={summary.folderCount} />
                <StatRow label="Favourites" value={summary.totalFavorites} />
                <StatRow label="Unorganised photos" value={summary.unfolderedCount} />
              </div>
            </div>
          </div>
        </section>

        {/* Upload Timeline */}
        <section data-tag="analytics-upload-timeline-section">
          <div data-tag="upload-timeline-card" className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Uploads — Last 14 Days</h2>
            </div>
            <UploadBarChart data={uploadTimeline} />
          </div>
        </section>

        <div data-tag="analytics-grid-two-col" className="grid md:grid-cols-2 gap-6">
          {/* Top Uploaders */}
          <section data-tag="analytics-top-uploaders-section">
            <div data-tag="top-uploaders-card" className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Top Uploaders</h2>
              </div>
              {topUploaders.length === 0 ? (
                <p className="text-muted-foreground text-sm">No uploads yet.</p>
              ) : (
                <ol data-tag="top-uploaders-list" className="space-y-3">
                  {topUploaders.map((u, idx) => {
                    const barPct = topUploaders[0]?.count
                      ? Math.round((u.count / topUploaders[0].count) * 100)
                      : 0;
                    return (
                      <li data-tag="uploader-item" key={u._id} className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="truncate font-medium text-foreground">{u.name ?? 'Unknown'}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">{u.count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          {/* Folder Breakdown */}
          <section data-tag="analytics-folder-breakdown-section">
            <div data-tag="folder-breakdown-card" className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full">
              <div className="flex items-center gap-2 mb-5">
                <Folder className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Folder Breakdown</h2>
              </div>
              {folderBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-sm">No folders created yet.</p>
              ) : (
                <div data-tag="folder-breakdown-list" className="space-y-3">
                  {folderBreakdown.map((f) => {
                    const barPct = summary.totalPhotos > 0
                      ? Math.round((f.count / summary.totalPhotos) * 100) : 0;
                    return (
                      <div data-tag="folder-breakdown-item" key={f._id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="truncate font-medium text-foreground">{f.name}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">{f.count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {summary.unfolderedCount > 0 && (
                    <div data-tag="folder-breakdown-unorganised" className="flex items-center justify-between text-sm pt-1 border-t border-border text-muted-foreground">
                      <span>Unorganised (no folder)</span>
                      <span className="font-medium">{summary.unfolderedCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Metadata & capture dates */}
        {metadataCoverage.total > 0 && (
          <section data-tag="analytics-metadata-section">
            <div data-tag="metadata-card" className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Metadata Coverage</h2>
              </div>
              <div data-tag="metadata-grid" className="grid sm:grid-cols-2 gap-6">
                <div data-tag="metadata-coverage-bars" className="space-y-4">
                  <CoverageBar pct={metadataCoverage.capturedAt} label={`Capture date (${metadataCoverage.withCapturedAt} / ${metadataCoverage.total})`} />
                  <CoverageBar pct={metadataCoverage.gps} label={`GPS location (${metadataCoverage.withGps} / ${metadataCoverage.total})`} />
                </div>
                {(capturedDateRange.oldest || capturedDateRange.newest) && (
                  <div data-tag="metadata-date-range" className="space-y-2 text-sm">
                    {capturedDateRange.oldest && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Oldest photo taken</span>
                        <span className="font-medium">{formatDate(capturedDateRange.oldest)}</span>
                      </div>
                    )}
                    {capturedDateRange.newest && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Newest photo taken</span>
                        <span className="font-medium">{formatDate(capturedDateRange.newest)}</span>
                      </div>
                    )}
                    {metadataCoverage.withGps > 0 && (
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> Photos with location
                        </span>
                        <span className="font-medium">{metadataCoverage.withGps}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Camera Breakdown */}
        {cameraBreakdown.length > 0 && (
          <section data-tag="analytics-camera-breakdown-section">
            <div data-tag="camera-breakdown-card" className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Camera className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Devices Used</h2>
              </div>
              <div data-tag="camera-breakdown-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cameraBreakdown.map((cam, idx) => {
                  const label = [cam._id.make, cam._id.model].filter(Boolean).join(' ') || 'Unknown device';
                  return (
                    <div data-tag="camera-item" key={idx} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
                      <span className="text-sm text-foreground truncate max-w-[70%]" title={label}>{label}</span>
                      <span className="text-sm font-semibold text-primary ml-2 shrink-0">{cam.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  return (
    <ProtectedRoute>
      <AnalyticsContent eventId={eventId} />
    </ProtectedRoute>
  );
}
