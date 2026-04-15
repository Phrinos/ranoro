// src/app/(public)/landing/AnimatedDiv.tsx
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedDivProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

// Movemos los objetos de variantes FUERA de los componentes para que
// no se recreen en cada render. Esto es especialmente importante en
// listas largas donde AnimatedDiv o StaggerItem se instancian muchas veces.
const FADE_DIRECTIONS = {
  up:    { y: 50, opacity: 0 },
  down:  { y: -50, opacity: 0 },
  left:  { x: 50, opacity: 0 },
  right: { x: -50, opacity: 0 },
  none:  { opacity: 0, y: 0, x: 0 },
} as const;

const STAGGER_DIRECTIONS = {
  up:    { y: 30, opacity: 0 },
  down:  { y: -30, opacity: 0 },
  left:  { x: 30, opacity: 0 },
  right: { x: -30, opacity: 0 },
  none:  { opacity: 0, y: 0, x: 0 },
} as const;

const VISIBLE_STATE = { y: 0, x: 0, opacity: 1 };
const STAGGER_TRANSITION = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

export const AnimatedDiv = ({ children, className, delay = 0, direction = 'up' }: AnimatedDivProps) => {
    return (
        <motion.div
            initial={FADE_DIRECTIONS[direction]}
            whileInView={VISIBLE_STATE}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
};

export const StaggerContainer = ({
  children,
  className,
  staggerDelay = 0.1,
  delayChildren = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
}) => {
    return (
        <motion.div
            variants={{
                hidden: {},
                show: {
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren,
                    }
                }
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const StaggerItem = ({
  children,
  className,
  direction = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}) => {
    return (
        <motion.div
            variants={{
                hidden: STAGGER_DIRECTIONS[direction],
                show: { ...VISIBLE_STATE, transition: STAGGER_TRANSITION },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};
