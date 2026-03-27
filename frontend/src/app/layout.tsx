import type { Metadata } from "next";
import { Geist_Mono, Pixelify_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import FooterWrapper from "@/components/FooterWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixora.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Pixora — Private Event Photo Sharing",
    template: "%s | Pixora",
  },
  description:
    "Create private photo albums for your events. Invite guests, upload memories, and share them only with the people who were there.",
  keywords: [
    "event photos",
    "private photo sharing",
    "photo album",
    "event photography",
    "photo management",
    "guest photo sharing",
    "wedding photos",
    "private gallery",
  ],
  authors: [{ name: "Pixora" }],
  creator: "Pixora",
  publisher: "Pixora",
  category: "Technology",

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    siteName: "Pixora",
    url: BASE_URL,
    title: "Pixora — Private Event Photo Sharing",
    description:
      "Create private photo albums for your events. Invite guests, upload memories, and share them only with the people who were there.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pixora — Private Event Photo Sharing",
        type: "image/png",
      },
    ],
    locale: "en_US",
  },

  // ── Twitter / X ───────────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Pixora — Private Event Photo Sharing",
    description:
      "Create private photo albums for your events. Invite guests, upload memories, and share them only with the people who were there.",
    images: ["/og-image.png"],
  },

  // ── Robots ────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // ── Icons ─────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },

  // ── PWA manifest ─────────────────────────────────────────────────────────
  manifest: "/manifest.json",

  // ── Theme colour ──────────────────────────────────────────────────────────
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#00D4FF" },
    { media: "(prefers-color-scheme: light)", color: "#00D4FF" },
  ],

  // ── Canonical ─────────────────────────────────────────────────────────────
  alternates: {
    canonical: BASE_URL,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Pixora',
  applicationCategory: 'PhotosApp',
  operatingSystem: 'Web',
  url: BASE_URL,
  description: 'Create private photo albums for your events. Invite guests, upload memories, and share them only with the people who were there.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistMono.variable} ${pixelifySans.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <FooterWrapper />
          {/* Toaster — bottom-right, per user request */}
          <Toaster
            richColors
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
                fontSize: "13.5px",
              },
            }}
          />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
