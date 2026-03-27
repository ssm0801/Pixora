'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Photo } from '@/types';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { previewUrl } from '@/lib/cloudinary';

interface PhotoModalProps {
  photo: Photo | null;
  photos: Photo[];
  onClose: () => void;
  onNavigate: (photo: Photo) => void;
}

export default function PhotoModal({ photo, photos, onClose, onNavigate }: PhotoModalProps) {
  const currentIndex = photo ? photos.findIndex((p) => p._id === photo._id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(photos[currentIndex - 1]);
  }, [hasPrev, currentIndex, photos, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(photos[currentIndex + 1]);
  }, [hasNext, currentIndex, photos, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrev, handleNext, onClose]);

  if (!photo) return null;

  const downloadPhoto = async () => {
    const response = await fetch(photo.imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = photo.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); downloadPhoto(); }}
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Prev */}
      {hasPrev && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-4 text-white hover:bg-white/10 z-10"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Image or Video */}
      <div
        className="relative max-w-5xl max-h-[85vh] w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.mediaType === 'video' ? (
          <video
            src={photo.imageUrl}
            controls
            autoPlay
            className="w-full h-full object-contain max-h-[85vh]"
          />
        ) : (
          <Image
            src={previewUrl(photo.imageUrl, photo.mediaType)}
            alt="Photo"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        )}
      </div>

      {/* Next */}
      {hasNext && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-4 text-white hover:bg-white/10 z-10"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}
