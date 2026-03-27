'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import axios from 'axios';
import { ImagePlus, Loader2, CheckCircle2, Film, AlertCircle, Camera } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { Photo } from '@/types';
import { toast } from 'sonner';

/**
 * Upload architecture
 * ───────────────────
 * Small file (< 10 MB)  →  presign  →  PUT directly to S3  →  save
 * Large file (≥ 10 MB)  →  presign-multipart  →  PUT each part in parallel  →
 *                           complete-multipart  →  save
 *
 * Transfer Acceleration on the S3 bucket routes all uploads via the nearest
 * AWS edge PoP (Mumbai / Chennai / Hyderabad for India).
 *
 * 5 files upload concurrently; large-file parts also upload concurrently.
 */

const FILE_CONCURRENCY = 5;
const PART_CONCURRENCY = 5;
const MULTIPART_THRESH = 10 * 1024 * 1024; // 10 MB
const CHUNK_SIZE       = 10 * 1024 * 1024; // 10 MB per chunk

interface UploadZoneProps {
  eventId: string;
  onUploadComplete: () => void;
  onPhotoUploaded?: (photo: Photo) => void;
  externalInputRef?: React.RefObject<HTMLInputElement | null>;
}

interface FileResult {
  name:   string;
  status: 'done' | 'failed';
  error?: string;
}

interface UploadState {
  total:     number;
  done:      number;
  uploading: string[];
  results:   FileResult[];
}

export default function UploadZone({
  eventId,
  onUploadComplete,
  onPhotoUploaded,
  externalInputRef,
}: UploadZoneProps) {
  const [dragging,    setDragging]    = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const cameraRef   = useRef<HTMLInputElement>(null);
  const inputRef    = externalInputRef ?? internalRef;
  const isUploading = uploadState !== null;

  // ── Upload orchestrator ───────────────────────────────────────────────────
  const upload = async (files: File[]) => {
    if (!files.length) return;

    setUploadState({ total: files.length, done: 0, uploading: [], results: [] });

    const results: FileResult[] = [];
    let fileIndex = 0;

    const uploadOne = async (file: File): Promise<void> => {
      setUploadState((prev) =>
        prev ? { ...prev, uploading: [...prev.uploading, file.name] } : null
      );

      try {
        if (file.size >= MULTIPART_THRESH) {
          await uploadMultipart(file);
        } else {
          await uploadSingle(file);
        }
        results.push({ name: file.name, status: 'done' });
      } catch (err: any) {
        const reason =
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          err.message ||
          'Unknown error';
        results.push({ name: file.name, status: 'failed', error: reason });
      } finally {
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                done:      prev.done + 1,
                uploading: prev.uploading.filter((n) => n !== file.name),
                results:   [...results],
              }
            : null
        );
      }
    };

    // Single presigned PUT
    const uploadSingle = async (file: File) => {
      const { data } = await mediaApi.presign(eventId, {
        fileName:    file.name,
        contentType: file.type || 'application/octet-stream',
      });
      await axios.put(data.url, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      await saveAndNotify(file, data.key);
    };

    // Multipart — chunks uploaded in parallel
    const uploadMultipart = async (file: File) => {
      const { data } = await mediaApi.presignMultipart(eventId, {
        fileName:    file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize:    file.size,
      });

      const { uploadId, key, parts } = data as {
        uploadId: string;
        key:      string;
        parts:    { partNumber: number; url: string }[];
      };

      const etags: { ETag: string; PartNumber: number }[] = [];
      let partIndex = 0;

      const partWorker = async () => {
        while (partIndex < parts.length) {
          const part  = parts[partIndex++];
          const start = (part.partNumber - 1) * CHUNK_SIZE;
          const end   = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const response = await axios.put(part.url, chunk, {
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });

          const etag = response.headers['etag'] ?? response.headers['ETag'] ?? '';
          etags.push({ ETag: etag, PartNumber: part.partNumber });
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(PART_CONCURRENCY, parts.length) }, partWorker)
      );

      await mediaApi.completeMultipart({ uploadId, key, parts: etags });
      await saveAndNotify(file, key);
    };

    const saveAndNotify = async (file: File, key: string) => {
      const isVideo = file.type.startsWith('video/');
      const { data: saved } = await mediaApi.save({
        eventId,
        key,
        originalName: file.name,
        fileSize:     file.size,
        resourceType: isVideo ? 'video' : 'image',
      });
      onPhotoUploaded?.(saved.photo);
    };

    // FILE_CONCURRENCY workers drain the queue
    const fileWorker = async () => {
      while (fileIndex < files.length) {
        const i = fileIndex++;
        await uploadOne(files[i]);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(FILE_CONCURRENCY, files.length) }, fileWorker)
    );

    // Summary toast
    const failed    = results.filter((r) => r.status === 'failed').length;
    const succeeded = results.length - failed;

    if (failed === results.length) {
      toast.error('All uploads failed');
    } else {
      if (failed > 0) toast.error(`${failed} file${failed > 1 ? 's' : ''} failed`);
      else            toast.success(`${succeeded} file${succeeded > 1 ? 's' : ''} uploaded`);
      onUploadComplete();
    }

    if (failed > 0) {
      setTimeout(() => setUploadState(null), 6000);
    } else {
      setUploadState(null);
    }
  };

  // ── File filtering ────────────────────────────────────────────────────────
  const isMedia = (f: File) =>
    f.type.startsWith('image/') || f.type.startsWith('video/');

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (isUploading) return;
    upload(Array.from(e.dataTransfer.files).filter(isMedia));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const all      = Array.from(e.target.files || []);
    const media    = all.filter(isMedia);
    const rejected = all.length - media.length;
    if (rejected > 0)
      toast.error(`${rejected} file${rejected > 1 ? 's' : ''} skipped — photos and videos only`);
    upload(media);
    e.target.value = '';
  };

  const overallPct    = uploadState ? Math.round((uploadState.done / uploadState.total) * 100) : 0;
  const failedResults = uploadState?.results.filter((r) => r.status === 'failed') ?? [];

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
          ${isUploading
            ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
            : dragging
            ? 'border-primary bg-primary/5 cursor-copy'
            : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'}
        `}
      >
        {/* Gallery / file picker */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onChange}
          disabled={isUploading}
        />
        {/* Camera capture (mobile) */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={onChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
        ) : (
          <div className="flex items-center justify-center gap-2 mb-2">
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <Film      className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <p className="text-sm font-medium">
          {isUploading ? 'Uploading…' : 'Drop photos or videos here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUploading
            ? `${uploadState!.done} / ${uploadState!.total} done`
            : 'Any quantity · photos & videos · direct to S3'}
        </p>
      </div>

      {/* Camera button — visible when not uploading */}
      {!isUploading && (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-muted-foreground/25 py-2.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
        >
          <Camera className="h-4 w-4" />
          Take a photo
        </button>
      )}

      {uploadState && (
        <div className="border rounded-xl p-3 space-y-2.5 bg-card text-[13px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>
                <span className="font-semibold text-foreground tabular-nums">{uploadState.done}</span>
                {' / '}
                <span className="tabular-nums">{uploadState.total}</span>
                {' uploaded'}
              </span>
            </div>
            <span className="font-semibold text-primary tabular-nums">{overallPct}%</span>
          </div>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {uploadState.uploading.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              {'Uploading: '}
              {uploadState.uploading.slice(0, 3).join(', ')}
              {uploadState.uploading.length > 3
                ? ` +${uploadState.uploading.length - 3} more`
                : ''}
            </p>
          )}

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
