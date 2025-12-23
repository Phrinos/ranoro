
"use client";
import React, { useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { cn } from '@/lib/utils';

export const AnimatedDiv = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref as React.RefObject<Element>, { threshold: 0.1 });
    return (
        <div ref={ref} className={cn("transition-all duration-700", isVisible ? `opacity-100 translate-y-0` : "opacity-0 translate-y-5", className)}>
            {children}
        </div>
    );
};
