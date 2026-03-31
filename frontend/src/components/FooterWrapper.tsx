'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

// Pages that are inside the app shell — no public footer
const HIDE_PREFIXES = [
  '/events',
  '/event/',
  '/profile',
  '/notifications',
  '/create-event',
  '/auth/',
  '/login',
  '/register',
];

export default function FooterWrapper() {
  const pathname = usePathname();
  const hide = HIDE_PREFIXES.some((p) => pathname.startsWith(p));
  if (hide) return null;
  return <Footer />;
}
