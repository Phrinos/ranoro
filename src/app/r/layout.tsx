
// This is a minimal layout for the public owner report view page.
// It doesn't include the main app sidebar or header.
export default function ReportViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 min-h-screen">
        <main className="p-2 sm:p-4 md:py-8">
            {children}
        </main>
    </div>
  );
}
