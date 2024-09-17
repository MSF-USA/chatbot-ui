import {Session} from "next-auth";

const isUSBased = (email: string): boolean => {
  // return email?.toLowerCase().indexOf('newyork') >= 0;
  return email?.toLowerCase().indexOf('msf.org') >= 0; //temporary value for testing in dev
}

export const userAuthorizedForFileUploads = (user: Session["user"] | undefined): boolean => {
  return isUSBased(user?.mail ?? '');
}
