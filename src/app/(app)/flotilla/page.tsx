// src/app/(app)/flotilla/page.tsx
"use client";

import React from 'react';
import { useFlotillaData } from './layout'; 

export default function FlotillaPage() {
    const { isLoading } = useFlotillaData();

    if (isLoading) {
        return null; // The loading state is handled by the layout
    }

    return (
        <></> // The main content is rendered by the layout
    );
}
