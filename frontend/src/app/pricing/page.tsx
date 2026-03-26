import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Pricing' };

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'Perfect for trying out Pixora.',
    highlight: false,
    cta: 'Get started',
    href: '/register',
    features: [
      'Up to 3 events',
      '50 photos per event',
      'Invite up to 10 guests',
      'Join via QR code',
      'Bulk download',
    ],
  },
  {
    name: 'Pro',
    price: '₹299',
    period: 'per month',
    desc: 'For frequent hosts and growing teams.',
    highlight: true,
    cta: 'Start free trial',
    href: '/register',
    features: [
      'Unlimited events',
      '1,000 photos per event',
      'Unlimited guests',
      'Custom event branding',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    name: 'Business',
    price: '₹999',
    period: 'per month',
    desc: 'For agencies, venues, and large teams.',
    highlight: false,
    cta: 'Contact sales',
    href: '/contact',
    features: [
      'Everything in Pro',
      'Unlimited photo storage',
      'White-label option',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-20 space-y-14">

      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</p>
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-muted-foreground text-[15px] max-w-md mx-auto leading-relaxed">
          Start free. Upgrade when you need more. No hidden fees, no surprises.
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-7 space-y-6 flex flex-col ${
              plan.highlight
                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                : 'border-border/60 bg-card'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most popular
                </span>
              </div>
            )}

            <div className="space-y-1">
              <p className="font-semibold text-[15px]">{plan.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-[13px] text-muted-foreground mb-1">/{plan.period}</span>
              </div>
              <p className="text-[13px] text-muted-foreground">{plan.desc}</p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px]">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-lg px-4 text-[13.5px] font-medium transition-opacity hover:opacity-90 ${
                plan.highlight
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/60 bg-background hover:border-primary/40'
              }`}
            >
              {plan.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ nudge */}
      <p className="text-center text-[13px] text-muted-foreground">
        Have questions?{' '}
        <Link href="/faqs" className="text-primary font-medium hover:underline underline-offset-4">
          Read the FAQs
        </Link>
        {' '}or{' '}
        <Link href="/contact" className="text-primary font-medium hover:underline underline-offset-4">
          contact us
        </Link>.
      </p>

    </div>
  );
}
