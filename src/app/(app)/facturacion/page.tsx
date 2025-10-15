
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, Settings, ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function FacturacionPageComponent() {
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Módulo de Facturación</h1>
        <p className="text-primary-foreground/80 mt-1">Gestiona tus facturas (CFDI) y configura tu portal de auto-facturación.</p>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sitio en Fase de Pruebas</AlertTitle>
        <AlertDescription>
          El módulo de facturación se encuentra en fase de desarrollo. La funcionalidad podría no operar como se espera.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Portal de Auto-Facturación para Clientes</CardTitle>
            <CardDescription>
              Permite que tus clientes generen sus propias facturas de forma rápida y sencilla.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="p-6 bg-muted/50 rounded-lg">
              <FileJson className="h-16 w-16 text-primary mx-auto" />
            </div>
            <p className="max-w-prose text-muted-foreground">
              Hemos preparado un portal público donde tus clientes pueden ingresar el folio de su ticket (de servicio o venta) y el monto total para generar su factura CFDI 4.0 al instante.
            </p>
            <Button asChild size="lg">
              <Link href="/facturar" target="_blank">
                Ir al Portal de Facturación <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración Fiscal</CardTitle>
            <CardDescription>
              Configura tus datos fiscales y tu proveedor de timbrado (PAC).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Para poder emitir facturas, primero debes ingresar la información fiscal de tu taller y las credenciales (API Key) de tu proveedor de facturación.
            </p>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/opciones?tab=taller">
                    <Settings className="mr-2 h-4 w-4" />
                    Ir a Configuración
                </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Facturas</CardTitle>
            <CardDescription>
              Consulta todas las facturas emitidas y su estado ante el SAT.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-4">
              Aquí podrás ver, descargar (PDF/XML) o cancelar las facturas que se han generado a través del sistema.
            </p>
            <Button className="w-full" disabled>
                Próximamente
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function FacturacionPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <FacturacionPageComponent />
    </Suspense>
  );
}
