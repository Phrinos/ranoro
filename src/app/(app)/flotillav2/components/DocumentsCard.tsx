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

      toast({ title: 'Documento Subido' });
    } catch (err) {
      toast({ title: 'Error de Subida', variant: "destructive" });
    } finally {
      setUploadingDocType(null);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {documentTypes.map(doc => (
              <TableRow key={doc.id}>
                <TableCell>{doc.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleUploadClick(doc.id)}><Upload className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </CardContent>
    </Card>
  );
}
