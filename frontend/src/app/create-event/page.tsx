'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { eventApi } from '@/lib/api';
import { toast } from 'sonner';

export default function CreateEventPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Event name is required');
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await eventApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      toast.success('Event created!');
      router.push(`/event/${data.event._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[88vh] flex items-center justify-center px-4">
        <div className="w-full max-w-[26rem] space-y-6">

          <div className="space-y-1">
            <h1 className="text-[1.6rem]">Create event</h1>
            <p className="text-sm text-muted-foreground">
              You'll be the admin — invite members and upload photos after creation.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[13px] font-medium">Event name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Sarah's Wedding 2025"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  maxLength={100}
                  className="h-9 text-[14px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-[13px] font-medium">
                  Description{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <textarea
                  id="description"
                  placeholder="Short description of the event…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={500}
                  rows={3}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition-shadow"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[13px]"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 text-[13px]"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating…' : 'Create event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
