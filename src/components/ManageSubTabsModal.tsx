import React, { useState } from 'react';
import { ExplorerSubTab } from '../types/explorer';
import { isSystemSubTab } from '../utils/explorerStorage';
import { X, Plus, Edit2, Trash2, Folder, Globe, FileText, Film, Star, Layers, Palette, Youtube, GraduationCap } from 'lucide-react';

interface ManageSubTabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subTabs: ExplorerSubTab[];
  onAddSubTab: (newSubTab: Omit<ExplorerSubTab, 'id' | 'order'>) => void;
  onUpdateSubTab: (id: string, updates: Partial<ExplorerSubTab>) => void;
  onDeleteSubTab: (id: string) => void;
  lang?: 'en' | 'te';
}

const TAB_COLOR_PRESETS = [
  '#0a84ff', // Blue
  '#30d158', // Green
  '#ff0000', // Red
  '#ff9f0a', // Orange
  '#bf5af2', // Purple
  '#ff375f', // Pink
  '#5e5ce6', // Indigo
  '#64d2ff', // Cyan
  '#ffd60a', // Yellow
];

const TAB_ICONS = [
  { id: 'Folder', label: 'Folder', Icon: Folder },
  { id: 'Globe', label: 'Web', Icon: Globe },
  { id: 'Youtube', label: 'YouTube', Icon: Youtube },
  { id: 'GraduationCap', label: 'Classes', Icon: GraduationCap },
  { id: 'FileText', label: 'Docs', Icon: FileText },
  { id: 'Film', label: 'Media', Icon: Film },
  { id: 'Star', label: 'Star', Icon: Star },
  { id: 'Layers', label: 'Layers', Icon: Layers },
];

export const ManageSubTabsModal: React.FC<ManageSubTabsModalProps> = ({
  isOpen,
  onClose,
  subTabs,
  onAddSubTab,
  onUpdateSubTab,
  onDeleteSubTab,
  lang = 'en',
}) => {
  if (!isOpen) return null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [iconName, setIconName] = useState('Folder');
  const [color, setColor] = useState('#0a84ff');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setNameTe('');
    setIconName('Folder');
    setColor('#0a84ff');
    setDescription('');
    setError('');
  };

  const startEdit = (tab: ExplorerSubTab) => {
    setEditingId(tab.id);
    setName(tab.name);
    setNameTe(tab.nameTe || '');
    setIconName(tab.iconName);
    setColor(tab.color);
    setDescription(tab.description || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'te' ? 'దయచేసి సబ్-ట్యాబ్ పేరును నమోదు చేయండి' : 'Please enter sub-tab name');
      return;
    }

    if (editingId) {
      onUpdateSubTab(editingId, {
        name: name.trim(),
        nameTe: nameTe.trim() || undefined,
        iconName,
        color,
        description: description.trim() || undefined,
      });
    } else {
      onAddSubTab({
        name: name.trim(),
        nameTe: nameTe.trim() || undefined,
        iconName,
        color,
        isCustom: true,
        description: description.trim() || undefined,
      });
    }

    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#1c1c1f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#242428] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'te' ? 'సబ్-ట్యాబ్‌ల నిర్వహణ (Manage Sub-Tabs)' : 'Manage Explorer Sub-Tabs'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {lang === 'te' ? 'కస్టమ్ సబ్-ట్యాబ్‌లను జోడించండి, మార్చండి లేదా తొలగించండి' : 'Create and organize custom tabs for your workspace'}
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

        {/* Existing Sub-Tabs List */}
        <div className="p-5 border-b border-white/10 max-h-56 overflow-y-auto space-y-2 custom-scrollbar">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            {lang === 'te' ? 'ప్రస్తుత సబ్-ట్యాబ్‌లు' : 'Current Sub-Tabs'}
          </span>
          {subTabs.map((tab) => {
            const isProtected = isSystemSubTab(tab.id);
            return (
              <div
                key={tab.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#141416] border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: tab.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{tab.name}</span>
                      {tab.nameTe && <span className="text-[11px] text-zinc-400 font-normal">({tab.nameTe})</span>}
                    </div>
                    {tab.description && (
                      <div className="text-[10px] text-zinc-500 truncate">{tab.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(tab)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Edit Sub-Tab"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!isProtected ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete sub-tab "${tab.name}"? Files will be kept in Root.`)) {
                          onDeleteSubTab(tab.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Sub-Tab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-mono select-none">
                      {lang === 'te' ? 'సిస్టమ్' : 'System'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add / Edit Form */}
        <form onSubmit={handleSave} className="p-5 space-y-3.5 bg-[#17171a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              {editingId ? <Edit2 className="w-3.5 h-3.5 text-blue-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
              <span>
                {editingId 
                  ? (lang === 'te' ? 'సబ్-ట్యాబ్‌ను సవరించండి' : 'Edit Sub-Tab') 
                  : (lang === 'te' ? 'కొత్త సబ్-ట్యాబ్‌ను జోడించండి' : 'Add New Custom Sub-Tab')}
              </span>
            </span>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                {lang === 'te' ? 'రద్దు' : 'Cancel Edit'}
              </button>
            )}
          </div>

          {error && (
            <div className="p-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                {lang === 'te' ? 'ట్యాబ్ పేరు (English)' : 'Tab Name (EN)'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="e.g. Study Zone"
                className="w-full px-2.5 py-1.5 bg-[#121214] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                {lang === 'te' ? 'తెలుగు పేరు (ఐచ్ఛికం)' : 'Telugu Name (TE)'}
              </label>
              <input
                type="text"
                value={nameTe}
                onChange={(e) => setNameTe(e.target.value)}
                placeholder="ఉదా: స్టడీ జోన్"
                className="w-full px-2.5 py-1.5 bg-[#121214] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              {lang === 'te' ? 'థీమ్ రంగు' : 'Accent Color'}
            </label>
            <div className="flex items-center gap-2">
              {TAB_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                    color === c ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              {editingId ? (lang === 'te' ? 'అప్‌డేట్ చేయండి' : 'Update Tab') : (lang === 'te' ? 'జోడించండి' : 'Add Sub-Tab')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
