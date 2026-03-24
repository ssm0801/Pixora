'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { photoApi } from '@/lib/api';
import { toast } from 'sonner';

interface UploadZoneProps {
  eventId: string;
  onUploadComplete: () => void;
}

export default function UploadZone({ eventId, onUploadComplete }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    setFileCount(files.length);
    setProgress(0);
    try {
      if (files.length === 1) {
        await photoApi.upload(eventId, files[0], setProgress);
      } else {
        await photoApi.uploadMultiple(eventId, files, setProgress);
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
      onUploadComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setProgress(0);
      setFileCount(0);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (isUploading) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    upload(files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    upload(files);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${isUploading
            ? 'border-primary/40 bg-primary/5 cursor-not-allowed opacity-70'
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
          <Loader2 className="mx-auto h-9 w-9 text-primary animate-spin mb-3" />
        ) : (
          <ImagePlus className="mx-auto h-9 w-9 text-muted-foreground mb-3" />
        )}

        <p className="text-sm font-medium">
          {isUploading ? `Uploading ${fileCount} photo${fileCount > 1 ? 's' : ''}…` : 'Drop photos here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUploading ? 'Please wait until upload completes' : 'JPG, PNG, WEBP, GIF — up to 20 at a time'}
        </p>
      </div>

      {/* Progress bar — shown below the zone while uploading */}
      {isUploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Uploading…</span>
            <span className="font-medium text-primary tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
