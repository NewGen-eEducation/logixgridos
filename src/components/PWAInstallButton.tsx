import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, CheckCircle2, Sparkles } from 'lucide-react';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar' | 'collapsed' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar', className = '' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  // Sidebar expanded variant
  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition group ${
            isInstalled 
              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20' 
              : 'text-white bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/30 shadow-md shadow-emerald-950/40'
          } ${className}`}
          title="Direct Install APK / Offline App"
        >
          <div className={`p-1.5 rounded-lg shrink-0 ${isInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/20 text-white group-hover:scale-110 transition-transform'}`}>
            {isInstalled ? <CheckCircle2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </div>
          <div className="flex flex-col text-left overflow-hidden min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate text-white">
                {isInstalled ? 'APK Installed' : 'Direct Install APK'}
              </span>
              {!isInstalled && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.2 rounded">
                  WebAPK
                </span>
              )}
            </div>
            <span className="text-[10px] text-emerald-100/80 truncate">
              {isInstalled ? 'Offline mode active' : '100% Offline Android & PC'}
            </span>
          </div>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Sidebar collapsed icon variant
  if (variant === 'collapsed') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`p-2 rounded-xl transition border cursor-pointer active:scale-95 ${
            isInstalled
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border-emerald-500/40 hover:text-white'
          } ${className}`}
          title="Direct Install APK / Offline Mode"
        >
          <Smartphone className="w-4 h-4" />
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Navbar high-visibility button
  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap shadow-sm ${
          isInstalled
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border border-emerald-400/40 shadow-emerald-950/30 ring-1 ring-emerald-400/20'
        } ${className}`}
        title="Direct Install APK file / Offline App"
      >
        {isInstalled ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium text-emerald-300">Installed</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
            <span className="text-[11px] font-bold text-white hidden sm:inline">Direct Install APK</span>
            <span className="text-[11px] font-bold text-white sm:hidden">Install APK</span>
            <span className="hidden md:inline-block text-[9px] bg-black/30 text-emerald-200 px-1 py-0.2 rounded font-mono uppercase">
              Offline
            </span>
          </>
        )}
      </button>
      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
