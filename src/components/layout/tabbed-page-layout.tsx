
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
      {/* Page title — clean, no red bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {/* Pill-style tab navigation */}
      <div className="inline-flex flex-wrap gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.icon && <span className="text-current">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeContent}
      </div>
    </div>
  );
}
