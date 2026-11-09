import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, QrCode, Sparkles, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScanResult: (code: string) => void;
  onClose: () => void;
  fieldName?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onScanResult,
  onClose,
  fieldName = 'Field',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');

  // Quick preset barcodes for rapid testing on devices without physical barcodes
  const sampleCodes = ['2026-CS-101', '2026-CS-102', 'INV-9021', 'STU-440', 'REG-882'];

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera access not supported on this browser/environment.');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err: any) {
        setCameraError(err?.message || 'Could not start camera. You can also pick a simulated barcode below.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSelectCode = (code: string) => {
    onScanResult(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Scan Barcode / QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Camera Screen */}
        <div className="p-4 space-y-4">
          <div className="relative w-full h-52 bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
            {streamActive ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Aiming Reticle Overlay */}
                <div className="absolute inset-0 border-2 border-emerald-500/50 m-8 rounded-lg pointer-events-none flex items-center justify-center animate-pulse">
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-zinc-300">
                  Align barcode or QR code within the frame
                </div>
              </>
            ) : (
              <div className="text-center p-4 space-y-2">
                <Camera className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  {cameraError || 'Initializing device camera viewfinder...'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Simulated / Test Barcodes for instant testing */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 block">
              Quick Scan Presets (or test IDs):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelectCode(code)}
                  className="px-2.5 py-1 text-xs font-mono bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/10 rounded-lg transition-all cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Entry */}
          <div className="pt-2 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or type/paste scanned code"
              className="flex-1 px-3 py-1.5 text-xs bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => manualCode && handleSelectCode(manualCode)}
              disabled={!manualCode}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-zinc-500 rounded-xl text-white transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
