import React, { useState } from 'react';
import { PinSecurityConfig } from '../types/security';
import { BrandLogo } from './BrandLogo';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  KeyRound, 
  Lightbulb, 
  X, 
  Check, 
  AlertCircle, 
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

interface SecuritySettingsModalProps {
  config: PinSecurityConfig;
  onSaveConfig: (newConfig: PinSecurityConfig) => void;
  onLockNow: () => void;
  onClose: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  config,
  onSaveConfig,
  onLockNow,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'change_pin' | 'change_master' | 'hint'>('status');

  // Local state for configuration
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [hint, setHint] = useState(config.hint);
  const [showHintOnLockScreen, setShowHintOnLockScreen] = useState(config.showHintOnLockScreen);

  // Verification state for toggling or changes
  const [authMasterKey, setAuthMasterKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  // Master key change state
  const [currentMasterKeyInput, setCurrentMasterKeyInput] = useState('');
  const [newMasterKey, setNewMasterKey] = useState('');
  const [confirmMasterKey, setConfirmMasterKey] = useState('');

  // Password visibility
  const [showPasswords, setShowPasswords] = useState(false);

  // Status message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toggle PIN lock enable/disable
  const handleToggleEnable = (targetEnabled: boolean) => {
    setMessage(null);
    if (!targetEnabled) {
      // If turning OFF, verify master key
      if (authMasterKey !== config.masterKey && authMasterKey !== config.pin) {
        setMessage({
          type: 'error',
          text: 'To disable PIN protection, please enter the Master Key or Current PIN in the authorization field below (Default: 0000).',
        });
        return;
      }
    }
    
    setIsEnabled(targetEnabled);
    const updated: PinSecurityConfig = {
      ...config,
      isEnabled: targetEnabled,
    };
    onSaveConfig(updated);
    setAuthMasterKey('');
    setMessage({
      type: 'success',
      text: targetEnabled ? 'PIN lock protection is now ACTIVE.' : 'PIN lock protection has been DISABLED.',
    });
  };

  // Change PIN using Master Key
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Verify master key (or current PIN)
    if (authMasterKey !== config.masterKey && authMasterKey !== config.pin) {
      setMessage({
        type: 'error',
        text: 'Incorrect Master Key. Enter your Master Key (Default: 0000) to change the PIN.',
      });
      return;
    }

    // Validate new PIN
    if (!newPin || newPin.length < 4) {
      setMessage({
        type: 'error',
        text: 'PIN must be at least 4 digits long.',
      });
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setMessage({
        type: 'error',
        text: 'PIN must contain numbers only.',
      });
      return;
    }

    if (newPin !== confirmPin) {
      setMessage({
        type: 'error',
        text: 'The confirmation PIN does not match.',
      });
      return;
    }

    const updated: PinSecurityConfig = {
      ...config,
      pin: newPin,
    };
    onSaveConfig(updated);
    setAuthMasterKey('');
    setNewPin('');
    setConfirmPin('');
    setMessage({
      type: 'success',
      text: `PIN successfully changed to ${newPin}!`,
    });
  };

  // Change Master Key using current Master Key
  const handleChangeMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (currentMasterKeyInput !== config.masterKey) {
      setMessage({
        type: 'error',
        text: 'Current Master Key is incorrect. Default is 0000.',
      });
      return;
    }

    if (!newMasterKey || newMasterKey.length < 4) {
      setMessage({
        type: 'error',
        text: 'New Master Key must be at least 4 characters long.',
      });
      return;
    }

    if (newMasterKey !== confirmMasterKey) {
      setMessage({
        type: 'error',
        text: 'Master Key confirmation does not match.',
      });
      return;
    }

