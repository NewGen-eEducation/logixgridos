import React, { useState } from 'react';
import { ExplorerFolder, ExplorerSubTab, ExplorerFile, WebAppItem } from '../types/explorer';
import { X, FolderInput, Folder, CornerDownRight, Layers } from 'lucide-react';

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ExplorerFile | ExplorerFolder | WebAppItem | null;
  itemType: 'file' | 'folder' | 'webapp';
  folders: ExplorerFolder[];
  subTabs: ExplorerSubTab[];
  onConfirmMove: (targetFolderId: string | null, targetSubTabId: string) => void;
  lang?: 'en' | 'te';
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({
  isOpen,
  onClose,
  item,
  itemType,
  folders,
  subTabs,
  onConfirmMove,
  lang = 'en',
}) => {
  if (!isOpen || !item) return null;

  const currentFolderId = 'parentFolderId' in item ? item.parentFolderId : item.folderId;
  const currentSubTabId = item.subTabId;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);
  const [selectedSubTabId, setSelectedSubTabId] = useState<string>(currentSubTabId || subTabs[0]?.id || 'folders_files');

  // Filter folders matching selected subTab, excluding folder itself if moving a folder
  const validFolders = folders.filter((f) => f.subTabId === selectedSubTabId && (itemType !== 'folder' || f.id !== item.id));

  const handleSave = () => {
    onConfirmMove(selectedFolderId, selectedSubTabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#1c1c1f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#242428] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'te' ? 'లొకేషన్ మార్చండి (Move)' : 'Move Item'}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-xs">
                {item.name}
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Target Sub-Tab */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>{lang === 'te' ? 'టార్గెట్ సబ్-ట్యాబ్ (విభాగం)' : 'Destination Sub-Tab'}</span>
            </label>
            <select
              value={selectedSubTabId}
              onChange={(e) => setSelectedSubTabId(e.target.value)}
              className="w-full px-3 py-2 bg-[#121214] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              {subTabs.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} {st.nameTe ? `(${st.nameTe})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Folder */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-zinc-400" />
              <span>{lang === 'te' ? 'టార్గెట్ ఫోల్డర్' : 'Destination Folder'}</span>
            </label>
            <div className="max-h-52 overflow-y-auto border border-white/10 rounded-xl bg-[#121214] p-1.5 space-y-1 custom-scrollbar">
              {/* Root option */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  selectedFolderId === null
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span>📂</span>
                <span>{lang === 'te' ? 'రూట్ (ప్రధాన స్క్రీన్ / నో ఫోల్డర్)' : 'Root (Top level - No folder)'}</span>
              </button>

              {validFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    selectedFolderId === f.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-zinc-500 ml-1" />
                  <span>📁</span>
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
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
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {lang === 'te' ? 'ఇక్కడికి తరలించండి' : 'Move Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
