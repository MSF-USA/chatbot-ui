import React, { FC, ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { checkUserTermsAcceptance } from '@/utils/app/termsAcceptance';
import TermsAcceptanceModal from './TermsAcceptanceModal';
import {isUSBased} from "@/utils/app/userAuth";

interface TermsAcceptanceProviderProps {
  children: ReactNode;
}

export const TermsAcceptanceProvider: FC<TermsAcceptanceProviderProps> = ({
  children
}) => {
  const { data: session, status } = useSession();
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [checkingTerms, setCheckingTerms] = useState<boolean>(true);

  // Check if user has accepted terms whenever session changes
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      if (status === 'loading') return;

      if (
          status === 'authenticated' && session?.user && !isUSBased(session?.user?.mail ?? '')
      ) {
        setCheckingTerms(true);
        try {
          const hasAcceptedTerms = await checkUserTermsAcceptance(session.user);
          setShowTermsModal(!hasAcceptedTerms);
        } catch (error) {
          console.error('Error checking terms acceptance:', error);
          // Default to showing the modal if there's an error
          setShowTermsModal(true);
        } finally {
          setCheckingTerms(false);
        }
      } else {
        // User is not authenticated, no need to show terms
        setShowTermsModal(false);
        setCheckingTerms(false);
      }
    };

    checkTermsAcceptance();
  }, [session, status]);

  // Handle terms acceptance
  const handleTermsAccepted = () => {
    setShowTermsModal(false);
  };

  // If checking terms or not authenticated yet, render children
  if (checkingTerms || status !== 'authenticated') {
    return <>{children}</>;
  }

  // If terms need to be accepted, show the modal
  if (showTermsModal && session?.user) {
    return (
      <>
        {children}
        <TermsAcceptanceModal
          user={session.user}
          onAcceptance={handleTermsAccepted}
        />
      </>
    );
  }

  // Terms are accepted, render children
  return <>{children}</>;
};

export default TermsAcceptanceProvider;