    const updated: PinSecurityConfig = {
      ...config,
      masterKey: newMasterKey,
    };
    onSaveConfig(updated);
    setCurrentMasterKeyInput('');
    setNewMasterKey('');
    setConfirmMasterKey('');
    setMessage({
      type: 'success',
      text: 'Master Key updated successfully!',
    });
  };

  // Save Hint & options
  const handleSaveHintSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PinSecurityConfig = {
      ...config,
      hint: hint.trim(),
      showHintOnLockScreen,
    };
    onSaveConfig(updated);
    setMessage({
      type: 'success',
      text: 'Lock screen hint preferences saved.',
    });
  };

  // Reset to default 0000
  const handleResetToDefaults = () => {
    if (authMasterKey !== config.masterKey) {
      setMessage({
        type: 'error',
        text: 'Enter Master Key in authorization box below to reset back to factory defaults (0000).',
      });
      return;
    }

    const resetConfig: PinSecurityConfig = {
      isEnabled: true,
      pin: '0000',
      masterKey: '0000',
      hint: 'Default PIN is 0000',
      showHintOnLockScreen: true,
      autoLockMinutes: 0,
    };
    onSaveConfig(resetConfig);
    setIsEnabled(true);
    setHint('Default PIN is 0000');
    setShowHintOnLockScreen(true);
    setAuthMasterKey('');
    setMessage({
      type: 'success',
      text: 'Security settings reset to factory defaults (PIN: 0000, Master Key: 0000).',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c1c1e] text-white rounded-2xl max-w-lg w-full border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#18181a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  PIN Lock & Security
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 font-mono">
                  Protection
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <BrandLogo size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#141416] px-3 pt-2 gap-1 overflow-x-auto">
          {[
            { id: 'status', label: 'Lock Switch', icon: Lock },
            { id: 'change_pin', label: 'Change PIN', icon: KeyRound },
            { id: 'change_master', label: 'Master Key', icon: ShieldCheck },
            { id: 'hint', label: 'Lock Screen Hint', icon: Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setMessage(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-[#1c1c1e]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="leading-tight">{message.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: STATUS & ENABLE/DISABLE TOGGLE */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#222226] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">PIN Lock Protection</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isEnabled 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    {isEnabled 
                      ? 'The app prompts for PIN on load or manual lock.' 
                      : 'PIN protection is disabled. Anyone can access registers.'}
                  </p>
                </div>

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleEnable(!isEnabled)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Master Key input if disabling */}
              {!isEnabled && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <span className="font-semibold">Note:</span> PIN lock is currently turned OFF. Toggle the switch above anytime to activate it. Default PIN is <code className="bg-white/10 px-1 rounded">0000</code>.
                </div>
              )}

              {isEnabled && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Current Access PIN</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Current configured PIN: <code className="font-mono text-blue-300 font-bold bg-white/10 px-1.5 py-0.5 rounded">{config.pin}</code>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('change_pin')}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/15 hover:bg-blue-500/25 rounded-lg border border-blue-500/30 cursor-pointer"
                    >
                      Change PIN
                    </button>
                  </div>

                  {/* Lock Screen Test / Lock Now Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Want to test or lock immediately?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLockNow();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Screen Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Verification field for disabling */}
              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Master Key Authorization (Required to Disable / Reset)
                </label>
                <input
                  type="password"
                  placeholder="Enter Master Key (Default: 0000)"
                  value={authMasterKey}
                  onChange={(e) => setAuthMasterKey(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Default master recovery key is <code className="bg-white/10 px-1 rounded">0000</code>.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE PIN USING MASTER KEY */}
          {activeTab === 'change_pin' && (
            <form onSubmit={handleChangePin} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                You can change the access PIN using your <span className="font-semibold text-white">Master Key</span> (Default: <code className="bg-white/10 px-1 rounded">0000</code>) or current PIN.
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Master Key or Current PIN *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    placeholder="Enter Master Key (Default: 0000)"
                    value={authMasterKey}
                    onChange={(e) => setAuthMasterKey(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    New PIN (4-8 digits) *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    maxLength={8}
                    placeholder="e.g. 1234 or 2026"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono text-center tracking-widest text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Confirm New PIN *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    maxLength={8}
                    placeholder="Re-enter new PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono text-center tracking-widest text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Hide characters' : 'Show characters'}</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Update PIN
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CHANGE MASTER KEY */}
          {activeTab === 'change_master' && (
            <form onSubmit={handleChangeMasterKey} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                The Master Key can unlock the system even if you forget the PIN. Keep it secure! (Default: <code className="bg-white/10 px-1 rounded font-mono">0000</code>).
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Current Master Key *
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  placeholder="Enter current master key (Default: 0000)"
                  value={currentMasterKeyInput}
                  onChange={(e) => setCurrentMasterKeyInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    New Master Key *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    placeholder="Min 4 characters"
                    value={newMasterKey}
                    onChange={(e) => setNewMasterKey(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Confirm New Master Key *
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new master key"
                    value={confirmMasterKey}
                    onChange={(e) => setConfirmMasterKey(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Update Master Key
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: LOCK SCREEN HINT EDITING OPTION */}
          {activeTab === 'hint' && (
            <form onSubmit={handleSaveHintSettings} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                You can customize or edit the hint displayed on the lock screen to help remember your PIN.
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Lock Screen Hint Text (Editing Option)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Default PIN is 0000 or authorized secret"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  This text appears on the lock screen to assist authorized respondents.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#222226] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Always Show Hint on Lock Screen</div>
                  <div className="text-[11px] text-zinc-400">Show the hint banner automatically when locked</div>
                </div>
                <input
                  type="checkbox"
                  checked={showHintOnLockScreen}
                  onChange={(e) => setShowHintOnLockScreen(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded border-white/20 bg-[#2c2c2e] focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Save Hint Preferences
                </button>
              </div>
            </form>
          )}

          {/* Factory Reset Section */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-300">Reset to Defaults</div>
              <div className="text-[10px] text-zinc-400">Reset PIN and Master Key back to 0000</div>
            </div>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 rounded-xl cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset (0000)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="text-[10px] text-zinc-400">
            Developer: <span className="text-zinc-300">Guduru Sathish Kumar</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
