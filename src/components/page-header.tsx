import type React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string; // Allow passing custom classes
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-4", className)}> {/* Adjusted margin */}
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <div className="grid gap-1">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl font-headline"> {/* Adjusted font size */}
            {title}
          </h1>
          {description && (
            <p className="text-sm text-inherit/80">{description}</p> 
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
