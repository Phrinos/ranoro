
"use client";

import { cn } from "@/lib/utils";

export type TabConfig = {
  value: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
};

type TabbedPageLayoutProps = {
  title: string;
  description?: React.ReactNode;
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (v: string) => void;
  actions?: React.ReactNode;
};

export function TabbedPageLayout({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  actions,
}: TabbedPageLayoutProps) {
  const activeContent = tabs.find(tab => tab.value === activeTab)?.content;

  return (
    <div className="space-y-6">
      {/* Header and Tabs - Sticky */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md py-4 border-b border-border/50 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-4">
        {/* Page title */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            {description && (
              <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>

        {/* Pill-style tab navigation */}
        <div className="flex gap-1 p-1.5 h-auto w-full md:w-fit bg-muted/70 backdrop-blur-xs rounded-xl overflow-x-auto ring-1 ring-muted justify-start scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'shrink-0 flex-1 min-w-max px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-2',
                activeTab === tab.value
                  ? 'bg-red-700 text-white shadow-md scale-[1.02]'
                  : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              {tab.icon && <span className="text-current shrink-0">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeContent}
      </div>
    </div>
  );
}
