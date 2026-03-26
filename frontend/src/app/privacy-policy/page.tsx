import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

const EFFECTIVE = 'January 1, 2025';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-20 space-y-10">

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight">Privacy policy</h1>
        <p className="text-[13px] text-muted-foreground">Effective date: {EFFECTIVE}</p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-[14px] text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-[16px] [&_h2]:mt-8 [&_h2]:mb-2">

        <p>Pixora ("we", "us", "our") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</p>

        <h2>1. Data we collect</h2>
        <p>We collect information you provide directly: your name, email address, and optionally a phone number when you create an account. If you sign in with Google, we receive your name, email, and profile picture from Google.</p>
        <p>We also collect usage data automatically, including IP addresses, browser type, and pages visited, to improve our service.</p>

        <h2>2. How we use your data</h2>
        <p>We use your data solely to operate Pixora — authenticate your account, send notifications, and display your name in event contexts. We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>

        <h2>3. Photos and content</h2>
        <p>Photos you upload are stored securely on Cloudinary's CDN and are accessible only to members of the event they belong to. We do not use your photos for any purpose other than displaying them within Pixora.</p>

        <h2>4. Cookies</h2>
        <p>We use strictly necessary cookies to keep you signed in. We do not use advertising or tracking cookies.</p>

        <h2>5. Data retention</h2>
        <p>We retain your data as long as your account is active. When you delete your account, your personal information is removed. Your email and phone number are retained as inactive tombstones to prevent re-registration, in accordance with our terms.</p>

        <h2>6. Your rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:privacy@pixora.app" className="text-primary hover:underline">privacy@pixora.app</a>.</p>

        <h2>7. Security</h2>
        <p>All data is transmitted over HTTPS. Passwords are hashed using bcrypt. We follow industry-standard security practices to protect your information.</p>

        <h2>8. Changes to this policy</h2>
        <p>We may update this policy from time to time. We'll notify you by email or an in-app notice of any material changes.</p>

        <h2>9. Contact</h2>
        <p>Questions about this policy? Email us at <a href="mailto:privacy@pixora.app" className="text-primary hover:underline">privacy@pixora.app</a>.</p>

      </div>
    </div>
  );
}
