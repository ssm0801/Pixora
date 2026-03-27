'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ArrowRight, Zap, AlertTriangle, RefreshCcw, XCircle, Trash2 } from 'lucide-react';

// ─── Plan data ────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;        // total billed per year
  annualMonthly: number; // annual / 12 for display
  highlight: boolean;
  badge: string | null;
  badgeStyle: 'primary' | 'amber' | null;
  cta: string;
  href: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try Pixora risk-free',
    monthly: 0,
    annual: 0,
    annualMonthly: 0,
    highlight: false,
    badge: null,
    badgeStyle: null,
    cta: 'Get started free',
    href: '/register',
    features: [
      '2 active events',
      '300 photos / event',
      'View-only guest access',
      'QR code sharing',
      '10 MB max per image',
      '90-day event access',
      '2 members · both admin',
      'Never expires',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For occasional photographers',
    monthly: 299,
    annual: 2990,
    annualMonthly: 249,
    highlight: false,
    badge: null,
    badgeStyle: null,
    cta: 'Get Starter',
    href: '/register',
    features: [
      '5 active events',
      '500 photos / event',
      'Guest downloads (JPEG)',
      'Client favourites',
      'Watermark control',
      '25 MB max per image',
      '6-month event access',
      '2 members · both admin',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For working photographers',
    monthly: 749,
    annual: 7490,
    annualMonthly: 624,
    highlight: true,
    badge: 'Most popular',
    badgeStyle: 'primary',
    cta: 'Start free trial',
    href: '/register',
    features: [
      'Unlimited events',
      '2,000 photos / event',
      'Video · 5 clips / event',
      'Full-res guest downloads',
      'Facial recognition · My Photos',
      'Person tagging',
      'Smart culling · Best shot picker',
      'Smart search',
      'Duplicate detection',
      '50 MB max per image · 2 GB per video',
      'Watermark + favourites',
      '1-year event access',
      '10 members · 3 admins',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For professional studios',
    monthly: 1499,
    annual: 14990,
    annualMonthly: 1249,
    highlight: false,
    badge: null,
    badgeStyle: null,
    cta: 'Get Studio',
    href: '/register',
    features: [
      'Unlimited events',
      '5,000 photos / event',
      'Unlimited video',
      'Full-res + ZIP downloads',
      'All Pro features',
      '100 MB max per image · 8 GB per video',
      '2-year event access',
      'Unlimited members · 5 admins',
      'Priority support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'For large studios & agencies',
    monthly: 2499,
    annual: 24990,
    annualMonthly: 2082,
    highlight: false,
    badge: 'Best value annually',
    badgeStyle: 'amber',
    cta: 'Get Elite',
    href: '/register',
    features: [
      'Unlimited events',
      '10,000 photos / event',
      'Unlimited video',
      'Full-res + ZIP downloads',
      'All Studio features',
      '200 MB max per image · 20 GB per video',
      '5-year event access',
      'Unlimited members & admins',
      'Dedicated support',
    ],
  },
];

// ─── Comparison table ─────────────────────────────────────────────────────────

type CellValue = string | boolean;

const COMPARE: { label: string; values: CellValue[] }[] = [
  { label: 'Active events',       values: ['2', '5', 'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Photos / event',      values: ['300', '500', '2,000', '5,000', '10,000'] },
  { label: 'Video uploads',       values: [false, false, '5 clips', 'Unlimited', 'Unlimited'] },
  { label: 'Max image size',      values: ['10 MB', '25 MB', '50 MB', '100 MB', '200 MB'] },
  { label: 'Max video size',      values: ['—', '—', '2 GB', '8 GB', '20 GB'] },
  { label: 'Guest downloads',     values: [false, 'JPEG', 'Full res', 'Full res + ZIP', 'Full res + ZIP'] },
  { label: 'Client favourites',   values: [false, true, true, true, true] },
  { label: 'Watermark control',   values: [false, true, true, true, true] },
  { label: 'Facial recognition',  values: [false, false, true, true, true] },
  { label: 'Analytics',           values: [false, false, false, true, true] },
  { label: 'Folder access ctrl',  values: [false, false, false, true, true] },
  { label: 'Members / Admins',    values: ['2 / 2', '2 / 2', '10 / 3', 'Unlimited / 5', 'Unlimited'] },
  { label: 'Event access',         values: ['90 days', '6 months', '1 year', '2 years', '5 years'] },
  { label: 'Support',             values: ['Community', 'Email', 'Email', 'Priority', 'Dedicated'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const displayPrice = (p: Plan) =>
    billing === 'monthly' ? p.monthly : p.annualMonthly;

  const saving = (p: Plan) => p.monthly * 12 - p.annual;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center space-y-5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest">
            <Zap className="h-3 w-3" />
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Simple pricing,<br className="hidden sm:block" /> no surprises
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Start free. Upgrade when you need more. Every paid plan includes all
            features — no expensive add-ons, no hidden fees.
          </p>
        </div>

        {/* ── Billing toggle ──────────────────────────────────────────────── */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/40">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                billing === 'monthly'
                  ? 'bg-background text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                billing === 'annual'
                  ? 'bg-background text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* ── Plans grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col h-full rounded-2xl p-5 space-y-5 border transition-all duration-200 ${
                plan.highlight
                  ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10 ring-1 ring-primary/30'
                  : 'border-border/60 bg-card hover:shadow-lg hover:border-border'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                      plan.badgeStyle === 'primary'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30'
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Name + price */}
              <div className="space-y-1.5 pt-1">
                <p className={`font-bold text-[15px] ${plan.highlight ? 'text-primary' : ''}`}>
                  {plan.name}
                </p>
                <div>
                  <div className="flex items-end gap-0.5">
                    <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                      {plan.monthly === 0 ? '₹0' : fmt(displayPrice(plan))}
                    </span>
                    {plan.monthly > 0 && (
                      <span className="text-xs text-muted-foreground mb-1.5 ml-0.5">/mo</span>
                    )}
                  </div>

                  {plan.monthly === 0 ? (
                    <p className="text-[11px] text-muted-foreground">free forever</p>
                  ) : billing === 'annual' ? (
                    <p className="text-[11px] text-muted-foreground">
                      {fmt(plan.annual)}/yr ·{' '}
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        save {fmt(saving(plan))}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">billed monthly</p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{plan.tagline}</p>
              </div>

              {/* CTA */}
              <Link
                href={plan.href}
                className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-xl px-4 text-[13px] font-semibold transition-all duration-150 active:scale-95 ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                    : 'border border-border bg-background hover:border-primary/40 hover:text-primary'
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              {/* Divider */}
              <div className={`h-px ${plan.highlight ? 'bg-primary/20' : 'bg-border/60'}`} />

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                        plan.highlight ? 'text-primary' : 'text-green-500'
                      }`}
                    />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Overage add-ons ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-muted/30 px-6 py-5 max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-center mb-3">Need a little more on any plan?</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground">
            <span>
              <span className="text-foreground font-semibold">₹99</span> · +500 photos on an event
            </span>
            <span className="hidden sm:block text-border">·</span>
            <span>
              <span className="text-foreground font-semibold">₹199/mo</span> · extra member seat (Pro only)
            </span>
          </div>
        </div>

        {/* ── Policy notes ────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto space-y-3">
          <h3 className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-widest">
            Billing & data policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Missed payment */}
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </span>
                <p className="text-[13px] font-semibold text-foreground">Missed payment</p>
              </div>
              <ol className="space-y-1.5 pl-1">
                {[
                  { icon: RefreshCcw, text: '3-day grace period to complete payment — everything stays active.' },
                  { icon: XCircle,    text: 'After 3 days, all event access is suspended for all members.' },
                  { icon: Trash2,     text: 'Events are permanently deleted once the plan\'s retention period expires — no recovery.' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
                    <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500/70" />
                    {text}
                  </li>
                ))}
              </ol>
            </div>

            {/* Intentional cancellation */}
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted shrink-0">
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <p className="text-[13px] font-semibold text-foreground">Cancelled plan</p>
              </div>
              <ol className="space-y-1.5 pl-1">
                {[
                  { icon: Check,   text: 'Access continues until the end of your current paid billing period.' },
                  { icon: RefreshCcw, text: '3-day grace period after billing ends — resubscribe to keep access.' },
                  { icon: XCircle, text: 'After 3 days, all event access is suspended for all members.' },
                  { icon: Trash2,  text: 'Events are permanently deleted once the plan\'s retention period expires — no recovery.' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
                    <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
                    {text}
                  </li>
                ))}
              </ol>
            </div>

          </div>

          {/* Delete types */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
              <Trash2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground/80">Soft delete:</span>{' '}
                Suspends all member access. Data retained for 30 days — resubscribe to restore. After 30 days, permanently purged.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <Trash2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-destructive">Hard delete:</span>{' '}
                Immediately wipes all photos, videos, and data from our servers. Cannot be undone — no backup retained.
              </p>
            </div>
          </div>

          {/* Downgrade policy */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <RefreshCcw className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/80">Plan downgrade:</span>{' '}
              Existing data is always preserved. Events and photos over your new plan&apos;s limits become read-only — no new uploads until within limits. Original retention dates are not reset.
            </p>
          </div>
        </div>

        {/* ── Comparison table ────────────────────────────────────────────── */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-center tracking-tight">Compare all plans</h2>
          <div className="overflow-x-auto rounded-2xl border border-border/60 shadow-sm">
            <table className="w-full text-[12.5px] min-w-[680px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50">
                  <th className="text-left px-5 py-4 font-semibold text-muted-foreground w-48">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className={`text-center px-3 py-4 font-bold text-[13px] ${
                        p.highlight ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {COMPARE.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`transition-colors hover:bg-muted/30 ${
                      i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    }`}
                  >
                    <td className="px-5 py-3.5 text-muted-foreground font-medium">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="text-center px-3 py-3.5">
                        {val === true ? (
                          <Check className="h-4 w-4 text-green-500 mx-auto" />
                        ) : val === false ? (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                        ) : (
                          <span
                            className={`${
                              PLANS[vi].highlight
                                ? 'text-primary font-semibold'
                                : 'text-foreground/80'
                            }`}
                          >
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ nudge ───────────────────────────────────────────────────── */}
        <p className="text-center text-[13px] text-muted-foreground">
          Have questions?{' '}
          <Link
            href="/faqs"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Read the FAQs
          </Link>
          {' '}or{' '}
          <Link
            href="/contact"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            contact us
          </Link>
          .
        </p>

      </div>
    </div>
  );
}
