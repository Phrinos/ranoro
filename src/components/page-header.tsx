// src/components/page-header.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="grid gap-1">
          {typeof title === 'string' ? (
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          ) : (
            title
          )}
          {description && (
            typeof description === 'string' ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : (
              description
            )
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
