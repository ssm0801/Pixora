'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import axios from 'axios';
import { ImagePlus, Loader2, CheckCircle2, Film, AlertCircle } from 'lucide-react';
import { photoApi } from '@/lib/api';
import { Photo } from '@/types';
import { toast } from 'sonner';

/** How many files to upload simultaneously */
const CONCURRENCY = 5;

interface UploadZoneProps {
  eventId: string;
  /** Called once when the entire batch finishes (success or partial success) */
  onUploadComplete: () => void;
  /** Called immediately after each individual file is saved — use for progressive updates */
  onPhotoUploaded?: (photo: Photo) => void;
  externalInputRef?: React.RefObject<HTMLInputElement | null>;
}

interface FileResult {
  name: string;
  status: 'done' | 'failed';
  error?: string;
}

interface UploadState {
  total: number;
  done: number;
  /** Names of files currently in-flight */
  uploading: string[];
  results: FileResult[];
}

export default function UploadZone({
  eventId,
  onUploadComplete,
  onPhotoUploaded,
  externalInputRef,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalRef;

  const isUploading = uploadState !== null;

  // ── Core upload logic ─────────────────────────────────────────────────────
  const upload = async (files: File[]) => {
    if (!files.length) return;

    setUploadState({ total: files.length, done: 0, uploading: [], results: [] });

    // ── Step 1: get Cloudinary signed params (one call for the whole batch) ──
    let sigData: {
      signature: string;
      timestamp: number;
      cloudName: string;
      apiKey: string;
      folder: string;
    };
    try {
      const { data } = await photoApi.signUpload(eventId);
      sigData = data;
    } catch (err: any) {
      toast.error(
        'Could not start upload: ' + (err.response?.data?.message || err.message)
      );
      setUploadState(null);
      return;
    }

    // Mutable results list shared across concurrent workers
    const results: FileResult[] = [];
    let fileIndex = 0; // Protected by JS single-thread between awaits

    // ── Step 2: upload a single file directly to Cloudinary, then save record ─
    const uploadOne = async (file: File): Promise<void> => {
      setUploadState((prev) =>
        prev ? { ...prev, uploading: [...prev.uploading, file.name] } : null
      );

      try {
        const form = new FormData();
        form.append('file', file);
        form.append('signature', sigData.signature);
        form.append('timestamp', String(sigData.timestamp));
        form.append('api_key', sigData.apiKey);
        form.append('folder', sigData.folder);

        // Direct browser → Cloudinary upload (no server hop)
        const { data: cld } = await axios.post(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`,
          form
        );

        // Persist record in our DB
        const { data: saved } = await photoApi.saveDirect({
          eventId,
          publicId: cld.public_id,
          secureUrl: cld.secure_url,
          originalName: file.name,
          width: cld.width,
          height: cld.height,
          fileSize: file.size,
          resourceType: cld.resource_type,
        });

        // Progressive update — add to gallery immediately
        onPhotoUploaded?.(saved.photo);

        results.push({ name: file.name, status: 'done' });
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                done: prev.done + 1,
                uploading: prev.uploading.filter((n) => n !== file.name),
                results: [...results],
              }
            : null
        );
      } catch (err: any) {
        const reason =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Unknown error';

        results.push({ name: file.name, status: 'failed', error: reason });
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                done: prev.done + 1,
                uploading: prev.uploading.filter((n) => n !== file.name),
                results: [...results],
              }
            : null
        );
      }
    };

    // ── Step 3: pool of CONCURRENCY workers chewing through the queue ─────────
    const worker = async (): Promise<void> => {
      while (fileIndex < files.length) {
        const i = fileIndex++;
        await uploadOne(files[i]);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker)
    );

    // ── Step 4: final summary ─────────────────────────────────────────────────
    const failed = results.filter((r) => r.status === 'failed').length;
    const succeeded = results.length - failed;

    if (failed === results.length) {
      toast.error('All uploads failed');
    } else {
      if (failed > 0) {
        toast.error(`${failed} file${failed > 1 ? 's' : ''} failed to upload`);
      } else {
        toast.success(`${succeeded} file${succeeded > 1 ? 's' : ''} uploaded`);
      }
      onUploadComplete();
    }

    // Keep error list visible for 6 s so the user can read it, then dismiss
    if (failed > 0) {
      setTimeout(() => setUploadState(null), 6000);
    } else {
      setUploadState(null);
    }
  };

  // ── File filtering helpers ────────────────────────────────────────────────
  const isMediaFile = (f: File) =>
    f.type.startsWith('image/') || f.type.startsWith('video/');

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (isUploading) return;
    const files = Array.from(e.dataTransfer.files).filter(isMediaFile);
    upload(files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const all = Array.from(e.target.files || []);
    const media = all.filter(isMediaFile);
    const rejected = all.length - media.length;
    if (rejected > 0)
      toast.error(`${rejected} file${rejected > 1 ? 's' : ''} skipped — photos and videos only`);
    upload(media);
    e.target.value = '';
  };

  // ── Derived progress ──────────────────────────────────────────────────────
  const overallPct = uploadState
    ? Math.round((uploadState.done / uploadState.total) * 100)
    : 0;

  const failedResults = uploadState?.results.filter((r) => r.status === 'failed') ?? [];

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isUploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
          ${
            isUploading
              ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
              : dragging
              ? 'border-primary bg-primary/5 cursor-copy'
              : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
        ) : (
          <div className="flex items-center justify-center gap-2 mb-2">
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <Film className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <p className="text-sm font-medium">
          {isUploading ? 'Uploading…' : 'Drop photos or videos here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUploading
            ? `${uploadState!.done} / ${uploadState!.total} done`
            : 'Images & videos — any quantity'}
        </p>
      </div>

      {/* Progress panel */}
      {uploadState && (
        <div className="border rounded-xl p-3 space-y-2.5 bg-card text-[13px]">
          {/* Count + overall % */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {uploadState.done}
                </span>
                {' / '}
                <span className="tabular-nums">{uploadState.total}</span>
                {' uploaded'}
              </span>
            </div>
            <span className="font-semibold text-primary tabular-nums">{overallPct}%</span>
          </div>

          {/* Overall bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Currently uploading (up to 5 names) */}
          {uploadState.uploading.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              Uploading:{' '}
              {uploadState.uploading.slice(0, 3).join(', ')}
              {uploadState.uploading.length > 3
                ? ` +${uploadState.uploading.length - 3} more`
                : ''}
            </p>
          )}

          {/* Per-file errors */}
          {failedResults.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border">
              <p className="text-xs font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {failedResults.length} failed
              </p>
              {failedResults.slice(0, 5).map((r) => (
                <div key={r.name} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground truncate inline-block max-w-[140px] align-bottom">
                    {r.name}
                  </span>
                  {r.error && (
                    <span className="text-destructive ml-1">— {r.error}</span>
                  )}
                </div>
              ))}
              {failedResults.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  …and {failedResults.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
