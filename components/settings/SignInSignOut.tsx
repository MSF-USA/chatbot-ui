import { IconLogin } from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

export const SignInSignOut = () => {
  const { data: session } = useSession();

  // If there's an error refreshing the token, sign out and redirect
  useEffect(() => {
    if (session?.error) {
      signOut();
    }
  }, [session?.error]);

  // Don't render anything until we have a session
  // This prevents flickering UI during the brief loading phase
  // In a protected app, we'll always have a session once loaded
  if (!session) {
    return null;
  }

  return (
    <button
      type="button"
      className="w-[120px] flex items-center justify-center px-4 py-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300 text-sm"
      onClick={() => signOut()}
    >
      <IconLogin size={18} className="mr-2" />
      Sign Out
    </button>
  );
};
