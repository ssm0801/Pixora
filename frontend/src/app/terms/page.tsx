import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

const EFFECTIVE = 'January 1, 2025';

export default function TermsPage() {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-20 space-y-10">

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight">Terms & conditions</h1>
        <p className="text-[13px] text-muted-foreground">Effective date: {EFFECTIVE}</p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-[14px] text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-[16px] [&_h2]:mt-8 [&_h2]:mb-2">

        <p>By using Pixora you agree to these terms. Please read them carefully.</p>

        <h2>1. Use of the service</h2>
        <p>You must be at least 13 years old to use Pixora. You agree to provide accurate information when creating an account and to keep your credentials secure.</p>
        <p>You may not use Pixora for any illegal purpose, to upload content that infringes third-party rights, or to harass other users.</p>

        <h2>2. Your content</h2>
        <p>You retain all rights to the photos and content you upload. By uploading, you grant Pixora a limited licence to store and display your content solely for the purpose of operating the service.</p>
        <p>You are responsible for ensuring you have the rights to upload any content you add to Pixora.</p>

        <h2>3. Account deletion</h2>
        <p>You may delete your account at any time from your profile settings. Upon deletion, your personal data is cleared, your email and phone number are permanently reserved as inactive, and all events you administer are deleted. This action cannot be undone.</p>

        <h2>4. Subscriptions and billing</h2>
        <p>Paid plans are billed monthly or annually as selected. You may cancel at any time; your access continues until the end of the current billing period. We do not offer prorated refunds for partial periods except as described in our Refund Policy.</p>

        <h2>5. Availability</h2>
        <p>We strive for high availability but do not guarantee uninterrupted service. We may perform maintenance or updates at any time.</p>

        <h2>6. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, Pixora's liability for any claim arising from these terms is limited to the amount you paid us in the three months preceding the claim.</p>

        <h2>7. Changes to terms</h2>
        <p>We may update these terms. Continued use of Pixora after changes take effect constitutes acceptance of the new terms.</p>

        <h2>8. Governing law</h2>
        <p>These terms are governed by the laws of India. Any disputes shall be resolved in the courts of Mumbai, Maharashtra.</p>

        <h2>9. Contact</h2>
        <p>Questions? Email <a href="mailto:legal@pixora.app" className="text-primary hover:underline">legal@pixora.app</a>.</p>

      </div>
    </div>
  );
}
