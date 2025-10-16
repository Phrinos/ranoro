// src/lib/withSuspense.tsx
"use client";
import { Suspense, type ComponentType, type ReactNode } from "react";

export function withSuspense<P extends object>(
  Comp: ComponentType<P>,
  fallback: ReactNode = null
): React.FC<P> {
  return function Suspended(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Comp {...props} />
      </Suspense>
    );
  };
}
