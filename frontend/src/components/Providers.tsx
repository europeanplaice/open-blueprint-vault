'use client';

import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { SocketProvider } from './SocketProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </ThemeProvider>
  );
}
