import { Camera, Users, Heart, Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Pixora — private event photo sharing built for photographers, couples, and families who value privacy and simplicity.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Us | Pixora',
    description: 'Learn about Pixora — private event photo sharing built for photographers, couples, and families who value privacy and simplicity.',
  },
};

const values = [
  { icon: Heart,   title: 'Privacy first',    desc: 'Your memories belong to you. We never sell data or show ads.' },
  { icon: Users,   title: 'Built for people', desc: 'Designed around real events — weddings, trips, parties, reunions.' },
  { icon: Zap,     title: 'Simple by design', desc: 'No learning curve. Upload, share, download — that\'s it.' },
  { icon: Camera,  title: 'Photo-obsessed',   desc: 'Every decision we make puts photo quality and organisation first.' },
];

export default function AboutPage() {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-20 space-y-16">

      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">About us</p>
        <h1 className="text-4xl font-bold tracking-tight">We believe every event deserves its own album</h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg mx-auto">
          Pixora was built out of frustration with scattered group chats full of blurry photos. We wanted one private, beautiful place for every event's memories.
        </p>
      </div>

      {/* Story */}
      <div className="bg-card border border-border/60 rounded-2xl p-8 space-y-4">
        <h2 className="text-xl font-semibold">Our story</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          It started at a wedding. Photos were spread across WhatsApp threads, iCloud shared albums, and random AirDrop sessions. Half the guests never got the good shots. We knew there had to be a better way.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Pixora gives every event its own private gallery. The admin creates the album, invites guests, and everyone contributes and downloads freely — no apps to install, no accounts to force on your guests.
        </p>
      </div>

      {/* Values */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">What we stand for</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-[14px]">{title}</p>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
