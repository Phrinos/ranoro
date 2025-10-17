
"use client";

import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export type TabConfig = {
  value: string;
  label: string;
  content: React.ReactNode;
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
    <div>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <PageHeader title={title} description={description} actions={actions} />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap w-full gap-2 sm:gap-4">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base',
                activeTab === tab.value
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {activeContent}
        </div>
      </div>
    </div>
  );
}
