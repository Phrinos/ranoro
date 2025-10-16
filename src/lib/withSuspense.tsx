// src/lib/withSuspense.tsx
"use client";
import { Suspense, type ComponentType, type ReactNode } from "react";

export function withSuspense<P>(
  Comp: ComponentType<P>,
  fallback: ReactNode = null
) {
  return function Suspended(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Comp {...props} />
      </Suspense>
    );
  };
}
