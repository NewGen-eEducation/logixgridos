import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { PWAInstallModal } from './PWAInstallModal';

export const DirectAPKInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  if (isInstalled || isDismissed) {
    return <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#13221b] to-zinc-900 border-b border-emerald-500/20 px-3 py-2 text-white shadow-inner flex items-center justify-between gap-2.5 transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                Direct Install APK &amp; Offline App
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold hidden xs:inline">
                WebAPK
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 truncate">
              Install to phone home screen • Works 100% offline without internet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-950/50 border border-emerald-400/30 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Direct Install APK</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Dismiss banner"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
