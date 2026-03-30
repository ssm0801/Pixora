'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, ImageIcon, Plus, ArrowRight, Lock, Share2, Download, Zap, QrCode, Camera, PartyPopper, Briefcase, Heart, Star, Quote } from 'lucide-react';
import Footer from '@/components/Footer';

// ── Landing page (logged-out) ────────────────────────────────────────────────
function LandingPage() {
  const features = [
    {
      icon: <Lock className="h-5 w-5" />,
      title: 'Private by default',
      desc: 'Only invited members can see your event photos. No public links, no surprises.',
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      title: 'Easy invite',
      desc: 'Add guests by email in seconds. They get instant access to the album.',
    },
    {
      icon: <Download className="h-5 w-5" />,
      title: 'Bulk download',
      desc: 'Multi-select and download all your favourites at once with original filenames.',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Fast & organised',
      desc: 'Per-event photo collections keep everything tidy, no matter how many events.',
    },
  ];

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[420px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute left-1/3 top-1/3 w-[300px] h-[300px] rounded-full bg-[oklch(0.60_0.28_295)]/8 blur-[80px]" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-primary text-[12px] font-medium mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Private event photo sharing
        </div>

        <h1
          className="text-[4rem] sm:text-[5.5rem] font-bold leading-none tracking-tight mb-5 bg-gradient-to-br from-primary via-primary/80 to-[oklch(0.60_0.28_295)] bg-clip-text text-transparent"
          style={{ fontFamily: 'var(--font-pixelify)' }}
        >
          Pixora
        </h1>

        <p className="text-[1.1rem] text-muted-foreground max-w-[30rem] leading-relaxed mb-10">
          Create private photo albums for your events. Invite guests, upload memories, and share them — only with the people who were there.
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            href="/register"
            className={cn(buttonVariants({ size: 'lg' }), 'text-[14px] px-7 gap-2')}
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-[14px] px-7')}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-screen-lg mx-auto w-full px-6 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {f.icon}
              </div>
              <div>
                <p className="font-semibold text-[14px]">{f.title}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-screen-lg mx-auto w-full px-6 pb-28">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-2">Simple as 1-2-3</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How Pixora works</h2>
          <p className="text-muted-foreground mt-3 text-[15px] max-w-md mx-auto">
            From event creation to sharing memories — in under a minute.
          </p>
        </div>
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden sm:block absolute top-9 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-border" />
          {[
            { step: '01', icon: <Calendar className="h-5 w-5" />, title: 'Create an event', desc: 'Set up a private album for your wedding, birthday, trip, or any occasion in seconds.' },
            { step: '02', icon: <Users className="h-5 w-5" />, title: 'Invite your guests', desc: 'Share an invite link or QR code. Guests join and can upload their own shots instantly.' },
            { step: '03', icon: <Download className="h-5 w-5" />, title: 'Relive & download', desc: 'Browse everyone\'s photos in one place. Favourite and bulk-download in original quality.' },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center text-center gap-3 relative">
              <div className="h-[4.5rem] w-[4.5rem] rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative z-10 bg-background">
                {s.icon}
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-primary bg-background border border-primary/30 rounded-full h-5 w-5 flex items-center justify-center leading-none">{s.step}</span>
              </div>
              <p className="font-semibold text-[15px]">{s.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[16rem]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases — bento grid */}
      <section className="w-full border-y border-border/60 bg-muted/30 py-20 mb-28">
        <div className="max-w-screen-lg mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-2">Built for every occasion</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Perfect for any event</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 auto-rows-[10rem]">

            {/* Weddings — large, spans 2 rows */}
            <div className="row-span-2 bg-card border border-border/60 rounded-2xl p-6 flex flex-col justify-between hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 group overflow-hidden relative">
              <div className="absolute -bottom-6 -right-6 text-[7rem] opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">💍</div>
              <Heart className="h-7 w-7 text-primary" />
              <div>
                <p className="font-bold text-[18px] mb-1">Weddings</p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  Collect photos from every guest and photographer into one beautiful private album. No WhatsApp groups, no compression.
                </p>
              </div>
            </div>

            {/* Birthdays */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group overflow-hidden relative">
              <div className="absolute -bottom-4 -right-4 text-[5rem] opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">🎉</div>
              <PartyPopper className="h-5 w-5 text-primary" />
              <p className="font-semibold text-[14px]">Birthdays</p>
            </div>

            {/* Corporate */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group overflow-hidden relative">
              <div className="absolute -bottom-4 -right-4 text-[5rem] opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">💼</div>
              <Briefcase className="h-5 w-5 text-primary" />
              <p className="font-semibold text-[14px]">Corporate events</p>
            </div>

            {/* Trips — spans 2 cols */}
            <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group overflow-hidden relative">
              <div className="absolute -bottom-4 -right-4 text-[5rem] opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">✈️</div>
              <Camera className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-[14px] mb-1">Trips & more</p>
                <p className="text-[12px] text-muted-foreground">Any gathering deserves a shared album.</p>
              </div>
            </div>

          </div>

          {/* Inline descriptors row */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Birthdays', desc: 'Let everyone contribute candid moments to a single private gallery. No more scattered camera rolls.' },
              { label: 'Corporate events', desc: 'Conferences, offsites, and company milestones — organised, access-controlled, and shareable.' },
              { label: 'Trips & more', desc: 'Road trips, family reunions, sports days — preserve every memory, together.' },
            ].map((d) => (
              <div key={d.label} className="flex gap-3 items-start">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <p className="text-[12.5px] text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground">{d.label} — </span>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-screen-lg mx-auto w-full px-6 pb-28">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '10K+', label: 'Events created' },
            { value: '500K+', label: 'Photos shared' },
            { value: '50K+', label: 'Happy users' },
            { value: '100%', label: 'Private by default' },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <p className="text-4xl font-bold bg-gradient-to-br from-primary to-[oklch(0.60_0.28_295)] bg-clip-text text-transparent tabular-nums">{stat.value}</p>
              <p className="text-[13px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full border-t border-border/60 bg-muted/30 py-20 mb-28">
        <div className="max-w-screen-lg mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-2">Loved by users</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">What people are saying</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { name: 'Priya S.', role: 'Wedding planner', quote: 'Pixora made collecting photos from 200+ guests effortless. One link, one album, zero chaos.' },
              { name: 'Rahul M.', role: 'Corporate event organiser', quote: 'We used it for our annual offsite. The folder system kept department photos perfectly organised.' },
              { name: 'Anika T.', role: 'Photography enthusiast', quote: 'Finally a tool where I can share full-quality photos privately. No compression, no ads.' },
            ].map((t) => (
              <div key={t.name} className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 hover:border-primary/30 transition-all">
                <Quote className="h-5 w-5 text-primary/40" />
                <p className="text-[13.5px] text-muted-foreground leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[12px] font-bold shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-screen-lg mx-auto w-full px-6 pb-28">
        <div className="relative rounded-3xl border border-primary/20 bg-card overflow-hidden text-center px-8 py-16">
          <div className="pointer-events-none absolute inset-0 -z-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-primary/8 blur-[80px]" />
          </div>
          <div className="relative z-10 space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Get started today</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Your memories deserve a better home</h2>
            <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
              Free to use. No credit card required. Create your first event in 30 seconds.
            </p>
            <div className="flex items-center gap-3 justify-center flex-wrap pt-2">
              <Link
                href="/register"
                className={cn(buttonVariants({ size: 'lg' }), 'text-[14px] px-8 gap-2')}
              >
                Create a free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/join"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-[14px] px-8')}
              >
                Join an event
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ── Root page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return <LandingPage />;
}

