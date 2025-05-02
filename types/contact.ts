const checkValidEmail = (email: string | undefined, defaultEmail: string = 'ai@newyork.msf.org'): string => {
    if (!email) return defaultEmail;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
        return email;
    } else {
        return defaultEmail;
    }
};

export const US_FEEDBACK_EMAIL: string = checkValidEmail(process.env.NEXT_PUBLIC_EMAIL, 'ai@newyork.msf.org');
export const FEEDBACK_EMAIL: string = checkValidEmail(process.env.NEXT_PUBLIC_FEEDBACK_EMAIL, 'aiteam@amsterdam.msf.org');
