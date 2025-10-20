'use client';

import { IconHelp, IconMail } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import Image from 'next/image';

import packageJson from '@/package.json';
import logo from '@/public/logo_light.png';
import microsoftLogo from '@/public/microsoft-logo.svg';

/**
 * Modern sign-in page with glassmorphism and micro-interactions
 */
export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showAccessInfo, setShowAccessInfo] = useState(false);

  const version = packageJson.version;
  const build = process.env.NEXT_PUBLIC_BUILD;
  const env = process.env.NEXT_PUBLIC_ENV;
  const email = process.env.NEXT_PUBLIC_EMAIL;

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn('microsoft-entra-id', { callbackUrl: '/' });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-black/40 z-[1]" />

      {/* Background SVG Map */}
      <div
        className="absolute left-1/2 -translate-x-1/2 md:-left-[10%] md:translate-x-0 top-1/2 -translate-y-1/2 w-[90%] md:w-[85%] h-[60%] md:h-[95%] bg-no-repeat opacity-40 md:opacity-60 z-0"
        style={{
          backgroundImage: `url(/msf-map-background.svg)`,
          backgroundPosition: 'center',
          backgroundSize: 'contain',
        }}
      >
        {/* Subtle vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-transparent to-zinc-950" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 pb-24 md:py-12 md:pr-[5%]">
        {/* Container for logo and card */}
        <div className="w-full max-w-md opacity-0 animate-fade-in-bottom md:ml-auto space-y-6 md:space-y-8">
          {/* Logo and Title - Outside glass card */}
          <div className="text-center">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
              <Image
                src={logo}
                alt="MSF Logo"
                className="h-10 md:h-12 w-auto opacity-95"
              />
              <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white/95">
                MSF AI Assistant
              </h1>
            </div>
          </div>

          {/* Glass Card - Fade in animation with delay */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-white/[0.03] backdrop-blur-3xl border border-white/[0.2] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col">
            {/* Multi-layer glass effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-tl from-zinc-800/10 to-transparent" />

            {/* Frosted glass edge highlight */}
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl border-t border-l border-white/[0.1]" />

            {/* Noise texture overlay for glass effect */}
            <div
              className="absolute inset-0 opacity-[0.02] mix-blend-soft-light pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
              }}
            />

            {/* Card Content */}
            <div className="relative px-6 py-8 md:px-12 md:py-12">
              {/* Welcome Section */}
              <div className="mb-6 md:mb-8 text-center">
                <div className="space-y-2 md:space-y-3">
                  <h2 className="text-2xl md:text-3xl font-medium text-white/95">
                    Welcome back
                  </h2>
                  <p className="text-gray-300/70 text-sm md:text-base font-light">
                    Sign in to continue
                  </p>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="group relative w-full flex items-center justify-center gap-2 md:gap-3 bg-white/90 hover:bg-white text-gray-900 font-medium py-3.5 md:py-4 px-4 md:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm md:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Image
                      src={microsoftLogo}
                      alt="Microsoft"
                      width={20}
                      height={20}
                      className="transition-transform group-hover:scale-110"
                    />
                    <span>Sign in with your msf.org account</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="my-6 md:my-8 flex items-center gap-3 md:gap-4">
                <div className="h-px flex-1 bg-white/[0.12]" />
                <span className="text-[10px] md:text-xs text-gray-400/70 uppercase tracking-widest font-light">
                  Secure SSO
                </span>
                <div className="h-px flex-1 bg-white/[0.12]" />
              </div>

              {/* Access Info Toggle */}
              <button
                onClick={() => setShowAccessInfo(!showAccessInfo)}
                className="w-full flex items-center justify-center gap-2 text-xs md:text-sm text-gray-300/80 hover:text-white/90 transition-colors duration-200 group"
              >
                <IconHelp className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                <span className="font-normal">How do I get access?</span>
              </button>

              {/* Access Info Panel - Animated */}
              {showAccessInfo && (
                <div className="mt-6 md:mt-8 rounded-xl bg-white/[0.06] border border-white/[0.08] p-4 md:p-6 animate-fade-in">
                  <p className="text-xs md:text-sm text-gray-300/90 leading-relaxed">
                    Currently MSF AI Assistant is only available to USA and
                    Amsterdam staff.
                  </p>
                  <p className="text-xs md:text-sm text-gray-400/80 mt-3 md:mt-4">
                    We hope to expand access soon!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Version Info and Contact */}
      <div className="absolute bottom-0 right-0 left-0 p-3 md:p-6 z-20">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Version info */}
          <span className="text-[10px] md:text-xs text-gray-400/70">
            v{version}.{build}.{env}
          </span>

          {/* Contact button */}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-[10px] md:text-xs text-gray-400 hover:text-gray-200 transition-all duration-200 group"
            >
              <IconMail className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>Contact</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
