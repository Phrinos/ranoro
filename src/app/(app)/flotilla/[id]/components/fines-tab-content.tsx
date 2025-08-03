

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert } from 'lucide-react';
import type { Vehicle } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface FinesTabContentProps {
  vehicle: Vehicle;
}

export function FinesTabContent({ vehicle }: FinesTabContentProps) {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Historial de Revisión de Multas</CardTitle>
            <CardDescription>Registro de cuándo se ha verificado este vehículo.</CardDescription>
        </CardHeader>
        <CardContent>
            {(vehicle.fineCheckHistory && vehicle.fineCheckHistory.length > 0) ? (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-black">
                            <TableRow>
                                <TableHead className="text-white">Fecha de Revisión</TableHead>
                                <TableHead className="text-white">Revisado por</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicle.fineCheckHistory.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map((check, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{format(parseISO(check.date), "dd MMMM yyyy, HH:mm 'hrs'", { locale: es })}</TableCell>
                                    <TableCell>{check.checkedBy}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <ShieldAlert className="h-12 w-12 mb-2" />
                    <h3 className="text-lg font-semibold text-foreground">Sin Registros de Revisión</h3>
                    <p className="text-sm">No se ha verificado el estado de multas para este vehículo.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
