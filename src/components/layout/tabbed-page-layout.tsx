

"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TabConfig {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedPageLayoutProps {
  title: string;
  description: string;
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (value: string) => void;
  actions?: React.ReactNode;
}

export function TabbedPageLayout({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  actions,
}: TabbedPageLayoutProps) {
  return (
    <>
      {title && description && (
        <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                  <p className="text-primary-foreground/80 mt-1">{description}</p>
              </div>
          </div>
        </div>
      )}

      {actions && <div className="mb-6 flex justify-end">{actions}</div>}
      
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="w-full">
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
