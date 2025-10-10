
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { AuditLog } from "@/types";
import { AdministracionTabs } from "./components/administracion-tabs";
import { getAdminDb } from '@/lib/firebaseAdmin';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';


async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    // Usamos el adminDB para asegurar que tenemos permisos
    const db = getAdminDb();
    const q = query(collection(db, 'auditLogs'), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    
    // Mapea y normaliza los Timestamps a strings ISO
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const dateValue = data.date;
        let isoDate;

        if (dateValue instanceof Timestamp) {
            isoDate = dateValue.toDate().toISOString();
        } else if (typeof dateValue === 'string') {
            isoDate = dateValue;
        } else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
            isoDate = new Date(dateValue.seconds * 1000).toISOString();
        } else {
            isoDate = new Date().toISOString(); // Fallback
        }
        
        return { id: doc.id, ...data, date: isoDate } as AuditLog;
    });
  } catch (error) {
    console.error("Error fetching audit logs on server:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

type PageProps = { searchParams?: { tab?: string } };


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
