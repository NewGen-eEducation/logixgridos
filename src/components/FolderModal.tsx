import React, { useState, useEffect } from 'react';
import { ExplorerFolder } from '../types/explorer';
import { 
  X, 
  Folder, 
  FolderPlus, 
  Briefcase, 
  GraduationCap, 
  Headphones, 
  Film, 
  Archive, 
  Star, 
  Code,
  Palette
} from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderData: Partial<ExplorerFolder>) => void;
  initialFolder?: ExplorerFolder | null;
  parentFolderId?: string | null;
  subTabId: string;
  allFolders: ExplorerFolder[];
  lang?: 'en' | 'te';
}

const COLOR_OPTIONS = [
  { id: 'blue', name: 'Blue', bg: 'bg-blue-500', text: 'text-blue-400' },
  { id: 'emerald', name: 'Green', bg: 'bg-emerald-500', text: 'text-emerald-400' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-400' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-400' },
  { id: 'red', name: 'Red', bg: 'bg-red-500', text: 'text-red-400' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-400' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-500', text: 'text-pink-400' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400' },
];

const ICON_OPTIONS = [
  { id: 'Folder', label: 'Default', Icon: Folder },
  { id: 'Briefcase', label: 'Work', Icon: Briefcase },
  { id: 'GraduationCap', label: 'Study', Icon: GraduationCap },
  { id: 'Headphones', label: 'Audio', Icon: Headphones },
  { id: 'Film', label: 'Video', Icon: Film },
  { id: 'Archive', label: 'Archive', Icon: Archive },
  { id: 'Star', label: 'Star', Icon: Star },
  { id: 'Code', label: 'Code', Icon: Code },
];

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialFolder,
  parentFolderId = null,
  subTabId,
  allFolders,
  lang = 'en',
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialFolder);
  const [name, setName] = useState(initialFolder?.name || '');
  const [color, setColor] = useState(initialFolder?.color || 'blue');
  const [icon, setIcon] = useState(initialFolder?.icon || 'Folder');
  const [parentId, setParentId] = useState<string | null>(initialFolder ? initialFolder.parentFolderId : parentFolderId);
  const [description, setDescription] = useState(initialFolder?.description || '');
  const [error, setError] = useState('');

  // Available parent folders (exclude current folder and children if editing to prevent cycle)
  const candidateParents = allFolders.filter(f => !initialFolder || f.id !== initialFolder.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'te' ? 'దయచేసి ఫోల్డర్ పేరును నమోదు చేయండి' : 'Please enter a folder name');
      return;
    }

    onSave({
      name: name.trim(),
      color,
      icon,
      parentFolderId: parentId || null,
      subTabId: initialFolder?.subTabId || subTabId,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#1c1c1f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#242428] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isEditing 
                  ? (lang === 'te' ? 'ఫోల్డర్ పేరు మార్చండి / ఎడిట్' : 'Edit Folder') 
                  : (lang === 'te' ? 'కొత్త ఫోల్డర్ సృష్టించండి' : 'Create New Folder')}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {lang === 'te' ? 'ఫైల్స్‌ను భద్రపరచడానికి వర్గీకరించండి' : 'Organize files into structured collections'}
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Folder Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {lang === 'te' ? 'ఫోల్డర్ పేరు' : 'Folder Name'} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder={lang === 'te' ? 'ఉదా: సైన్స్ మెటీరియల్స్, రిజిస్టర్లు' : 'e.g. Office Records, Hall Tickets, Media'}
              className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span>{lang === 'te' ? 'ఫోల్డర్ రంగు' : 'Folder Color'}</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${c.bg} ${
                    color === c.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {lang === 'te' ? 'ఫోల్డర్ ఐకాన్' : 'Folder Icon'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ id: iconId, label, Icon }) => (
                <button
                  key={iconId}
                  type="button"
                  onClick={() => setIcon(iconId)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    icon === iconId
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-sm'
                      : 'bg-[#141416] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Parent Folder (Location) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {lang === 'te' ? 'లొకేషన్ (పేరెంట్ ఫోల్డర్)' : 'Location / Parent Folder'}
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">{lang === 'te' ? '📂 రూట్ (ప్రధాన లొకేషన్)' : '📂 Root (Top level)'}</option>
              {candidateParents.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {lang === 'te' ? 'వివరణ (ఐచ్ఛికం)' : 'Description (Optional)'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'te' ? 'ఈ ఫోల్డర్ గురించి సంక్షిప్త సమాచారం...' : 'Brief notes about folder contents...'}
              className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
            >
              {lang === 'te' ? 'రద్దు' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0a84ff] hover:bg-blue-600 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              {isEditing 
                ? (lang === 'te' ? 'సేవ్ చేయండి' : 'Save Changes') 
                : (lang === 'te' ? 'సృష్టించండి' : 'Create Folder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
