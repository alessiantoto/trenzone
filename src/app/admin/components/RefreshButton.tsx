'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.refresh()}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-orange-500"
      title="Refresh Dashboard"
    >
      <RefreshCw size={20} />
    </button>
  );
}
