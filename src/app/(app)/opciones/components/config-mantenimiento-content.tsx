"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { parseDate } from "@/lib/forms";

export function ConfigMantenimientoPageContent() {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const { toast } = useToast();

  const handleBackfill = async () => {
    setIsBackfilling(true);
    toast({ title: "Iniciando proceso...", description: "Buscando servicios para corregir. Esto puede tardar unos momentos." });

    const q = query(
      collection(db, "serviceRecords"),
      where("status", "==", "Entregado")
    );
    
    try {
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let updates = 0;

      snap.forEach((d) => {
        const s = d.data();
        if (!s.deliveryDateTime) {
          const candidate =
            parseDate(s.completedAt) ||
            parseDate(s.closedAt) ||
            (Array.isArray(s.payments) && s.payments.length ? parseDate(s.payments[0]?.date) : null) ||
            parseDate(s.serviceDate) ||
            new Date();

          batch.update(doc(db, "serviceRecords", d.id), {
            deliveryDateTime: candidate.toISOString(),
          });
          updates++;
        }
      });

      if (updates > 0) {
        await batch.commit();
        toast({ title: "¡Éxito!", description: `Se corrigieron ${updates} documentos. Los datos históricos ahora son consistentes.` });
      } else {
        toast({ title: "Todo en orden", description: "No se encontraron servicios que necesiten ser corregidos." });
      }
    } catch (error) {
      console.error("Error durante el backfill:", error);
      toast({ title: "Error en el proceso", description: "Ocurrió un error al corregir los datos. Revisa la consola para más detalles.", variant: "destructive" });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-sm border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Wrench className="h-5 w-5" /> Acciones de Mantenimiento
          </CardTitle>
          <CardDescription>
            Estas acciones son exclusivas para administradores del sistema y ayudan a mantener la consistencia interna de la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-md bg-card">
            <div className="flex-1 pr-4">
              <h3 className="font-semibold text-sm">Corregir Fechas de Entrega</h3>
              <p className="text-xs text-muted-foreground mt-1">Asigna una fecha de entrega a servicios pasados que están marcados como "Entregado" pero perdieron u omitieron su fecha de finalización, para que aparezcan correctamente en los historiales financieros.</p>
            </div>
            <Button onClick={handleBackfill} disabled={isBackfilling} variant="outline" className="mt-4 sm:mt-0 whitespace-nowrap min-w-[170px] border-destructive text-destructive hover:bg-destructive/10">
              {isBackfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
              {isBackfilling ? 'Corrigiendo...' : 'Ejecutar Corrección'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
