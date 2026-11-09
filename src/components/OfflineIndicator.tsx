import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/90 text-white px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-md border border-amber-400/30 animate-in fade-in slide-in-from-bottom-2">
      <WifiOff className="w-4 h-4 animate-pulse text-amber-200" />
      <span>Offline Mode — All changes saved to local storage</span>
    </div>
  );
};
