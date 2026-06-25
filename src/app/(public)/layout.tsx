// Metadata heredada del root layout (src/app/layout.tsx). No redeclarar aquí
// para no romper el OG unificado ni el merge de Open Graph del App Router.

export default function PublicPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sin <main> ni max-w aquí: cada página pública define su propio ancho/landmark.
  // La landing necesita full-bleed; /facturar y /s/[id] traen su propio contenedor.
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 relative selection:bg-red-500/20">
        {/* Subtle top decoration glow for Ranoro */}
        <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-slate-200/50 to-transparent pointer-events-none" />

        <div className="flex-1 relative z-10">
            {children}
        </div>
    </div>
  );
}
