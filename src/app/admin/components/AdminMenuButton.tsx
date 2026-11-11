"use client";

import { Menu, X } from 'lucide-react';
import { useAdminShell } from './AdminShellContext';

export function AdminMenuButton() {
  const { isSidebarOpen, toggleSidebar } = useAdminShell();

  return (
    <button 
      onClick={toggleSidebar}
      className="md:hidden flex items-center justify-center w-10 h-10 bg-[#e32f8c] hover:bg-[#d0267d] rounded-xl text-white shadow-xs transition-all active:scale-90 shrink-0 cursor-pointer"
      aria-label="Deschide meniul"
    >
      {isSidebarOpen ? <X size={20} strokeWidth={2.75} /> : <Menu size={20} strokeWidth={2.75} />}
    </button>
  );
}
