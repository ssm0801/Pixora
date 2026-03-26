'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import GoogleButton from '@/components/GoogleButton';

const rules = [
  { id: 'len',     label: 'At least 8 characters',          test: (p: string) => p.length >= 8          },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',      test: (p: string) => /[A-Z]/.test(p)        },
  { id: 'lower',   label: 'One lowercase letter (a–z)',      test: (p: string) => /[a-z]/.test(p)        },
  { id: 'number',  label: 'One number (0–9)',                test: (p: string) => /[0-9]/.test(p)        },
  { id: 'special', label: 'One special character (!@#$…)',   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function strengthLabel(passed: number): { label: string; colour: string } {
  if (passed <= 1) return { label: 'Very weak',  colour: 'bg-destructive'        };
  if (passed === 2) return { label: 'Weak',       colour: 'bg-orange-500'         };
  if (passed === 3) return { label: 'Fair',       colour: 'bg-yellow-500'         };
  if (passed === 4) return { label: 'Strong',     colour: 'bg-blue-500'           };
  return              { label: 'Very strong', colour: 'bg-green-500'          };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [contactTeamMsg, setContactTeamMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passed = rules.filter((r) => r.test(form.password));
  const allPassed = passed.length === rules.length;
  const confirmMatch = form.confirm.length > 0 && form.confirm === form.password;
  const confirmMismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const strength = form.password.length > 0 ? strengthLabel(passed.length) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!allPassed) {
      toast.error('Password does not meet the requirements');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setContactTeamMsg(null);
    setIsLoading(true);
    try {
      await register(form.firstName.trim(), form.lastName.trim(), form.email, form.password);
      toast.success('Account created!');
      router.push('/');
    } catch (err: any) {
      if (err.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        setContactTeamMsg(err.response.data.message);
      } else {
        toast.error(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[22rem] space-y-6">

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground mb-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <h1 className="text-[1.6rem]">Create account</h1>
          <p className="text-sm text-muted-foreground">Join Pixora and start sharing memories</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">

            {/* Name */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[13px] font-medium">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  autoComplete="given-name"
                  className="h-9 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-[13px] font-medium">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  autoComplete="family-name"
                  className="h-9 text-[14px]"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                className="h-9 text-[14px]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  autoComplete="new-password"
                  className="h-9 text-[14px] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {strength && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex gap-1">
                    {rules.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i < passed.length ? strength.colour : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] font-medium ${strength.colour.replace('bg-', 'text-')}`}>
                    {strength.label}
                  </p>
                </div>
              )}

              {/* Rules checklist — shown while focused or if not all passed */}
              {(passwordFocused || (form.password.length > 0 && !allPassed)) && (
                <ul className="space-y-1 pt-0.5">
                  {rules.map((r) => {
                    const ok = r.test(form.password);
                    return (
                      <li key={r.id} className={`flex items-center gap-1.5 text-[11.5px] transition-colors ${ok ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {ok
                          ? <Check className="h-3 w-3 shrink-0" />
                          : <X className="h-3 w-3 shrink-0" />}
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-[13px] font-medium">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
                autoComplete="new-password"
                className={`h-9 text-[14px] ${confirmMismatch ? 'border-destructive focus-visible:ring-destructive/30' : confirmMatch ? 'border-green-500 focus-visible:ring-green-500/30' : ''}`}
              />
              {confirmMismatch && (
                <p className="text-[11.5px] text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> Passwords do not match
                </p>
              )}
              {confirmMatch && (
                <p className="text-[11.5px] text-green-500 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            {contactTeamMsg && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2.5 text-[12.5px] text-destructive leading-snug">
                <span className="font-semibold">Account unavailable.</span> {contactTeamMsg}{' '}
                <a href="mailto:support@pixora.app" className="underline underline-offset-2 font-medium hover:opacity-80">
                  Contact support
                </a>
              </div>
            )}

            <Button type="submit" className="w-full h-9 text-[13.5px] mt-1" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                or
              </span>
            </div>
          </div>

          <GoogleButton label="Sign up with Google" />
        </div>

        <p className="text-center text-[13px] text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
