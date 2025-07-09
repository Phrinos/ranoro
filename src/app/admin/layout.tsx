// This layout is no longer needed as the admin pages have been moved to the /opciones route.
// It is being emptied to avoid confusion. It can be safely deleted.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
