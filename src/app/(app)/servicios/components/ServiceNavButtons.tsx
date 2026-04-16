// src/app/(app)/servicios/components/ServiceNavButtons.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Wrench, FileText, ClipboardCheck, DollarSign } from "lucide-react";

const tabs = [
  { id: "payment", label: "Trabajos & Pago", icon: DollarSign },
  { id: "reception-delivery", label: "Recepción", icon: FileText },
  { id: "safety-checklist", label: "Informe Mecánico", icon: ClipboardCheck },
];

interface ServiceNavButtonsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  serviceItemsCount?: number;
}

export function ServiceNavButtons({
  activeTab,
  onTabChange,
  serviceItemsCount = 0,
}: ServiceNavButtonsProps) {
  return (
    <div className="sticky top-[calc(var(--header-height,110px)+120px)] md:top-[var(--header-height,110px)] z-[18] bg-muted/30 border-b py-2 w-full mx-auto flex justify-center">
      <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 max-w-[1400px] w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 shadow-sm border",
                isActive
                  ? "bg-white text-primary border-primary/20 shadow-md ring-1 ring-primary/10"
                  : "bg-white text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{tab.label}</span>
              {tab.id === "payment" && serviceItemsCount > 0 && (
                <span className={cn(
                  "ml-1 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border",
                  isActive ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                )}>
                  {serviceItemsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
