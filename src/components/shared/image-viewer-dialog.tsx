// src/components/shared/image-viewer-dialog.tsx
"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ImageViewerDialogContentProps {
  imageUrl: string | null;
}

export default function ImageViewerDialogContent({ imageUrl }: ImageViewerDialogContentProps) {
  return (
    <div className="relative aspect-video w-full min-h-[50vh]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Vista ampliada de evidencia"
          fill
          style={{ objectFit: 'contain' }}
          sizes="(max-width: 768px) 100vw, 1024px"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
