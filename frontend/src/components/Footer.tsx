import Link from 'next/link';
import { Camera } from 'lucide-react';

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function IconLinkedin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const links = {
  Product: [
    { label: 'Pricing', href: '/pricing' },
    { label: 'FAQs', href: '/faqs' },
  ],
  Company: [
    { label: 'About us', href: '/about' },
    { label: 'Contact us', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy policy', href: '/privacy-policy' },
    { label: 'Terms & conditions', href: '/terms' },
    { label: 'Refund policy', href: '/refunds' },
  ],
};

const socials = [
  { label: 'Instagram', href: 'https://instagram.com', Icon: IconInstagram },
  { label: 'LinkedIn',  href: 'https://linkedin.com',  Icon: IconLinkedin  },
  { label: 'YouTube',   href: 'https://youtube.com',   Icon: IconYoutube   },
  { label: 'Facebook',  href: 'https://facebook.com',  Icon: IconFacebook  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto">
      <div className="max-w-screen-lg mx-auto px-6 pt-14 pb-8">

        {/* Top row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2 space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bold text-[15px] tracking-tight text-foreground hover:text-primary transition-colors"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 text-primary">
                <Camera className="h-3.5 w-3.5" />
              </div>
              <span
                className="bg-gradient-to-r from-primary to-[oklch(0.60_0.28_295)] bg-clip-text text-transparent text-[1.15rem]"
                style={{ fontFamily: 'var(--font-pixelify)' }}
              >
                Pixora
              </span>
            </Link>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
              Private event photo sharing — built for the moments that matter.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-1 pt-1">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group} className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group}
              </p>
              <ul className="space-y-2">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground/60">
            © {new Date().getFullYear()} Pixora. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
