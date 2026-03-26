'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { ImagePlus, Loader2, CheckCircle2 } from 'lucide-react';
import { photoApi } from '@/lib/api';
import { toast } from 'sonner';

interface UploadZoneProps {
  eventId: string;
  onUploadComplete: () => void;
  externalInputRef?: React.RefObject<HTMLInputElement | null>;
}

interface UploadState {
  total: number;
  done: number;
  currentName: string;
  currentProgress: number; // 0–100 for the file currently uploading
}

export default function UploadZone({ eventId, onUploadComplete, externalInputRef }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalRef;

  const isUploading = uploadState !== null;

  const upload = async (files: File[]) => {
    if (!files.length) return;

    setUploadState({ total: files.length, done: 0, currentName: files[0].name, currentProgress: 0 });

    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadState((prev) =>
        prev ? { ...prev, currentName: file.name, currentProgress: 0 } : null
      );
      try {
        await photoApi.upload(eventId, file, (pct) => {
          setUploadState((prev) =>
            prev ? { ...prev, currentProgress: pct } : null
          );
        });
        setUploadState((prev) =>
          prev ? { ...prev, done: i + 1, currentProgress: 100 } : null
        );
      } catch {
        failed++;
        setUploadState((prev) =>
          prev ? { ...prev, done: i + 1 } : null
        );
      }
    }

    if (failed === files.length) {
      toast.error('All uploads failed');
    } else if (failed > 0) {
      toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to upload`);
      onUploadComplete();
    } else {
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
      onUploadComplete();
    }

    setUploadState(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (isUploading) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    upload(files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const all = Array.from(e.target.files || []);
    const images = all.filter((f) => f.type.startsWith('image/'));
    const rejected = all.length - images.length;
    if (rejected > 0) toast.error(`${rejected} file${rejected > 1 ? 's' : ''} skipped — images only`);
    upload(images);
    e.target.value = '';
  };

  // Overall progress across all files (each file contributes 1/total to completion)
  const overallPct = uploadState
    ? Math.round(((uploadState.done + uploadState.currentProgress / 100) / uploadState.total) * 100)
    : 0;

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
              : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
        ) : (
          <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        )}

        <p className="text-sm font-medium">
          {isUploading ? 'Uploading…' : 'Drop photos here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUploading
            ? 'Please wait until upload completes'
            : 'JPG, PNG, WEBP, GIF — up to 20 at a time'}
        </p>
      </div>

      {/* Detailed progress — shown while uploading */}
      {uploadState && (
        <div className="border rounded-xl p-3 space-y-2.5 bg-card text-[13px]">
          {/* File count summary */}
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

          {/* Overall progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Current file */}
          {uploadState.done < uploadState.total && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[160px]" title={uploadState.currentName}>
                  {uploadState.currentName}
                </span>
                <span className="tabular-nums shrink-0 ml-2">{uploadState.currentProgress}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-100"
                  style={{ width: `${uploadState.currentProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
