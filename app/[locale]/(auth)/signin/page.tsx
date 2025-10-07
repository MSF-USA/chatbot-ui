'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import logo from '@/public/logo_light.png';
import loginBackground from '@/public/loginBackground.jpg';
import microsoftLogo from '@/public/microsoft-logo.svg';

/**
 * Sign-in page for App Router
 */
export default function SignInPage() {
  const version = process.env.NEXT_PUBLIC_VERSION;
  const build = process.env.NEXT_PUBLIC_BUILD;
  const env = process.env.NEXT_PUBLIC_ENV;
  const email = process.env.NEXT_PUBLIC_EMAIL;

  return (
    <>
      <div className="h-screen overflow-hidden md:flex">
        <div className="md:h-screen w-screen bg-zinc-900">
          <div
            className="flex w-screen p-10"
            style={{
              backgroundImage: `url(${loginBackground.src})`,
              width: '100%',
              height: '100%',
              backgroundSize: 'cover',
            }}
          >
            <div>
              <Image
                src={logo}
                alt="MSF Logo"
              />
            </div>
            <h1 className="text-4xl font-thin text-white px-5 mt-3">
              MSF AI Assistant
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-center h-full md:w-3/4">
          <button
            className="flex flex-row items-center gap-3 mb-80 md:mb-0 sm:mb-40 bg-zinc-950 hover:bg-zinc-800 text-white py-4 px-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onClick={() => signIn('microsoft-entra-id', { callbackUrl: '/' })}
          >
            <Image src={microsoftLogo} alt="Microsoft" width={24} height={24} />
            <span>Sign in with Microsoft</span>
          </button>
        </div>
      </div>
      <div className="fixed bottom-0 right-0 w-full py-1">
        <div className="flex flex-col items-end px-1">
          <div className="hidden md:flex flex-shrink-0 flex-col items-end mb-2">
            <div className="ml-2 group relative flex flex-row text-white">
              How Do I Get Access?
              <span className="tooltip absolute bg-gray-700 text-white text-center py-2 px-3 w-[255px] rounded-lg text-sm bottom-full right-0 transform translate-x-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
                Currently MSF AI Assistant is only available to USA and
                Amsterdam HQ staff.
                <br />
                <br />
                We hope to expand soon!
              </span>
            </div>
          </div>
          <div className="text-gray-500">
            v{version}.{build}.{env}
          </div>
          <div className="text-gray-500">{email}</div>
        </div>
      </div>
    </>
  );
}
