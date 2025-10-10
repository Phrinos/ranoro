
"use client";

import { useContext } from 'react';
import { FlotillaContext } from './FlotillaClientLayout';

// Este hook simplemente exporta el contexto desde la ubicación correcta.
export const useFlotillaData = () => useContext(FlotillaContext);
