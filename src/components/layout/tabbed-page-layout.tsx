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
  description?: string;
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
      <PageHeader title={title} description={description} actions={actions} />
      <div className="mt-4">
        <div className="flex flex-wrap w-full gap-2 sm:gap-4 border-b">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-t-md transition-colors duration-200 text-sm sm:text-base font-medium',
                'break-words whitespace-normal leading-snug border-b-2',
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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