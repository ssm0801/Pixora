import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Answers to common questions about Pixora — plans, storage limits, guest access, downloads, and more.',
  alternates: { canonical: '/faqs' },
  openGraph: {
    title: 'FAQs | Pixora',
    description: 'Answers to common questions about Pixora — plans, storage limits, guest access, downloads, and more.',
  },
};

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
