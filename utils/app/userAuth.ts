import { Session } from 'next-auth';

export const isUSBased = (email: string): boolean => {
  return email?.toLowerCase().indexOf('newyork') >= 0;
};

export const userAuthorizedForFileUploads = (
  user: Session['user'] | undefined,
): boolean => {
  return true; // isUSBased(user?.mail ?? '');
};
