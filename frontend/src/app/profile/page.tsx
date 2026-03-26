'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { saveAuth, getToken } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Lock, Trash2, AlertTriangle, Eye, EyeOff, Check, X, ChevronLeft } from 'lucide-react';

const pwdRules = [
  { id: 'len',     label: 'At least 8 characters',        test: (p: string) => p.length >= 8          },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',    test: (p: string) => /[A-Z]/.test(p)        },
  { id: 'lower',   label: 'One lowercase letter (a–z)',    test: (p: string) => /[a-z]/.test(p)        },
  { id: 'number',  label: 'One number (0–9)',              test: (p: string) => /[0-9]/.test(p)        },
  { id: 'special', label: 'One special character (!@#$…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Profile form
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileContactMsg, setProfileContactMsg] = useState<string | null>(null);

  // Password form
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [newPwdFocused, setNewPwdFocused] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Pre-fill from context
  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
        phone: (user as any).phone ?? '',
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.firstName.trim()) { toast.error('First name is required'); return; }
    if (!profile.lastName.trim()) { toast.error('Last name is required'); return; }
    setProfileContactMsg(null);
    setSavingProfile(true);
    try {
      const { data } = await authApi.updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      // Update stored user
      const token = getToken()!;
      saveAuth(token, data.user);
      toast.success('Profile updated');
    } catch (err: any) {
      if (err.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        setProfileContactMsg(err.response.data.message);
      } else {
        toast.error(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const allPwdPassed = pwdRules.every((r) => r.test(passwords.next));
    if (!allPwdPassed) { toast.error('New password does not meet the requirements'); return; }
    if (passwords.next !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      toast.success('Password updated');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await authApi.deleteAccount();
      toast.success('Account deleted');
      logout();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
      setDeletingAccount(false);
      setDeleteConfirm(false);
    }
  };

  const isGoogleUser = user && !(user as any).password && (user as any).googleId;

  return (
    <ProtectedRoute>
      <div className="max-w-screen-2xl mx-auto px-6 py-10">
        <div className="max-w-xl mx-auto space-y-8">

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 -ml-2 shrink-0" title="Back">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Profile</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage your account details</p>
            </div>
          </div>

          {/* ── Profile info ────────────────────────────────────────────── */}
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Personal information</h2>
                <p className="text-xs text-muted-foreground">Update your name, email and phone</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-firstName" className="text-[13px]">First name</Label>
                  <Input
                    id="profile-firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Jane"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-lastName" className="text-[13px]">Last name</Label>
                  <Input
                    id="profile-lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="profile-email" className="text-[13px]">Email address</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    disabled={!!isGoogleUser}
                  />
                  {isGoogleUser && (
                    <p className="text-xs text-muted-foreground">Email is managed by Google and cannot be changed here.</p>
                  )}
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="profile-phone" className="text-[13px]">Phone number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                    maxLength={20}
                  />
                </div>
              </div>
              {profileContactMsg && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2.5 text-[12.5px] text-destructive leading-snug">
                  <span className="font-semibold">Cannot save.</span> {profileContactMsg}{' '}
                  <a href="mailto:support@pixora.app" className="underline underline-offset-2 font-medium hover:opacity-80">
                    Contact support
                  </a>
                </div>
              )}
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </div>

          {/* ── Change password ──────────────────────────────────────────── */}
          {!isGoogleUser && (
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Change password</h2>
                  <p className="text-xs text-muted-foreground">Choose a strong, unique password</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pwd-current" className="text-[13px]">Current password</Label>
                  <div className="relative">
                    <Input
                      id="pwd-current"
                      type={showCurrent ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pwd-new" className="text-[13px]">New password</Label>
                  <div className="relative">
                    <Input
                      id="pwd-new"
                      type={showNext ? 'text' : 'password'}
                      value={passwords.next}
                      onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                      onFocus={() => setNewPwdFocused(true)}
                      onBlur={() => setNewPwdFocused(false)}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNext((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {(newPwdFocused || (passwords.next.length > 0 && !pwdRules.every((r) => r.test(passwords.next)))) && (
                    <ul className="space-y-1 pt-0.5">
                      {pwdRules.map((r) => {
                        const ok = r.test(passwords.next);
                        return (
                          <li key={r.id} className={`flex items-center gap-1.5 text-[11.5px] transition-colors ${ok ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                            {r.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pwd-confirm" className="text-[13px]">Confirm new password</Label>
                  <Input
                    id="pwd-confirm"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </div>
          )}

          {/* ── Delete account ───────────────────────────────────────────── */}
          <div className="bg-card border border-destructive/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-destructive">Delete account</h2>
                <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will delete your account, all events you manage, and remove you from all other events. This action <span className="font-semibold text-foreground">cannot be undone</span>.
            </p>
            <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
              Delete my account
            </Button>
          </div>
        </div>
      </div>

      {/* ── Delete account confirmation ───────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Delete account?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account, all events you manage, and all associated data will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={deletingAccount}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? 'Deleting…' : 'Yes, delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
