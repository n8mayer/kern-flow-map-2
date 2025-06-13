import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Create a client
const queryClient = new QueryClient();

interface DataProviderProps {
  children: ReactNode;
}

// DataProvider component that wraps the app with QueryClientProvider
export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
