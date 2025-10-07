/**
 * Layout for authentication pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-900">
      {children}
    </div>
  );
}
