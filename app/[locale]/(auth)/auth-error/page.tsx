'use client';

import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import logo from '@/public/logo_light.png';
import loginBackground from '@/public/loginBackground.jpg';

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
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
            <Image src={logo} alt="MSF Logo" />
          </div>
          <h1 className="text-4xl font-thin text-white px-5 mt-3">
            MSF AI Assistant
          </h1>
        </div>
      </div>

      <div className="flex items-center justify-center h-full md:w-3/4">
        <div className="flex flex-col items-center gap-4 mb-80 md:mb-0 sm:mb-40">
          <div className="text-red-500 text-xl font-semibold">
            Authentication Error
          </div>
          <div className="text-gray-700 text-center max-w-md">
            {errorMessage}
          </div>
          <Link
            href="/signin"
            className="bg-zinc-950 hover:bg-zinc-800 text-white py-4 px-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
