import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onClose,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl shadow-2xl max-w-md w-full border border-white/15 overflow-hidden"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 ${
              isDestructive ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-[#161618] px-5 py-3.5 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              isDestructive
                ? 'bg-[#ff453a] hover:bg-[#ff453a]/90'
                : 'bg-[#0a84ff] hover:bg-[#0071e3]'
            }`}
          >
            {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
