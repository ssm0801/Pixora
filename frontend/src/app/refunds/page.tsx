import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Refund Policy' };

const EFFECTIVE = 'January 1, 2025';

export default function RefundsPage() {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-20 space-y-10">

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight">Refund policy</h1>
        <p className="text-[13px] text-muted-foreground">Effective date: {EFFECTIVE}</p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-[14px] text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-[16px] [&_h2]:mt-8 [&_h2]:mb-2">

        <p>We want you to be satisfied with Pixora. Here's how refunds work.</p>

        <h2>1. Free plan</h2>
        <p>The free plan has no charges, so no refunds are applicable.</p>

        <h2>2. Paid plans — 7-day money-back guarantee</h2>
        <p>If you upgrade to a paid plan and are not satisfied, you may request a full refund within <strong className="text-foreground">7 days</strong> of your first payment. To request a refund, email <a href="mailto:billing@pixora.app" className="text-primary hover:underline">billing@pixora.app</a> with the subject "Refund request" and your registered email address.</p>

        <h2>3. Renewals</h2>
        <p>We do not issue refunds for renewal charges once processed. If you wish to cancel, please do so before your renewal date from your account settings. You will retain access until the end of the paid period.</p>

        <h2>4. Exceptional circumstances</h2>
        <p>If you experience a technical issue that prevented you from using Pixora during your paid period, contact us and we'll review your case individually. We may offer a partial credit or extension at our discretion.</p>

        <h2>5. How refunds are issued</h2>
        <p>Approved refunds are credited to the original payment method within 5–10 business days, depending on your bank or card issuer.</p>

        <h2>6. Contact</h2>
        <p>For any billing questions, email <a href="mailto:billing@pixora.app" className="text-primary hover:underline">billing@pixora.app</a> or visit our <Link href="/contact" className="text-primary hover:underline">contact page</Link>.</p>

      </div>
    </div>
  );
}
