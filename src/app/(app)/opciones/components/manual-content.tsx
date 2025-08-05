
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { manualSections } from '@/lib/data/manual-data';

export function ManualUsuarioPageContent() {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Manual de Usuario - Ranoro</CardTitle>
            <CardDescription>Una guía completa para aprovechar al máximo todas las funciones de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
              <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                  {manualSections.map((section, index) => (
                      <AccordionItem value={`item-${index}`} key={section.title}>
                          <AccordionTrigger className="text-lg font-semibold hover:no-underline" role="heading">
                              <div className="flex items-center gap-3">
                                <section.icon className="h-5 w-5"/>
                                {section.title}
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="prose prose-sm max-w-none text-muted-foreground pl-10">
                            {section.content}
                          </AccordionContent>
                      </AccordionItem>
                  ))}
              </Accordion>
          </CardContent>
        </Card>
    );
};
