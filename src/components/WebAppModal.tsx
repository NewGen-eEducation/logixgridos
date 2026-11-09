import React, { useState, useRef } from 'react';
import { WebAppItem, WebAppLaunchMode, ExplorerFolder } from '../types/explorer';
import { X, Globe, Link2, Sparkles, Folder, ExternalLink, MonitorPlay, Upload, Image as ImageIcon, Trash2, Smile } from 'lucide-react';

interface WebAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appData: Partial<WebAppItem>) => void;
  initialApp?: WebAppItem | null;
  subTabId: string;
  currentFolderId?: string | null;
  folders: ExplorerFolder[];
  lang?: 'en' | 'te';
}

const EMOJI_PRESETS = ['📊', '▶️', '🌐', '🏛️', '🔢', '📁', '🚀', '💡', '💼', '🎓', '📝', '⚡', '🤖', '🔍', '📈', '🛠️', '💻', '📚', '🎯', '🌟'];

export const WebAppModal: React.FC<WebAppModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialApp,
  subTabId,
  currentFolderId = null,
  folders,
  lang = 'en',
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialApp);
  const [name, setName] = useState(initialApp?.name || '');
  const [url, setUrl] = useState(initialApp?.url || '');
  const [icon, setIcon] = useState(initialApp?.icon || '🌐');
  const [customIconUrl, setCustomIconUrl] = useState<string | undefined>(initialApp?.customIconUrl);
  const [launchMode, setLaunchMode] = useState<WebAppLaunchMode>(initialApp?.launchMode || 'new_tab');
  const [folderId, setFolderId] = useState<string | null>(
    initialApp ? initialApp.folderId : currentFolderId
  );
  const [category, setCategory] = useState(initialApp?.category || 'General');
  const [description, setDescription] = useState(initialApp?.description || '');
  const [error, setError] = useState('');

  const iconFileInputRef = useRef<HTMLInputElement>(null);

  // Handle manual icon/image upload
  const handleIconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(lang === 'te' ? 'దయచేసి 2MB లోపు సైజు ఉన్న చిత్రాన్ని ఎంచుకోండి' : 'Icon image size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCustomIconUrl(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomIcon = () => {
    setCustomIconUrl(undefined);
    if (iconFileInputRef.current) {
      iconFileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'te' ? 'దయచేసి యాప్ పేరు నమోదు చేయండి' : 'Please enter app name');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl) {
      setError(lang === 'te' ? 'దయచేసి వెబ్‌సైట్ లింక్ (URL) నమోదు చేయండి' : 'Please enter website URL');
      return;
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    onSave({
      name: name.trim(),
      url: finalUrl,
      icon,
      customIconUrl,
      launchMode,
      folderId: folderId || null,
      subTabId: initialApp?.subTabId || subTabId,
      category: category.trim() || 'General',
      description: description.trim(),
      source: initialApp?.source || 'user',
      isPreloaded: initialApp?.isPreloaded || false,
    });
    onClose();
  };

  // Filter folders matching current subTab
  const relevantFolders = folders.filter((f) => f.subTabId === subTabId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#1c1c1f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#242428] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg overflow-hidden border border-emerald-500/30">
              {customIconUrl ? (
                <img src={customIconUrl} alt="App Icon" className="w-8 h-8 object-contain rounded-md" />
              ) : (
                <span>{icon || '🌐'}</span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isEditing 
                  ? (lang === 'te' ? 'వెబ్ యాప్ ఎడిట్ చేయండి' : 'Edit Web App') 
                  : (lang === 'te' ? 'కొత్త వెబ్ యాప్ జోడించండి' : 'Add Web App to App Store')}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {lang === 'te' ? 'ఏదైనా వెబ్‌సైట్ లేదా టూల్‌ను నేరుగా యాప్ లాగా ఓపెన్ చేసుకోండి' : 'Configure web link, folder placement, and custom icons'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Icon Image Upload Input */}
        <input
          ref={iconFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleIconFileUpload}
        />

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Name & Target Folder Row */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {lang === 'te' ? 'యాప్ / వెబ్ పేరు' : 'App / Web Name'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="e.g. Google Sheets, YouTube Channel, Govt Portal"
                className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Target Folder Placement */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'te' ? 'ఫోల్డర్ లొకేషన్' : 'Target Folder Location'}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {folderId ? 'Inside folder' : 'Main Root'}
                </span>
              </label>
              <select
                value={folderId || ''}
                onChange={(e) => setFolderId(e.target.value || null)}
                className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="">{lang === 'te' ? '🌐 ప్రధాన రూట్ (ఫోల్డర్ బయట - Root)' : '🌐 Main Root (Top Level - Outside Folders)'}</option>
                {relevantFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Icon & Emoji Selection */}
          <div className="p-3.5 rounded-2xl bg-[#141417] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'te' ? 'యాప్ ఐకాన్ లేదా ఎమోజి' : 'App Icon / Custom Emoji / Image Upload'}</span>
              </span>
              {customIconUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCustomIcon}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{lang === 'te' ? 'అప్‌లోడ్ చేసిన ఇమేజ్ తొలగించు' : 'Remove Uploaded Image'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Preview Thumbnail */}
              <div className="w-12 h-12 rounded-xl bg-[#1e1e24] border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                {customIconUrl ? (
                  <img src={customIconUrl} alt="Custom Icon" className="w-9 h-9 object-contain rounded-lg" />
                ) : (
                  <span className="text-2xl">{icon || '🌐'}</span>
                )}
              </div>

              {/* Upload Image Option */}
              <div className="flex-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => iconFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{customIconUrl ? (lang === 'te' ? 'ఇమేజ్ మార్చండి' : 'Change Uploaded Image') : (lang === 'te' ? 'ఇమేజ్ / ఐకాన్ అప్‌లోడ్ చేయండి' : 'Upload Custom Icon / Logo')}</span>
                </button>
                <div className="text-[10px] text-zinc-500 text-center">
                  PNG, JPG, SVG, WebP (Max 2MB)
                </div>
              </div>

              {/* Manual Emoji Text Input */}
              <div className="w-24">
                <input
                  type="text"
                  value={icon}
                  placeholder="Emoji"
                  maxLength={6}
                  onChange={(e) => {
                    setIcon(e.target.value);
                  }}
                  className="w-full px-2 py-1.5 bg-[#121214] border border-white/15 rounded-xl text-center text-lg focus:outline-none focus:border-emerald-500"
                  title="Type or paste any emoji"
                />
              </div>
            </div>

            {/* Quick Emoji Presets Bar */}
            <div>
              <span className="text-[10px] text-zinc-400 mb-1.5 block font-medium">
                {lang === 'te' ? 'త్వరిత ఎమోజీలు:' : 'Quick Emoji Presets:'}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setIcon(e);
                      // keep customIconUrl if set, or let user click presets
                    }}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                      icon === e && !customIconUrl ? 'bg-emerald-500/30 ring-2 ring-emerald-400 scale-105' : 'bg-white/5 hover:bg-white/15'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Web URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>{lang === 'te' ? 'వెబ్ అడ్రస్ (URL)' : 'Web Address (URL)'}</span> <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder="https://docs.google.com/spreadsheets or https://example.com"
              className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Launch Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {lang === 'te' ? 'ఓపెన్ చేసే విధానం (Launch Mode)' : 'Launch Behavior'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLaunchMode('new_tab')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  launchMode === 'new_tab'
                    ? 'bg-blue-500/20 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-[#121214] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">{lang === 'te' ? 'కొత్త ట్యాబ్ (సిఫార్సు)' : 'New Browser Tab (Recommended)'}</div>
                  <div className="text-[10px] text-zinc-400">{lang === 'te' ? 'పూర్తి స్క్రీన్‌లో ఓపెన్ అవుతుంది' : 'Opens in fresh browser tab'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLaunchMode('modal')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  launchMode === 'modal'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-[#121214] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                <MonitorPlay className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">{lang === 'te' ? 'ఇన్‌బిల్ట్ విండో' : 'Inbuilt Window'}</div>
                  <div className="text-[10px] text-zinc-400">{lang === 'te' ? 'యాప్‌లోనే పాపప్ లాగా' : 'Embedded app modal'}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {lang === 'te' ? 'వివరణ (ఐచ్ఛికం)' : 'Description (Optional)'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Official attendance sheet, learning tutorials"
              className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
            >
              {lang === 'te' ? 'రద్దు' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isEditing 
                ? (lang === 'te' ? 'సేవ్ చేయండి' : 'Save Changes') 
                : (lang === 'te' ? 'యాప్ జోడించండి' : 'Add Web App')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
