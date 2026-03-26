import { Mail, MessageCircle, Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact Us' };

export default function ContactPage() {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-20 space-y-12">

      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact us</p>
        <h1 className="text-4xl font-bold tracking-tight">We'd love to hear from you</h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md mx-auto">
          Got a question, a problem, or just want to say hi? Reach out — we're a small team and we read every message.
        </p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Mail,           title: 'Email us',         desc: 'support@pixora.app',          sub: 'We reply within 24 hours'   },
          { icon: MessageCircle,  title: 'General enquiries', desc: 'hello@pixora.app',             sub: 'Partnerships & press'        },
          { icon: Clock,          title: 'Support hours',    desc: 'Mon – Fri, 9 am – 6 pm IST',  sub: 'Excluding public holidays'  },
        ].map(({ icon: Icon, title, desc, sub }) => (
          <div key={title} className="bg-card border border-border/60 rounded-2xl p-6 space-y-3 text-center hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-semibold text-[14px]">{title}</p>
              <p className="text-[13px] text-primary mt-1">{desc}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-card border border-border/60 rounded-2xl p-8 space-y-5">
        <h2 className="text-lg font-semibold">Send us a message</h2>
        <form className="space-y-4" action="mailto:support@pixora.app" method="get" encType="text/plain">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">First name</label>
              <input name="firstName" placeholder="Jane" required
                className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Last name</label>
              <input name="lastName" placeholder="Doe"
                className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Email address</label>
            <input type="email" name="email" placeholder="you@example.com" required
              className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Subject</label>
            <input name="subject" placeholder="How can we help?"
              className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Message</label>
            <textarea name="body" rows={5} placeholder="Tell us more…" required
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none" />
          </div>
          <button type="submit"
            className="h-9 px-6 rounded-lg bg-primary text-primary-foreground text-[13.5px] font-medium hover:opacity-90 transition-opacity">
            Send message
          </button>
        </form>
      </div>

    </div>
  );
}
