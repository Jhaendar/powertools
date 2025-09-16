import React, { createContext, useContext, ReactNode } from 'react';
import { ToolRegistry } from '../types';
import { toolRegistry } from '../utils/toolRegistry';

const ToolRegistryContext = createContext<ToolRegistry | undefined>(undefined);

interface ToolRegistryProviderProps {
  children: ReactNode;
}

export const ToolRegistryProvider: React.FC<ToolRegistryProviderProps> = ({ children }) => {
  return (
    <ToolRegistryContext.Provider value={toolRegistry}>
      {children}
    </ToolRegistryContext.Provider>
  );
};

export const useToolRegistry = (): ToolRegistry => {
  const context = useContext(ToolRegistryContext);
  if (!context) {
    throw new Error('useToolRegistry must be used within a ToolRegistryProvider');
  }
  return context;
};