'use client';

import { useState, useEffect } from 'react';
import { Photo } from '@/types';
import { photoApi } from '@/lib/api';

export const usePhotos = (eventId: string) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = async () => {
    try {
      setIsLoading(true);
      const { data } = await photoApi.list(eventId);
      setPhotos(data.photos);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchPhotos();
  }, [eventId]);

  return { photos, isLoading, error, refetch: fetchPhotos };
};
