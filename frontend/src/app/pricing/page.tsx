import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for photographers and studios. Start free — upgrade when you need more. No hidden fees.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | Pixora',
    description: 'Simple, transparent pricing for photographers and studios. Start free — upgrade when you need more. No hidden fees.',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
