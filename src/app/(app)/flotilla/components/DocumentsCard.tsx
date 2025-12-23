
// src/app/(app)/flotilla/components/DocumentsCard.tsx
"use client";

import React, { useRef, useState } from 'react';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Upload, Trash2, Loader2, FileX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { personnelService } from '@/lib/services';
import { storage } from '@/lib/firebaseClient';
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { optimizeImage } from '@/lib/utils';
import Link from 'next/link';

interface DocumentsCardProps {
  driver: Driver;
}

type DocType = 'ineFrontUrl' | 'ineBackUrl' | 'licenseUrl' | 'proofOfAddressUrl' | 'promissoryNoteUrl';

const documentTypes: { id: DocType; name: string }[] = [
  { id: 'ineFrontUrl', name: 'INE (Frente)' },
  { id: 'ineBackUrl', name: 'INE (Atrás)' },
  { id: 'licenseUrl', name: 'Licencia' },
  { id: 'proofOfAddressUrl', name: 'Comprobante de Domicilio' },
  { id: 'promissoryNoteUrl', name: 'Pagaré' },
];

export function DocumentsCard({ driver }: DocumentsCardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocType, setUploadingDocType] = useState<DocType | null>(null);

  const handleUploadClick = (docType: DocType) => {
    setUploadingDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingDocType) return;

    try {
      const optimizedDataUrl = await optimizeImage(file, 1024);
      const storageRef = ref(storage, `driver-documents/${driver.id}/${uploadingDocType}-${Date.now()}.jpg`);
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      await personnelService.saveDriver({
        ...driver,
        documents: { ...(driver.documents ?? {}), [uploadingDocType]: downloadURL }
      }, driver.id);

      toast({ title: 'Documento Subido', description: 'El documento se ha guardado correctamente.' });
    } catch (err) {
      toast({ title: 'Error de Subida', variant: 'destructive' });
    } finally {
      setUploadingDocType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  const handleDelete = async (docType: DocType) => {
    if (!driver.documents?.[docType]) return;
    
    try {
      const fileRef = ref(storage, driver.documents[docType]!);
      await deleteObject(fileRef);
    } catch (error) {
       console.error("Old file not found, skipping delete.", error)
    }

    const current = driver.documents ?? {};
    const { [docType]: _removed, ...rest } = current;

    await personnelService.saveDriver({
      ...driver,
      documents: rest
    }, driver.id);
    toast({ title: "Documento eliminado", variant: "destructive" });
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>Gestión de los documentos del conductor.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Documento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentTypes.map(doc => {
                  const docUrl = driver.documents?.[doc.id];
                  const isUploading = uploadingDocType === doc.id;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant={docUrl ? 'success' : 'secondary'}>
                          {docUrl ? 'Cargado' : 'Faltante'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {docUrl ? (
                          <>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={docUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                             <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(doc.id)}>
                               <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : <FileX className="h-4 w-4 text-muted-foreground inline-block" />}
                        <Button variant="ghost" size="icon" onClick={() => handleUploadClick(doc.id)} disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    </>
  );
}
