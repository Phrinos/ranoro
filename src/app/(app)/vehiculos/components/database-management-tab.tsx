// src/app/(app)/vehiculos/components/database-management-tab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save } from 'lucide-react';
import vehicleDatabase from '@/lib/data/vehicle-database.json';

export function DatabaseManagementTab() {
  const [selectedMake, setSelectedMake] = useState<string>('');

  const makes = useMemo(() => vehicleDatabase.map(db => db.make).sort(), []);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Base de Datos de Vehículos</CardTitle>
                <CardDescription>
                    Añade o edita modelos, años y motores para las marcas existentes.
                    Los cambios se reflejarán en toda la aplicación.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Marca</label>
                        <Select value={selectedMake} onValueChange={setSelectedMake}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione una marca para editar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {makes.map(make => (
                                    <SelectItem key={make} value={make}>{make}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedMake && (
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-lg">Modelos de {selectedMake}</h3>
                        {/* Aquí irá la lógica para mostrar y editar modelos */}
                        <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                            <p>Próximamente: Editor de modelos y motores.</p>
                        </div>
                        <div className="flex justify-end">
                            <Button disabled>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir Modelo
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
        <div className="flex justify-end">
            <Button disabled>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios en la Base de Datos
            </Button>
        </div>
    </div>
  );
}
