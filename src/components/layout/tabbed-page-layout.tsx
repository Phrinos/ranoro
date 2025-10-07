

"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TabConfig {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedPageLayoutProps {
  title: string;
  description: React.ReactNode;
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (value: string) => void;
  actions?: React.ReactNode;
  isMobile: boolean;
}

export function TabbedPageLayout({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  actions,
  isMobile,
}: TabbedPageLayoutProps) {
  return (
    <>
      {title && description && (
        <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                  {typeof description === 'string' ? <p className="text-primary-foreground/80 mt-1">{description}</p> : description}
              </div>
          </div>
        </div>
      )}

      {actions && <div className="mb-6 flex justify-end">{actions}</div>}
      
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="w-full">
            {isMobile ? (
                <Select value={activeTab} onValueChange={onTabChange}>
                    <SelectTrigger className="w-full h-12 text-base">
                        <SelectValue placeholder="Seleccionar vista..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tabs.map((tabInfo) => (
                            <SelectItem key={tabInfo.value} value={tabInfo.value} className="text-base">
                                {tabInfo.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                    {tabs.map((tabInfo) => (
                    <button
                        key={tabInfo.value}
                        onClick={() => onTabChange(tabInfo.value)}
                        className={cn(
                        'flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base',
                        'break-words whitespace-normal leading-snug',
                        activeTab === tabInfo.value
                            ? 'bg-primary text-primary-foreground shadow'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                    >
                        {tabInfo.label}
                    </button>
                    ))}
                </TabsList>
            )}
        </div>
        
        {tabs.map((tabInfo) => (
            <TabsContent key={tabInfo.value} value={tabInfo.value} className="mt-6">
                {tabInfo.content}
            </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
