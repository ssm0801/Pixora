'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    q: 'Is Pixora free to use?',
    a: 'Yes! You can create up to 3 events with 50 photos each on the free plan — no credit card required. Upgrade to Pro or Business for more capacity.',
  },
  {
    q: 'Do my guests need to create an account?',
    a: 'Guests who are invited by email need to create a Pixora account to access the album. However, anyone with the event\'s join code or QR can request access without an account.',
  },
  {
    q: 'Who can see my photos?',
    a: 'Only the event admin and approved members can view photos. Albums are completely private — there are no public links.',
  },
  {
    q: 'How do I invite people to my event?',
    a: 'You can invite guests by their email address from the event page. They\'ll get a notification to accept. You can also share the event join code or QR code for quick access.',
  },
  {
    q: 'Can I download all photos at once?',
    a: 'Yes. Select multiple photos using the checkbox on hover, then use the bulk-download action in the toolbar. You can also download all photos in one go.',
  },
  {
    q: 'What image formats are supported?',
    a: 'Pixora accepts JPEG, PNG, WebP, HEIC, and GIF uploads. Files are stored at original resolution.',
  },
  {
    q: 'Can I remove a member from my event?',
    a: 'As the event admin, you can remove any member at any time from the Members panel inside the event. Removed members will receive a notification.',
  },
  {
    q: 'What happens when I delete my account?',
    a: 'Your account is deactivated and your email/phone are permanently reserved. All events you admin are deleted. Your email cannot be used to create a new account — contact support if you need help.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'You can cancel anytime from your account settings. Your plan stays active until the end of the current billing period.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit (HTTPS). Photos are stored on secure cloud storage. We never sell or share your personal data.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-[14px] font-medium">{q}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0">
          <p className="text-[13.5px] text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqsPage() {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-20 space-y-10">

      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQs</p>
        <h1 className="text-4xl font-bold tracking-tight">Frequently asked questions</h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md mx-auto">
          Can't find your answer? <Link href="/contact" className="text-primary font-medium hover:underline underline-offset-4">Contact us</Link> and we'll get back to you.
        </p>
      </div>

      {/* Accordion */}
      <div className="space-y-2.5">
        {faqs.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

    </div>
  );
}
