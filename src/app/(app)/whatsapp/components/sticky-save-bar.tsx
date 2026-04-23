'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Check, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickySaveBarProps {
  onSave: () => void;
  isSaving: boolean;
  label?: string;
}

export function StickySaveBar({ onSave, isSaving, label = 'Guardar Cambios' }: StickySaveBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-1 mb-4">
      <div className="flex items-center justify-end gap-3 rounded-xl border bg-background/80 backdrop-blur-md px-4 py-3 shadow-sm">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            'gap-2 min-w-[180px] transition-all',
            'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
            'text-white shadow-md hover:shadow-lg',
          )}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Guardando...' : label}
        </Button>
      </div>
    </div>
  );
}
