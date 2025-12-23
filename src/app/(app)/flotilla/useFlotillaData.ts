
"use client";

import { useContext } from 'react';
import { FlotillaContext } from './FlotillaClientLayout';

export const useFlotillaData = () => useContext(FlotillaContext);
