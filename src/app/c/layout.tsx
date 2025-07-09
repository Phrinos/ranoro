
// This is a minimal layout for the public quote view page.
// It doesn't include the main app sidebar or header.
export default function QuoteViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 min-h-screen print:bg-transparent">
        <main className="p-2 sm:p-4 md:py-8 print:p-0">
            {children}
        </main>
    </div>
  );
}
