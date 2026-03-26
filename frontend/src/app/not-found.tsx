'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 text-center overflow-hidden select-none">

      {/* Animated 404 number */}
      <div
        className={`relative mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        {/* Glowing background blob */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-48 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        </div>

        {/* 404 text */}
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-[7rem] sm:text-[10rem] font-black leading-none text-foreground/10 select-none tabular-nums">
            4
          </span>
          {/* Animated camera shutter */}
          <div className="relative flex items-center justify-center h-24 w-24 sm:h-36 sm:w-36">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full animate-[spin_8s_linear_infinite]"
            >
              {/* Outer ring */}
              <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" />
              {/* Dashes */}
              {[...Array(8)].map((_, i) => (
                <line
                  key={i}
                  x1="50" y1="6" x2="50" y2="14"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${i * 45} 50 50)`}
                  opacity={0.3 + i * 0.09}
                />
              ))}
              {/* Aperture blades */}
              {[...Array(6)].map((_, i) => (
                <ellipse
                  key={i}
                  cx="50" cy="30"
                  rx="10" ry="22"
                  fill="hsl(var(--primary)/0.15)"
                  stroke="hsl(var(--primary)/0.4)"
                  strokeWidth="0.5"
                  transform={`rotate(${i * 60} 50 50)`}
                />
              ))}
              {/* Inner lens */}
              <circle cx="50" cy="50" r="14" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="7" fill="hsl(var(--primary)/0.3)" />
              <circle cx="53" cy="47" r="2.5" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span className="text-[7rem] sm:text-[10rem] font-black leading-none text-foreground/10 select-none tabular-nums">
            4
          </span>
        </div>
      </div>

      {/* Text */}
      <div
        className={`space-y-3 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Shot not found</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
          Looks like this moment doesn't exist — or it's been moved to a private album.
        </p>
      </div>

      {/* Actions */}
      <div
        className={`flex flex-col sm:flex-row items-center gap-3 mt-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Back to home
        </Link>
        <Link
          href="/join"
          className="inline-flex items-center gap-2 h-10 px-6 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          Join an event
        </Link>
      </div>

      {/* Subtle floating dots */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden>
        {[
          { size: 6, top: '15%', left: '10%', delay: '0s', dur: '4s' },
          { size: 4, top: '70%', left: '80%', delay: '1s', dur: '5s' },
          { size: 8, top: '40%', left: '88%', delay: '2s', dur: '6s' },
          { size: 5, top: '80%', left: '20%', delay: '0.5s', dur: '4.5s' },
          { size: 3, top: '25%', left: '70%', delay: '1.5s', dur: '5.5s' },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/20"
            style={{
              width: dot.size, height: dot.size,
              top: dot.top, left: dot.left,
              animationName: 'bounce',
              animationDuration: dot.dur,
              animationDelay: dot.delay,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
              animationDirection: 'alternate',
            }}
          />
        ))}
      </div>
    </div>
  );
}
