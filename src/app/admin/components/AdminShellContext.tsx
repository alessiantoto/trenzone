"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminShellContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const AdminShellContext = createContext<AdminShellContextType | undefined>(undefined);

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <AdminShellContext.Provider value={{ isSidebarOpen, setSidebarOpen, toggleSidebar }}>
      {children}
    </AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (context === undefined) {
    throw new Error('useAdminShell must be used within an AdminShellProvider');
  }
  return context;
}
