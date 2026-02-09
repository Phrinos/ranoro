
"use client";

import React, { useRef, useState } from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Eye, Upload, Trash2, Loader2, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { inventoryService } from '@/lib/services';
import { storage } from '@/lib/firebaseClient';
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { optimizeImage } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface VehicleDocumentsCardProps {
  vehicle: Vehicle;
}

// ✅ Documentos actualizados según solicitud
type VehicleDocType = 'tarjetaCirculacionUrl' | 'seguroUrl' | 'contratoPropietarioUrl' | 'contratoConductorUrl';

const documentTypes: { id: VehicleDocType; name: string }[] = [
  { id: 'tarjetaCirculacionUrl', name: 'Tarjeta de Circulación' },
  { id: 'seguroUrl', name: 'Póliza de Seguro' },
  { id: 'contratoPropietarioUrl', name: 'Contrato Propietario' },
  { id: 'contratoConductorUrl', name: 'Contrato Conductor' },
];

export function VehicleDocumentsCard({ vehicle }: VehicleDocumentsCardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocType, setUploadingDocType] = useState<VehicleDocType | null>(null);

  const handleUploadClick = (docType: VehicleDocType) => {
    setUploadingDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingDocType) return;

    try {
      const optimizedDataUrl = await optimizeImage(file, 1200);
      const storageRef = ref(storage, `vehicle-documents/${vehicle.id}/${uploadingDocType}-${Date.now()}.jpg`);
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      const updatedDocuments = { ...(vehicle.documents ?? {}), [uploadingDocType]: downloadURL };
      await inventoryService.saveVehicle({ ...vehicle, documents: updatedDocuments }, vehicle.id);

      toast({ title: 'Documento Cargado' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al subir documento', variant: "destructive" });
    } finally {
      setUploadingDocType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docType: VehicleDocType) => {
    const url = vehicle.documents?.[docType];
    if (!url) return;

    try {
      if (url.includes('firebasestorage')) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef).catch(() => console.warn("File not found in storage, proceeding to update DB"));
      }

      const updatedDocuments = { ...vehicle.documents };
      delete updatedDocuments[docType];
      
      await inventoryService.saveVehicle({ ...vehicle, documents: updatedDocuments }, vehicle.id);
      toast({ title: 'Documento Eliminado' });
    } catch (err) {
      toast({ title: 'Error al eliminar', variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          Documentación de la Unidad
        </CardTitle>
        <CardDescription>Expediente digital del vehículo para gestión de flota.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableBody>
              {documentTypes.map(doc => {
                const docUrl = vehicle.documents?.[doc.id];
                const isUploading = uploadingDocType === doc.id;

                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-sm">{doc.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {docUrl ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600" 
                              onClick={() => window.open(docUrl, '_blank')}
                              title="Ver / Descargar documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ConfirmDialog
                              triggerButton={
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive"
                                  title="Eliminar documento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title={`¿Eliminar ${doc.name}?`}
                              description="Esta acción borrará el archivo permanentemente del sistema."
                              onConfirm={() => handleDeleteDocument(doc.id)}
                            />
                          </>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2"
                            onClick={() => handleUploadClick(doc.id)}
                            disabled={isUploading}
                          >
                            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            {isUploading ? 'Subiendo...' : 'Cargar'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,application/pdf"
        />
      </CardContent>
    </Card>
  );
}
