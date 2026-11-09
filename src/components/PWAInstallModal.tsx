import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  Share2, 
  CheckCircle2, 
  WifiOff, 
  X, 
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
  QrCode
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'install' | 'apk' | 'ios'>('install');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const pwaBuilderUrl = `https://www.pwabuilder.com?siteUrl=${encodeURIComponent(currentUrl)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/40">
              <img
                src="/assets/aistudio/final_9ab59f78.jpeg"
                alt="LogiXGridOS Desktop Installed Icon"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Direct Install APK &amp; App</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-1.5 py-0.2 rounded uppercase">
                  WebAPK
                </span>
              </div>
              <p className="text-xs text-zinc-400">100% Offline Ready • Standalone Native Experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/40 px-3 pt-2 gap-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('install')}
            className={`px-3 py-2 rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'install'
                ? 'border-emerald-500 text-emerald-400 bg-white/[0.04] font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Direct Install (One-Click)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-3 py-2 rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'apk'
                ? 'border-blue-500 text-blue-400 bg-white/[0.04] font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android APK Package (.apk)
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`px-3 py-2 rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'border-purple-500 text-purple-400 bg-white/[0.04] font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            iPhone / Safari
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-zinc-300">
          {activeTab === 'install' && (
            <div className="space-y-4">
              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">App is Installed &amp; Ready Offline</div>
                    <div className="text-xs text-emerald-400/90 mt-0.5 leading-relaxed">
                      You are running in standalone native mode. All data tables, forms, and calculations work completely offline without network connection.
                    </div>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 space-y-3">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Instant Direct Install is Ready!
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    Click the button below to directly install this application to your device home screen and Android app launcher.
                  </p>
                  <button
                    onClick={async () => {
                      const success = await install();
                      if (success) onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/30 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>⚡ Direct Install APK to Device Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Step-by-step for Android Browser */}
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-3">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        Android Direct Installation (WebAPK)
                      </span>
                      <span className="text-[10px] text-emerald-300 font-mono">Chrome / Edge</span>
                    </div>
                    
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      To install directly as an Android WebAPK with an independent app icon on your home screen:
                    </p>

                    <ol className="text-xs space-y-2 text-zinc-200 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-emerald-400 bg-emerald-500/20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Open this page in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on Android.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-emerald-400 bg-emerald-500/20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                        <span>
                          Tap the browser menu icon (<strong>three dots ⋮</strong> in the top-right corner).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-emerald-400 bg-emerald-500/20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                        <span>
                          Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-emerald-400 bg-emerald-500/20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                        <span>
                          Android will automatically compile and register the <strong>WebAPK</strong> onto your phone!
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Quick Actions (Copy Link & Scan QR Code for Android) */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 space-y-2.5">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>Open on Android Phone:</span>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQR ? 'Hide QR' : 'Show QR Code'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {showQR && (
                  <div className="pt-2 flex flex-col items-center justify-center bg-black/40 p-3 rounded-lg border border-white/5 animate-in fade-in">
                    <img 
                      src={qrCodeUrl} 
                      alt="Scan to open on phone" 
                      className="w-40 h-40 bg-white p-2 rounded-lg shadow-md"
                    />
                    <p className="text-[11px] text-zinc-400 mt-2 text-center">
                      Scan with your Android phone camera to open and direct install APK.
                    </p>
                  </div>
                )}
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                    100% Offline Access
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Works anytime without internet connection.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Auto Local Storage
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Saves all data to your device with Excel import/export.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-200 space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  What is a WebAPK?
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  On modern Android devices, when you install an app via Chrome, Android builds a real <strong>.apk</strong> under the hood (called a <strong>WebAPK</strong>). It appears in your App Drawer, has its own app icon, splash screen, and operates independently from Chrome.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-semibold text-white">Download Standalone `.apk` file for sideloading / sharing:</div>
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 space-y-3 text-zinc-300">
                  <p className="text-zinc-300 leading-relaxed">
                    If you want an installable `.apk` file to distribute via WhatsApp, USB drive, or sideload onto phones without Chrome:
                  </p>
                  
                  <a
                    href={pwaBuilderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition cursor-pointer text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Generate Android APK on PWABuilder</span>
                  </a>

                  <ol className="list-decimal pl-4 space-y-1.5 text-zinc-400 text-[11px] pt-1">
                    <li>Click the button above to load your app in PWABuilder (free by Microsoft).</li>
                    <li>Click <strong>&quot;Package for Android&quot;</strong>.</li>
                    <li>Download your ready-to-install `.apk` file and transfer it to any Android device!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-zinc-800/60 border border-white/5 space-y-3 text-xs">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-purple-400" />
                  Installation on iPhone &amp; iPad (Safari)
                </div>
                <ol className="space-y-2.5 text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-400">1.</span>
                    <span>Open this website in <strong>Safari</strong> on your iPhone or iPad.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-400">2.</span>
                    <span>Tap the <strong>Share button</strong> (square icon with upward arrow) at the bottom toolbar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-400">3.</span>
                    <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-400">4.</span>
                    <span>Tap <strong>Add</strong> in the top-right corner. The app will install to your iPhone home screen!</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-zinc-900/70 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>Service Worker Active (Full Offline Cache)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
