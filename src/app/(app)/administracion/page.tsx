
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { AuditLog } from "@/types";
import { parseDate } from "@/lib/forms";
import { AdministracionTabs } from "./components/administracion-tabs";

type PageProps = { searchParams?: { tab?: string } };

async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const db = getAdminDb();
    const q = query(collection(db, 'auditLogs'), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const date = parseDate(data.date);
        return {
            id: doc.id,
            ...data,
            date: date ? date.toISOString() : new Date().toISOString(),
        } as AuditLog;
    });
  } catch (error) {
    console.error("Error fetching audit logs on server:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

export default async function AdministracionPage({ searchParams }: PageProps) {
  const initialLogs = await getAuditLogs();
  const defaultTab = searchParams?.tab === "migracion" ? "migracion" : "auditoria";

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Administración del Sistema</h1>
        <p className="text-primary-foreground/80 mt-1">
          Gestiona usuarios, roles y realiza migraciones de datos.
        </p>
      </div>

      {/* Boundary requerido si cualquier hijo usa useSearchParams */}
      <Suspense
        fallback={
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <AdministracionTabs initialLogs={initialLogs} defaultTab={defaultTab} />
      </Suspense>
    </>
  );
}
