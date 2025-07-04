"use client"

import NextNProgress from 'nextjs-progressbar';
import React from 'react';

export function NProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NextNProgress color="#8B5CF6" startPosition={0.3} stopDelayMs={200} height={3} showOnShallow={true} />
      {children}
    </>
  );
} 