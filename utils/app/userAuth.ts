const isUSBased = (email: string): boolean => {
  return email?.toLowerCase().indexOf('newyork') >= 0;
}

export const userAuthorizedForFileUploads = (user: {mail: string}): boolean => {
  return isUSBased(user?.mail ?? '');
}
