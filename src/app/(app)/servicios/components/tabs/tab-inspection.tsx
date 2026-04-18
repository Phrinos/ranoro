// src/app/(app)/servicios/components/tabs/tab-inspection.tsx
"use client";

import React from "react";

// Reuse SafetyChecklist and PhotoReportTab from old path (stable, no changes needed)
const SafetyChecklist: any = React.lazy(() =>
  import("@/app/(app)/servicios/components/SafetyChecklist").then((m) => ({
    default: m.SafetyChecklist,
  }))
);
const PhotoReportTab: any = React.lazy(() =>
  import("@/app/(app)/servicios/components/PhotoReportTab").then((m: any) => ({
    default: m.PhotoReportTab || m.default,
  }))
);

interface TabInspectionProps {
  isWizardOpen: boolean;
  setIsWizardOpen: (v: boolean) => void;
}

export function TabInspection({ isWizardOpen, setIsWizardOpen }: TabInspectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-6 bg-card border border-border rounded-xl shadow-sm">
        <React.Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-xl" />}>
          <SafetyChecklist isWizardOpen={isWizardOpen} setIsWizardOpen={setIsWizardOpen} />
        </React.Suspense>
      </div>
      <div className="xl:col-span-6">
        <React.Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-xl" />}>
          <PhotoReportTab category="service" />
        </React.Suspense>
      </div>
    </div>
  );
}
