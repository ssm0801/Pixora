'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { authApi, otpApi } from '@/lib/api';
import { saveAuth, getToken } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Lock, Trash2, AlertTriangle, Eye, EyeOff, Check, X, ChevronLeft, Loader2 } from 'lucide-react';
import OtpInput from '@/components/OtpInput';
import PhoneInput from '@/components/PhoneInput';

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
  const [pwdOtpStep, setPwdOtpStep] = useState<'form' | 'otp'>('form');
  const [pwdOtp, setPwdOtp] = useState('');
  const [pwdOtpTimer, setPwdOtpTimer] = useState(0);
  const [pwdExpiryTimer, setPwdExpiryTimer] = useState(0);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // OTP modal for profile changes
  const [otpModal, setOtpModal] = useState<{
    emailChanging: boolean;
    phoneChanging: boolean;
    pendingData: { firstName: string; lastName: string; email: string; phone: string };
  } | null>(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtpTimer, setEmailOtpTimer] = useState(0);
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [savingWithOtp, setSavingWithOtp] = useState(false);
  const [otpExpiryTimer, setOtpExpiryTimer] = useState(0);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountOtpStep, setDeleteAccountOtpStep] = useState<'confirm' | 'otp'>('confirm');
  const [deleteAccountOtp, setDeleteAccountOtp] = useState('');
  const [deleteAccountOtpTimer, setDeleteAccountOtpTimer] = useState(0);
  const [deleteAccountExpiryTimer, setDeleteAccountExpiryTimer] = useState(0);

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

  // OTP countdown timers
  useEffect(() => {
    if (emailOtpTimer <= 0) return;
    const t = setTimeout(() => setEmailOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [emailOtpTimer]);
  useEffect(() => {
    if (phoneOtpTimer <= 0) return;
    const t = setTimeout(() => setPhoneOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneOtpTimer]);
  useEffect(() => {
    if (otpExpiryTimer <= 0) return;
    const t = setTimeout(() => setOtpExpiryTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpExpiryTimer]);
  useEffect(() => {
    if (deleteAccountOtpTimer <= 0) return;
    const t = setTimeout(() => setDeleteAccountOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteAccountOtpTimer]);
  useEffect(() => {
    if (deleteAccountExpiryTimer <= 0) return;
    const t = setTimeout(() => setDeleteAccountExpiryTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteAccountExpiryTimer]);

  useEffect(() => {
    if (pwdOtpTimer <= 0) return;
    const t = setTimeout(() => setPwdOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [pwdOtpTimer]);
  useEffect(() => {
    if (pwdExpiryTimer <= 0) return;
    const t = setTimeout(() => setPwdExpiryTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [pwdExpiryTimer]);

  const fmtExpiry = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.firstName.trim()) { toast.error('First name is required'); return; }
    if (!profile.lastName.trim()) { toast.error('Last name is required'); return; }

    const emailChanging = !!profile.email.trim() && profile.email.toLowerCase().trim() !== user?.email;
    const phoneChanging = !!profile.phone.trim() && profile.phone.trim() !== (user as any)?.phone;

    if (emailChanging || phoneChanging) {
      // Need OTP verification — open modal and send OTPs
      const pendingData = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      };
      setEmailOtp('');
      setPhoneOtp('');
      setEmailOtpTimer(0);
      setPhoneOtpTimer(0);
      setSendingOtp(true);
      try {
        // Check availability before sending OTPs
        await authApi.checkAvailability({
          ...(emailChanging && { email: profile.email.toLowerCase().trim() }),
          ...(phoneChanging && { phone: profile.phone.trim() }),
        });

        const sends: Promise<any>[] = [];
        if (emailChanging) sends.push(otpApi.send(profile.email.toLowerCase().trim(), 'email', 'update-email'));
        if (phoneChanging) sends.push(otpApi.send(profile.phone.trim().toLowerCase(), 'phone', 'update-phone'));
        await Promise.all(sends);
        if (emailChanging) setEmailOtpTimer(60);
        if (phoneChanging) setPhoneOtpTimer(60);
        setOtpExpiryTimer(600);
        setOtpModal({ emailChanging, phoneChanging, pendingData });
        toast.success('OTP(s) sent for verification');
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to send OTP';
        const field = err.response?.data?.field;
        toast.error(msg);
        // Reset the conflicting field back to the current saved value
        if (field === 'email') setProfile((p) => ({ ...p, email: user?.email ?? '' }));
        if (field === 'phone') setProfile((p) => ({ ...p, phone: (user as any)?.phone ?? '' }));
      } finally {
        setSendingOtp(false);
      }
      return;
    }

    setProfileContactMsg(null);
    setSavingProfile(true);
    try {
      const { data } = await authApi.updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
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

  const handleOtpResendEmail = async () => {
    if (!otpModal || emailOtpTimer > 0) return;
    try {
      await otpApi.send(otpModal.pendingData.email.toLowerCase(), 'email', 'update-email');
      setEmailOtpTimer(60);
      toast.success('Email OTP resent');
    } catch { toast.error('Failed to resend email OTP'); }
  };

  const handleOtpResendPhone = async () => {
    if (!otpModal || phoneOtpTimer > 0) return;
    try {
      await otpApi.send(otpModal.pendingData.phone.trim().toLowerCase(), 'phone', 'update-phone');
      setPhoneOtpTimer(60);
      toast.success('Phone OTP resent');
    } catch { toast.error('Failed to resend phone OTP'); }
  };

  const handleOtpSave = async () => {
    if (!otpModal) return;
    if (otpModal.emailChanging && emailOtp.length !== 6) { toast.error('Please enter the 6-digit email OTP'); return; }
    if (otpModal.phoneChanging && phoneOtp.length !== 6) { toast.error('Please enter the 6-digit phone OTP'); return; }
    setProfileContactMsg(null);
    setSavingWithOtp(true);
    try {
      const { data } = await authApi.updateProfile({
        firstName: otpModal.pendingData.firstName,
        lastName: otpModal.pendingData.lastName,
        email: otpModal.pendingData.email,
        phone: otpModal.pendingData.phone,
        ...(otpModal.emailChanging ? { emailOtp } : {}),
        ...(otpModal.phoneChanging ? { phoneOtp } : {}),
      });
      const token = getToken()!;
      saveAuth(token, data.user);
      toast.success('Profile updated');
      setOtpModal(null);
    } catch (err: any) {
      if (err.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        setProfileContactMsg(err.response.data.message);
        setOtpModal(null);
      } else {
        toast.error(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSavingWithOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.current) { toast.error('Current password is required'); return; }
    const allPwdPassed = pwdRules.every((r) => r.test(passwords.next));
    if (!allPwdPassed) { toast.error('New password does not meet the requirements'); return; }
    if (passwords.next !== passwords.confirm) { toast.error('New passwords do not match'); return; }
    if (passwords.next === passwords.current) { toast.error('New password must be different from your current password'); return; }
    // Step 1: send OTP
    setSavingPassword(true);
    try {
      await otpApi.send(user!.email, 'email', 'change-password');
      setPwdOtpStep('otp');
      setPwdOtpTimer(60);
      setPwdExpiryTimer(600);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleConfirmChangePassword = async () => {
    setSavingPassword(true);
    setPwdError(null);
    try {
      await authApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.next, otp: pwdOtp });
      toast.success('Password updated');
      setPasswords({ current: '', next: '', confirm: '' });
      setPwdOtpStep('form');
      setPwdOtp('');
      setPwdExpiryTimer(0);
    } catch (err: any) {
      setPwdError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResendPwdOtp = async () => {
    if (pwdOtpTimer > 0) return;
    try {
      await otpApi.send(user!.email, 'email', 'change-password');
      setPwdOtpTimer(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleRequestDeleteAccountOtp = async () => {
    if (!user?.email) return;
    setDeletingAccount(true);
    try {
      await otpApi.send(user.email, 'email', 'delete-account');
      setDeleteAccountOtpStep('otp');
      setDeleteAccountOtpTimer(60);
      setDeleteAccountExpiryTimer(600);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResendDeleteAccountOtp = async () => {
    if (deleteAccountOtpTimer > 0 || !user?.email) return;
    try {
      await otpApi.send(user.email, 'email', 'delete-account');
      setDeleteAccountOtpTimer(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await authApi.deleteAccount(deleteAccountOtp);
      toast.success('Account deleted');
      logout();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
      setDeletingAccount(false);
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
                  <Label className="text-[13px]">Phone number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <PhoneInput
                    value={profile.phone}
                    onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
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
              <Button type="submit" disabled={savingProfile || sendingOtp}>
                {sendingOtp ? 'Sending OTP…' : savingProfile ? 'Saving…' : 'Save changes'}
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
              {pwdOtpStep === 'otp' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="font-medium text-foreground">{user?.email}</span> to confirm.</p>
                  <div className={`flex items-center justify-between text-[12px] px-3 py-2 rounded-lg ${pwdExpiryTimer <= 60 && pwdExpiryTimer > 0 ? 'bg-orange-500/10 text-orange-500' : pwdExpiryTimer === 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-muted-foreground'}`}>
                    <span>{pwdExpiryTimer === 0 ? 'OTP expired — go back and try again' : 'Expires in'}</span>
                    {pwdExpiryTimer > 0 && <span className="font-mono font-semibold">{fmtExpiry(pwdExpiryTimer)}</span>}
                  </div>
                  <OtpInput value={pwdOtp} onChange={(v) => { setPwdOtp(v); setPwdError(null); }} disabled={savingPassword} />
                  {pwdError && (
                    <p className="text-[12.5px] text-destructive flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      {pwdError}
                    </p>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    {pwdOtpTimer > 0 ? <>Resend in {pwdOtpTimer}s</> : <button type="button" onClick={handleResendPwdOtp} className="text-primary hover:underline">Resend code</button>}
                  </p>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => { setPwdOtpStep('form'); setPwdOtp(''); setPwdExpiryTimer(0); setPwdError(null); }} disabled={savingPassword}>Back</Button>
                    <Button type="button" className="flex-1" onClick={handleConfirmChangePassword} disabled={savingPassword || pwdOtp.length < 6 || pwdExpiryTimer === 0}>
                      {savingPassword ? 'Updating…' : 'Confirm'}
                    </Button>
                  </div>
                </div>
              ) : (<>
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
                      placeholder="Enter new password"
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
                <Button
                  type="submit"
                  disabled={
                    savingPassword ||
                    !passwords.current ||
                    !pwdRules.every((r) => r.test(passwords.next)) ||
                    passwords.next !== passwords.confirm
                  }
                >
                  {savingPassword ? 'Sending OTP…' : 'Update password'}
                </Button>
              </>)}
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

      {/* ── OTP verification modal for profile changes ───────────────────── */}
      {otpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 border">
            <div>
              <h2 className="text-base font-semibold">Verify your changes</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the OTP{otpModal.emailChanging && otpModal.phoneChanging ? 's' : ''} sent to verify your new {[otpModal.emailChanging && 'email', otpModal.phoneChanging && 'phone number'].filter(Boolean).join(' and ')}.
              </p>
            </div>

            {/* Expiry countdown */}
            <div className={`flex items-center justify-between text-[12px] px-3 py-2 rounded-lg ${otpExpiryTimer <= 60 && otpExpiryTimer > 0 ? 'bg-orange-500/10 text-orange-500' : otpExpiryTimer === 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-muted-foreground'}`}>
              <span>{otpExpiryTimer === 0 ? 'OTP expired — close and try again' : 'Expires in'}</span>
              {otpExpiryTimer > 0 && <span className="font-mono font-semibold">{fmtExpiry(otpExpiryTimer)}</span>}
            </div>

            {otpModal.emailChanging && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-medium">Email OTP</Label>
                  <button type="button" onClick={handleOtpResendEmail} disabled={emailOtpTimer > 0} className="text-[12px] text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
                    {emailOtpTimer > 0 ? `Resend in ${emailOtpTimer}s` : 'Resend'}
                  </button>
                </div>
                <p className="text-[12px] text-muted-foreground">{otpModal.pendingData.email}</p>
                <OtpInput value={emailOtp} onChange={setEmailOtp} disabled={savingWithOtp} />
              </div>
            )}

            {otpModal.phoneChanging && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-medium">Phone OTP</Label>
                  <button type="button" onClick={handleOtpResendPhone} disabled={phoneOtpTimer > 0} className="text-[12px] text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
                    {phoneOtpTimer > 0 ? `Resend in ${phoneOtpTimer}s` : 'Resend'}
                  </button>
                </div>
                <p className="text-[12px] text-muted-foreground">{otpModal.pendingData.phone}</p>
                <OtpInput value={phoneOtp} onChange={setPhoneOtp} disabled={savingWithOtp} />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setOtpModal(null); setOtpExpiryTimer(0); }} disabled={savingWithOtp}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleOtpSave} disabled={savingWithOtp || otpExpiryTimer === 0}>
                {savingWithOtp ? 'Saving…' : 'Verify & Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

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

            {deleteAccountOtpStep === 'confirm' ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your account, all events you manage, and all associated data will be permanently deleted. This cannot be undone.
                </p>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={deletingAccount}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleRequestDeleteAccountOtp} disabled={deletingAccount}>
                    {deletingAccount ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Sending OTP…</> : 'Continue'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{user?.email}</span> to confirm deletion.
                </p>
                <div className={`flex items-center justify-between text-[12px] px-3 py-2 rounded-lg ${deleteAccountExpiryTimer <= 60 && deleteAccountExpiryTimer > 0 ? 'bg-orange-500/10 text-orange-500' : deleteAccountExpiryTimer === 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-muted-foreground'}`}>
                  <span>{deleteAccountExpiryTimer === 0 ? 'OTP expired — go back and try again' : 'Expires in'}</span>
                  {deleteAccountExpiryTimer > 0 && <span className="font-mono font-semibold">{fmtExpiry(deleteAccountExpiryTimer)}</span>}
                </div>
                <OtpInput value={deleteAccountOtp} onChange={setDeleteAccountOtp} disabled={deletingAccount} />
                <p className="text-center text-xs text-muted-foreground">
                  {deleteAccountOtpTimer > 0 ? (
                    <>Resend in {deleteAccountOtpTimer}s</>
                  ) : (
                    <button onClick={handleResendDeleteAccountOtp} className="text-primary hover:underline">Resend code</button>
                  )}
                </p>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => { setDeleteConfirm(false); setDeleteAccountOtpStep('confirm'); setDeleteAccountOtp(''); setDeleteAccountExpiryTimer(0); }} disabled={deletingAccount}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount} disabled={deletingAccount || deleteAccountOtp.length < 6 || deleteAccountExpiryTimer === 0}>
                    {deletingAccount ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Deleting…</> : 'Delete account'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
