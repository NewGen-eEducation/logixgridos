import React, { useState, useEffect, useCallback } from 'react';
import { PinSecurityConfig } from '../types/security';
import { BrandLogo } from './BrandLogo';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Lightbulb, 
  AlertCircle, 
  Check, 
  Delete, 
  ShieldCheck, 
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface LockScreenProps {
  config: PinSecurityConfig;
  deptName?: string;
  onUnlock: () => void;
  onOpenSecurityModal: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  config,
  deptName,
  onUnlock,
  onOpenSecurityModal,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [isUsingMasterKey, setIsUsingMasterKey] = useState(false);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(config.showHintOnLockScreen);
  const [showPinPlaintext, setShowPinPlaintext] = useState(false);

  // Trigger error shake
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Check PIN
  const handleVerifyPin = useCallback((pinToVerify: string) => {
    if (pinToVerify === config.pin) {
      setIsSuccess(true);
      setErrorMessage(null);
      setTimeout(() => {
        onUnlock();
      }, 350);
    } else {
      triggerError('Incorrect PIN. Please try again or use Hint / Master Key.');
      setEnteredPin('');
    }
  }, [config.pin, onUnlock]);

  // Check Master Key
  const handleVerifyMasterKey = useCallback((keyToVerify: string) => {
    if (keyToVerify === config.masterKey) {
      setIsSuccess(true);
      setErrorMessage(null);
      setTimeout(() => {
        onUnlock();
        // After master key unlock, prompt to change PIN if they wish
        onOpenSecurityModal();
      }, 350);
    } else {
      triggerError('Incorrect Master Key. Default master key is 0000.');
      setMasterKeyInput('');
    }
  }, [config.masterKey, onUnlock, onOpenSecurityModal]);

  // Handle hit on keypad number
  const handleHitNumber = (num: string) => {
    setErrorMessage(null);
    if (isUsingMasterKey) {
      if (masterKeyInput.length < 12) {
        const next = masterKeyInput + num;
        setMasterKeyInput(next);
        // Auto-check if 4 digits matching master key length
        if (next.length === config.masterKey.length) {
          handleVerifyMasterKey(next);
        }
      }
    } else {
      if (enteredPin.length < 8) {
        const next = enteredPin + num;
        setEnteredPin(next);
        // If length matches current PIN length, auto verify
        if (next.length === config.pin.length) {
          handleVerifyPin(next);
        }
      }
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    setErrorMessage(null);
    if (isUsingMasterKey) {
      setMasterKeyInput(prev => prev.slice(0, -1));
    } else {
      setEnteredPin(prev => prev.slice(0, -1));
    }
  };

  // Handle clear
  const handleClear = () => {
    setErrorMessage(null);
    if (isUsingMasterKey) {
      setMasterKeyInput('');
    } else {
      setEnteredPin('');
    }
  };

  // Keyboard support for typing digits
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleHitNumber(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (isUsingMasterKey) {
          handleVerifyMasterKey(masterKeyInput);
        } else {
          handleVerifyPin(enteredPin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUsingMasterKey, masterKeyInput, enteredPin, handleVerifyMasterKey, handleVerifyPin]);

  const activeInput = isUsingMasterKey ? masterKeyInput : enteredPin;
  const pinLength = isUsingMasterKey ? config.masterKey.length : config.pin.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center p-4 select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center my-auto">
        
        {/* Top Branding: NewGen eEducation with animated red 'e' */}
        <div className="flex flex-col items-center gap-1 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500/20 via-zinc-800 to-zinc-900 border border-red-500/30 flex items-center justify-center shadow-lg">
              <span className="animate-red-e font-black text-red-500 text-lg">e</span>
            </div>
            <BrandLogo size="lg" />
          </div>
            <p className="text-[11px] text-zinc-400 tracking-wider uppercase font-medium">
              Secure Application Workstation
            </p>
          </div>

        {/* Lock Icon Circle with Pulse */}
        <div className="relative mb-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-300 ${
            isSuccess 
              ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 scale-110' 
              : 'bg-[#1c1c1e] border border-white/10 text-white shadow-xl'
          }`}>
            {isSuccess ? (
              <Check className="w-8 h-8 text-emerald-400" />
            ) : (
              <Lock className="w-7 h-7 text-white" />
            )}
          </div>
          {isSuccess && (
            <div className="absolute -inset-1 rounded-3xl bg-emerald-500/30 blur-md -z-10 animate-ping" />
          )}
        </div>

        {/* Screen Title */}
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isSuccess 
              ? 'Access Granted' 
              : isUsingMasterKey 
                ? 'Enter Master Key' 
                : 'Enter Access PIN'}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isUsingMasterKey 
              ? 'Master recovery key allows unlocking & resetting PIN' 
              : 'Tap or hit numbers below or use your keyboard'}
          </p>
        </div>

        {/* PIN Indicators / Dots Display */}
        <div className={`flex items-center justify-center gap-3 mb-4 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
          {Array.from({ length: Math.max(4, pinLength) }).map((_, idx) => {
            const hasDigit = idx < activeInput.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border transition-all duration-150 flex items-center justify-center ${
                  hasDigit
                    ? isUsingMasterKey
                      ? 'bg-purple-500 border-purple-400 scale-110 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                      : 'bg-red-500 border-red-400 scale-110 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                    : 'bg-[#2c2c2e] border-white/10'
                }`}
              >
                {hasDigit && showPinPlaintext && (
                  <span className="text-[10px] font-bold text-white leading-none">
                    {activeInput[idx]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* View Digits Toggle */}
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setShowPinPlaintext(!showPinPlaintext)}
            className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            {showPinPlaintext ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showPinPlaintext ? 'Hide digits' : 'Show digits'}</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full mb-3 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="text-[11px] leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Lock Screen Hint Display */}
        {showHint && config.hint && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Lightbulb className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="text-[11px] truncate">
                <span className="font-semibold">Hint: </span>
                {config.hint}
              </span>
            </div>
            <button
              onClick={() => setShowHint(false)}
              className="text-[10px] text-amber-400 hover:text-amber-200 uppercase font-bold shrink-0 cursor-pointer"
            >
              Hide
            </button>
          </div>
        )}

        {/* Numeric Hit Keypad */}
        <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleHitNumber(String(num))}
              className="h-14 sm:h-15 rounded-2xl bg-[#1c1c1e] hover:bg-[#2c2c2e] active:bg-[#3a3a3c] border border-white/10 hover:border-white/20 text-white font-semibold text-xl sm:text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 touch-manipulation"
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-15 rounded-2xl bg-[#1c1c1e]/60 hover:bg-[#2c2c2e] active:bg-[#3a3a3c] border border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200 font-medium text-xs sm:text-sm flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Clear all entered digits"
          >
            <span>Clear</span>
          </button>

          {/* 0 Button */}
          <button
            type="button"
            onClick={() => handleHitNumber('0')}
            className="h-14 sm:h-15 rounded-2xl bg-[#1c1c1e] hover:bg-[#2c2c2e] active:bg-[#3a3a3c] border border-white/10 hover:border-white/20 text-white font-semibold text-xl sm:text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 touch-manipulation"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-15 rounded-2xl bg-[#1c1c1e]/60 hover:bg-[#2c2c2e] active:bg-[#3a3a3c] border border-white/5 hover:border-white/15 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Delete last digit"
          >
            <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Lock Screen Bottom Options */}
        <div className="w-full flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/10">
          
          {/* Hint Toggle */}
          {!showHint && config.hint && (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Show Hint</span>
            </button>
          )}

          {/* Toggle between PIN and Master Key */}
          <button
            type="button"
            onClick={() => {
              setIsUsingMasterKey(!isUsingMasterKey);
              setErrorMessage(null);
              setEnteredPin('');
              setMasterKeyInput('');
            }}
            className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors ml-auto cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              {isUsingMasterKey ? 'Back to PIN' : 'Use Master Key (0000)'}
            </span>
          </button>
        </div>

        {/* Footer info & developer notice */}
        <div className="mt-6 text-center text-[10px] text-zinc-400">
          Developed by <span className="text-zinc-300 font-medium">Guduru Sathish Kumar</span> • Default: <code className="text-zinc-400 bg-white/10 px-1 py-0.5 rounded">0000</code>
        </div>
      </div>
    </div>
  );
};
