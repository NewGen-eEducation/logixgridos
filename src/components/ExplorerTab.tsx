import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ExplorerFile,
  ExplorerFolder,
  WebAppItem,
  ExplorerSubTab,
  ExplorerFilterType,
  ExplorerSortOption,
  ExplorerViewMode,
  FileCategory,
} from '../types/explorer';
import {
  defaultSubTabs,
  defaultFolders,
  defaultWebApps,
  developerPreloadedWebApps,
  defaultFiles,
  STORAGE_KEYS,
  isSystemSubTab,
  storeFileBlob,
  getFileBlob,
  deleteFileBlob,
  detectFileCategory,
  formatFileSize,
} from '../utils/explorerStorage';
import { idbGetItemSync, idbSetItem, idbRemoveItem } from '../utils/indexedDBStorage';
import { ExplorerViewerModal } from './ExplorerViewerModal';
import { FolderModal } from './FolderModal';
import { WebAppModal } from './WebAppModal';
import { MoveItemModal } from './MoveItemModal';
import { ManageSubTabsModal } from './ManageSubTabsModal';
import { DigitalClassesView } from './DigitalClassesView';
import { RenameRegisterModal } from './RenameRegisterModal';
import {
  Folder,
  FolderPlus,
  Globe,
  Upload,
  Images,
  Search,
  Grid,
  List,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ChevronRight,
  Home,
  FileText,
  FileSpreadsheet,
  Film,
  Music,
  Image as ImageIcon,
  FileCode,
  File,
  Download,
  Trash2,
  Edit2,
  FolderInput,
  Star,
  ExternalLink,
  Plus,
  Minus,
  X,
  Layers,
  Sparkles,
  Play,
  Eye,
  CheckCircle2,
  Clock,
  HardDrive,
  Table2,
  BookOpen,
  SplitSquareVertical,
  ArrowLeftRight,
  ArrowRight,
  Youtube,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';
import { Register, ActiveTab } from '../types/register';
import { exportRegisterToExcelOrCSV } from '../utils/exportUtils';
import { ThemeId } from '../types/theme';

interface ExplorerTabProps {
  lang?: 'en' | 'te';
  registers?: Register[];
  activeRegId?: string;
  onSelectRegister?: (regId: string) => void;
  onImportRegister?: (newRegister: Register) => void;
  onRenameRegister?: (id: string, newTitle: string, newTitleTe?: string, newDesc?: string) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onNavigateToTable?: () => void;
  currentTheme?: ThemeId;
  isDrawActive?: boolean;
  onToggleDraw?: () => void;
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({
  lang = 'en',
  registers = [],
  activeRegId,
  onSelectRegister,
  onImportRegister,
  onRenameRegister,
  onNavigateToTab,
  onNavigateToTable,
  currentTheme,
  isDrawActive = false,
  onToggleDraw,
}) => {
  const isLight = currentTheme === 'light' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');
  const [registerToRename, setRegisterToRename] = useState<Register | null>(null);

  // State: Sub-Tabs
  const [subTabs, setSubTabs] = useState<ExplorerSubTab[]>(() => {
    try {
      const saved = idbGetItemSync<ExplorerSubTab[] | string>(STORAGE_KEYS.SUB_TABS);
      if (saved) {
        let parsed: ExplorerSubTab[] = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize legacy names to the user's requested system tab names
          parsed = parsed.map((tab) => {
            if (tab.id === 'folders_files' && (tab.name === 'Files' || !tab.name)) {
              return { ...tab, name: 'Local Files', nameTe: 'లోకల్ ఫైల్స్', color: '#0a84ff' };
            }
            if (tab.id === 'web_apps' && (tab.name === 'Web Apps' || !tab.name)) {
              return { ...tab, name: 'App Store', nameTe: 'యాప్ స్టోర్', color: '#10b981' };
            }
            if (tab.id === 'digital_classes') {
              return { ...tab, name: 'Digital Classes', nameTe: 'డిజిటల్ క్లాసెస్', color: '#ff0000' };
            }
            if (tab.id === 'app_registers') {
              return { ...tab, name: 'App Tables & Registers', nameTe: 'యాప్ టేబుల్స్ & రిజిస్టర్లు', color: '#8b5cf6' };
            }
            return tab;
          });

          // Ensure all 4 system tabs exist
          if (!parsed.some((t) => t.id === 'folders_files')) {
            const fTab = defaultSubTabs.find((t) => t.id === 'folders_files');
            if (fTab) parsed.unshift(fTab);
          }
          if (!parsed.some((t) => t.id === 'web_apps')) {
            const wTab = defaultSubTabs.find((t) => t.id === 'web_apps');
            if (wTab) {
              const fIdx = parsed.findIndex((t) => t.id === 'folders_files');
              parsed.splice(fIdx !== -1 ? fIdx + 1 : 1, 0, wTab);
            }
          }
          if (!parsed.some((t) => t.id === 'digital_classes')) {
            const digTab = defaultSubTabs.find((t) => t.id === 'digital_classes');
            if (digTab) {
              const appRegIdx = parsed.findIndex((t) => t.id === 'app_registers');
              if (appRegIdx !== -1) {
                parsed.splice(appRegIdx, 0, digTab);
              } else {
                parsed.push(digTab);
              }
            }
          }
          if (!parsed.some((t) => t.id === 'app_registers')) {
            const appRegTab = defaultSubTabs.find((t) => t.id === 'app_registers');
            if (appRegTab) parsed.push(appRegTab);
          }
          parsed = parsed.filter((t) => t.id !== 'media_albums');
          return parsed;
        }
      }
    } catch {}
    return defaultSubTabs;
  });

  const [activeSubTabId, setActiveSubTabId] = useState<string>(() => {
    const saved = idbGetItemSync<string>(STORAGE_KEYS.ACTIVE_SUB_TAB);
    if (saved && saved !== 'media_albums' && subTabs.some((t) => t.id === saved)) return saved;
    return subTabs[0]?.id || 'folders_files';
  });

  // State: Folders (Pure user data, no sample records)
  const [folders, setFolders] = useState<ExplorerFolder[]>(() => {
    try {
      const saved = idbGetItemSync<ExplorerFolder[] | string>(STORAGE_KEYS.FOLDERS);
      if (saved) {
        const parsed: ExplorerFolder[] = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed)) {
          return parsed.filter(f => !f.id.startsWith('folder_office_docs') && !f.id.startsWith('folder_study_material') && !f.id.startsWith('folder_multimedia'));
        }
      }
    } catch {}
    return [];
  });

  // State: Web Apps (Pre-loaded Developer apps + User-added custom apps)
  const [webApps, setWebApps] = useState<WebAppItem[]>(() => {
    try {
      const saved = idbGetItemSync<WebAppItem[] | string>(STORAGE_KEYS.WEB_APPS);
      if (saved) {
        let parsed: WebAppItem[] = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed)) {
          // Filter legacy invalid apps if any
          parsed = parsed.filter(a => !['app_wikipedia', 'app_calc'].includes(a.id));

          // Ensure all developer pre-loaded web apps are present
          developerPreloadedWebApps.forEach((preApp) => {
            const existing = parsed.find((a) => a.id === preApp.id);
            if (!existing) {
              parsed.push(preApp);
            } else {
              existing.isPreloaded = true;
              existing.source = 'preloaded';
              if (!existing.url) existing.url = preApp.url;
              if (!existing.description) existing.description = preApp.description;
            }
          });
          return parsed;
        }
      }
    } catch {}
    return developerPreloadedWebApps;
  });

  // State: App Store Category Filter ('all' | 'preloaded' | 'user')
  const [appStoreCategory, setAppStoreCategory] = useState<'all' | 'preloaded' | 'user'>('all');

  // State: Files (Pure user uploaded files, no sample records)
  const [files, setFiles] = useState<ExplorerFile[]>(() => {
    try {
      const saved = idbGetItemSync<ExplorerFile[] | string>(STORAGE_KEYS.FILES);
      if (saved) {
        const parsed: ExplorerFile[] = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed)) {
          return parsed
            .filter((f) => !f.id.startsWith('file_sample_'))
            .map((f) => {
              // Clean corrupt textPreview on binary files (e.g. zip header PK... on xlsx/xls/docx)
              if (['xlsx', 'xls', 'docx', 'doc', 'pdf', 'ppt', 'pptx'].includes(f.extension)) {
                if (f.textPreview?.startsWith('PK') || f.textPreview?.includes('[Content_Types]')) {
                  const copy = { ...f };
                  delete copy.textPreview;
                  return copy;
                }
              }
              return f;
            });
        }
      }
    } catch {}
    return [];
  });

  // Navigation State: Current Folder ID (null = Root)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [registerSearch, setRegisterSearch] = useState('');
  const [filterType, setFilterType] = useState<ExplorerFilterType>('all');
  const [sortOption, setSortOption] = useState<ExplorerSortOption>('date_desc');
  const [viewMode, setViewMode] = useState<ExplorerViewMode>('grid');

  // Modals & Multi-window viewer state (Windows Explorer Style)
  const [openFiles, setOpenFiles] = useState<(ExplorerFile | WebAppItem)[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ExplorerFolder | null>(null);

  const [isWebAppModalOpen, setIsWebAppModalOpen] = useState(false);
  const [editingWebApp, setEditingWebApp] = useState<WebAppItem | null>(null);

  const [moveModalItem, setMoveModalItem] = useState<{
    item: ExplorerFile | ExplorerFolder | WebAppItem;
    type: 'file' | 'folder' | 'webapp';
  } | null>(null);

  const [isManageTabsModalOpen, setIsManageTabsModalOpen] = useState(false);

  // Quick Note creation modal / prompt
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  // Drag and drop upload overlay & input ref
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-File Selection & Drag-and-Drop Moving
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);

  const handleToggleSelectFile = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAllFiles = (filesToSelect: ExplorerFile[]) => {
    const allIds = filesToSelect.map((f) => f.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedFileIds.includes(id));
    if (allSelected) {
      setSelectedFileIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedFileIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedFileIds([]);
  };

  // Bulk Move Files to Target Folder (or null for Root)
  const handleBulkMove = (targetFolderId: string | null) => {
    if (selectedFileIds.length === 0) return;
    setFiles((prev) =>
      prev.map((f) =>
        selectedFileIds.includes(f.id)
          ? { ...f, folderId: targetFolderId, subTabId: activeSubTabId }
          : f
      )
    );
    const count = selectedFileIds.length;
    setSelectedFileIds([]);
    setShowBulkMoveModal(false);
    const targetName = targetFolderId
      ? folders.find((f) => f.id === targetFolderId)?.name || 'Folder'
      : 'Root';
    showToast(
      lang === 'te'
        ? `${count} ఫైల్స్ "${targetName}" కి విజయవంతంగా తరలించబడ్డాయి`
        : `Moved ${count} file(s) to ${targetName}`
    );
  };

  // Bulk Delete Files
  const handleBulkDelete = async () => {
    if (selectedFileIds.length === 0) return;
    if (
      confirm(
        lang === 'te'
          ? `ఎంచుకున్న ${selectedFileIds.length} ఫైల్స్‌ను తొలగించాలా?`
          : `Delete ${selectedFileIds.length} selected files?`
      )
    ) {
      for (const id of selectedFileIds) {
        await deleteFileBlob(id);
      }
      setFiles((prev) => prev.filter((f) => !selectedFileIds.includes(f.id)));
      const count = selectedFileIds.length;
      setSelectedFileIds([]);
      showToast(
        lang === 'te'
          ? `${count} ఫైల్స్ తొలగించబడ్డాయి`
          : `${count} file(s) deleted`
      );
    }
  };

  // Drag and Drop file onto Folder or Root
  const handleDragStartFile = (e: React.DragEvent, fileId: string) => {
    setDraggedFileId(fileId);
    const filesToMove = selectedFileIds.includes(fileId) ? selectedFileIds : [fileId];
    e.dataTransfer.setData('application/json', JSON.stringify(filesToMove));
    e.dataTransfer.setData('text/plain', fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnFolder = (targetFolderId: string | null, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let fileIds: string[] = [];
      const json = e.dataTransfer.getData('application/json');
      if (json) {
        try {
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed)) fileIds = parsed;
        } catch {}
      }
      if (!fileIds.length) {
        const text = e.dataTransfer.getData('text/plain');
        if (text) fileIds = [text];
      }
      if (!fileIds.length && draggedFileId) {
        fileIds = [draggedFileId];
      }

      if (fileIds.length > 0) {
        setFiles((prev) =>
          prev.map((f) =>
            fileIds.includes(f.id)
              ? { ...f, folderId: targetFolderId, subTabId: activeSubTabId }
              : f
          )
        );
        const folderName = targetFolderId
          ? folders.find((f) => f.id === targetFolderId)?.name || 'Folder'
          : 'Root';
        showToast(
          lang === 'te'
            ? `${fileIds.length} ఫైల్(లు) "${folderName}" కి తరలించబడ్డాయి`
            : `Moved ${fileIds.length} file(s) to ${folderName}`
        );
        setSelectedFileIds((prev) => prev.filter((id) => !fileIds.includes(id)));
        setDraggedFileId(null);
      }
    } catch {}
  };

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Alert modal state when source file was deleted or moved from hard disk / storage
  const [deletedFileAlert, setDeletedFileAlert] = useState<ExplorerFile | null>(null);

  const handleRestoreDeletedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (!chosen || !deletedFileAlert) return;

    try {
      await storeFileBlob(deletedFileAlert.blobKey || deletedFileAlert.id, chosen);
      setFiles((prev) =>
        prev.map((f) => (f.id === deletedFileAlert.id ? { ...f, size: chosen.size } : f))
      );
      showToast(
        lang === 'te'
          ? `ఫైల్ విజయవంతంగా పునరుద్ధరించబడింది: ${chosen.name}`
          : `File restored successfully: ${chosen.name}`
      );
      const restored = { ...deletedFileAlert, size: chosen.size };
      setDeletedFileAlert(null);
      setOpenFiles((prev) => (prev.some((f) => f.id === restored.id) ? prev : [...prev, restored]));
      setActiveFileId(restored.id);
    } catch (err) {
      console.error('Failed to restore file', err);
    }
  };

  // Persistence to IndexedDB
  // Clean up any legacy sample data from previous versions
  useEffect(() => {
    try {
      idbRemoveItem('dyn_explorer_files_v1');
      idbRemoveItem('dyn_explorer_folders_v1');
      idbRemoveItem('dyn_explorer_webapps_v1');
    } catch {}
  }, []);

  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEYS.SUB_TABS, subTabs);
    } catch {}
  }, [subTabs]);

  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEYS.ACTIVE_SUB_TAB, activeSubTabId);
    } catch {}
  }, [activeSubTabId]);

  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEYS.FOLDERS, folders);
    } catch {}
  }, [folders]);

  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEYS.WEB_APPS, webApps);
    } catch {}
  }, [webApps]);

  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEYS.FILES, files);
    } catch {}
  }, [files]);

  // When changing sub-tabs, reset folder navigation to root
  const handleSelectSubTab = (tabId: string) => {
    setActiveSubTabId(tabId);
    setCurrentFolderId(null);
  };

  // Breadcrumb path computation
  const breadcrumbPath = useMemo(() => {
    const path: ExplorerFolder[] = [];
    let curr = folders.find((f) => f.id === currentFolderId);
    while (curr) {
      path.unshift(curr);
      curr = folders.find((f) => f.id === curr?.parentFolderId);
    }
    return path;
  }, [currentFolderId, folders]);

  // Current folder object
  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;

  // Active sub-tab object
  const activeSubTab = subTabs.find((t) => t.id === activeSubTabId) || subTabs[0];

  // Multi-File Upload Handler (processes multiple files concurrently)
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    try {
      const filesArray = Array.from(fileList);
      showToast(lang === 'te' ? `${filesArray.length} ఫైల్స్ అప్‌లోడ్ అవుతున్నాయి...` : `Uploading ${filesArray.length} file(s)...`);

      const uploadPromises = filesArray.map(async (f, idx) => {
        const fileId = `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`;
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        const category = detectFileCategory(f.name, f.type);

        // Store binary blob in memory cache & IndexedDB for instant playback & viewing
        await storeFileBlob(fileId, f);

        // For files under 3 MB, also generate data URL backup so content is preserved
        let dataUrl: string | undefined = undefined;
        if (f.size < 3000000) {
          try {
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(f);
            });
          } catch {}
        }

        // Only read textPreview for actual plain text formats (NEVER for binary xlsx, docx, pdf, zip, etc.)
        let textPreview: string | undefined = undefined;
        const isPlainText = ['txt', 'csv', 'tsv', 'json', 'md', 'html', 'xml', 'log'].includes(ext);
        if (isPlainText && f.size < 500000) {
          try {
            textPreview = await f.text();
          } catch {}
        }

        const explorerFile: ExplorerFile = {
          id: fileId,
          name: f.name,
          extension: ext,
          category,
          mimeType: f.type || 'application/octet-stream',
          size: f.size,
          createdAt: new Date().toISOString(),
          folderId: currentFolderId,
          subTabId: activeSubTabId,
          blobKey: fileId,
          url: dataUrl || undefined,
          textPreview: textPreview?.slice(0, 5000),
          tags: [ext, category],
        };

        return explorerFile;
      });

      const newUploadedFiles = await Promise.all(uploadPromises);
      setFiles((prev) => [...newUploadedFiles, ...prev]);
      showToast(
        lang === 'te' 
          ? `${newUploadedFiles.length} ఫైల్స్ విజయవంతంగా అప్‌లోడ్ అయ్యాయి` 
          : `${newUploadedFiles.length} file(s) uploaded successfully at once!`
      );
    } catch (err) {
      console.error('Multi-file upload error', err);
      showToast(lang === 'te' ? 'ఫైల్స్ అప్‌లోడ్‌లో లోపం సంభవించింది' : 'Failed to upload some files');
    }
  };

  // Quick Note creation
  const handleCreateNote = () => {
    if (!noteTitle.trim()) return;

    const fileId = `note_${Date.now()}`;
    const fileName = noteTitle.endsWith('.txt') || noteTitle.endsWith('.md') ? noteTitle : `${noteTitle}.txt`;
    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
    const blob = new Blob([noteContent], { type: 'text/plain;charset=utf-8' });

    storeFileBlob(fileId, blob);

    const noteFile: ExplorerFile = {
      id: fileId,
      name: fileName,
      extension: ext,
      category: 'text',
      mimeType: 'text/plain',
      size: blob.size,
      createdAt: new Date().toISOString(),
      folderId: currentFolderId,
      subTabId: activeSubTabId,
      blobKey: fileId,
      textPreview: noteContent,
      tags: ['note', 'text'],
    };

    setFiles((prev) => [noteFile, ...prev]);
    setShowNoteModal(false);
    setNoteTitle('');
    setNoteContent('');
    showToast(lang === 'te' ? 'నోట్ ఫైల్ సృష్టించబడింది' : 'Note document created');
  };

  // Folder Operations
  const handleSaveFolder = (folderData: Partial<ExplorerFolder>) => {
    if (editingFolder) {
      setFolders((prev) =>
        prev.map((f) => (f.id === editingFolder.id ? { ...f, ...folderData } : f))
      );
      showToast(lang === 'te' ? 'ఫోల్డర్ అప్‌డేట్ చేయబడింది' : 'Folder updated');
    } else {
      const newFolder: ExplorerFolder = {
        id: `folder_${Date.now()}`,
        name: folderData.name || 'New Folder',
        color: folderData.color || 'blue',
        icon: folderData.icon || 'Folder',
        parentFolderId: folderData.parentFolderId !== undefined ? folderData.parentFolderId : currentFolderId,
        subTabId: activeSubTabId,
        createdAt: new Date().toISOString(),
        description: folderData.description || '',
      };
      setFolders((prev) => [newFolder, ...prev]);
      showToast(lang === 'te' ? 'కొత్త ఫోల్డర్ సృష్టించబడింది' : 'New folder created');
    }
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm(lang === 'te' ? 'ఈ ఫోల్డర్‌ను మరియు అందులోని అంశాలను తొలగించాలా?' : 'Are you sure you want to delete this folder?')) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parentFolderId !== folderId));
      // Move items in this folder to root or delete
      setFiles((prev) => prev.map((f) => (f.folderId === folderId ? { ...f, folderId: null } : f)));
      setWebApps((prev) => prev.map((a) => (a.folderId === folderId ? { ...a, folderId: null } : a)));
      if (currentFolderId === folderId) setCurrentFolderId(null);
      showToast(lang === 'te' ? 'ఫోల్డర్ తొలగించబడింది' : 'Folder deleted');
    }
  };

  // Web App Operations
  const handleSaveWebApp = (appData: Partial<WebAppItem>) => {
    if (editingWebApp) {
      setWebApps((prev) =>
        prev.map((a) =>
          a.id === editingWebApp.id
            ? {
                ...a,
                ...appData,
                customIconUrl: appData.customIconUrl !== undefined ? appData.customIconUrl : a.customIconUrl,
              }
            : a
        )
      );
      showToast(lang === 'te' ? 'వెబ్ యాప్ అప్‌డేట్ చేయబడింది' : 'Web App updated');
    } else {
      const newApp: WebAppItem = {
        id: `app_${Date.now()}`,
        name: appData.name || 'New Web App',
        url: appData.url || 'https://google.com',
        icon: appData.icon || '🌐',
        customIconUrl: appData.customIconUrl,
        description: appData.description || '',
        subTabId: activeSubTabId,
        folderId: appData.folderId !== undefined ? appData.folderId : currentFolderId,
        launchMode: appData.launchMode || 'new_tab',
        category: appData.category || 'General',
        isPreloaded: false,
        source: 'user',
        createdAt: new Date().toISOString(),
      };
      setWebApps((prev) => [newApp, ...prev]);
      showToast(lang === 'te' ? 'వెబ్ యాప్ విజయవంతంగా జోడించబడింది' : 'Web App added successfully');
    }
    setEditingWebApp(null);
  };

  const handleDeleteWebApp = (appId: string) => {
    setWebApps((prev) => prev.filter((a) => a.id !== appId));
    showToast(lang === 'te' ? 'వెబ్ యాప్ తొలగించబడింది' : 'Web App removed');
  };

  // File Operations
  const handleDeleteFile = async (fileId: string) => {
    if (confirm(lang === 'te' ? 'ఈ ఫైల్‌ను తొలగించాలా?' : 'Delete this file?')) {
      await deleteFileBlob(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      showToast(lang === 'te' ? 'ఫైల్ తొలగించబడింది' : 'File deleted');
    }
  };

  // Open File with Source Availability Verification - Checks storage BEFORE opening
  const handleOpenFile = async (file: ExplorerFile) => {
    try {
      const blob = await getFileBlob(file.blobKey || file.id);
      const isBinary = ['xlsx', 'xls', 'docx', 'doc', 'pdf', 'ppt', 'pptx', 'mp4', 'webm', 'mp3', 'wav', 'png', 'jpg', 'jpeg'].includes(
        file.extension.toLowerCase()
      );
      const hasContent = Boolean(blob || file.url || (file.textPreview && file.textPreview.trim() && !isBinary));

      if (!hasContent) {
        // File source was deleted or moved from hard disk / storage
        setDeletedFileAlert(file);
        showToast(
          lang === 'te'
            ? `⚠️ ఫైల్ డిలీట్ అయింది: హార్డ్ డిస్క్ లేదా డివైస్ స్టోరేజ్‌లో ఫైల్ లేదు.`
            : `⚠️ File was deleted or moved from hard disk / device storage.`
        );
        return; // DO NOT open viewer modal
      }
    } catch {
      // ignore
    }
    setOpenFiles((prev) => {
      // 🎵 Single Player Window Policy for Audio & Video to prevent sound disturbance and duplicate windows
      if (file.category === 'audio') {
        const withoutAudio = prev.filter((f) => !('category' in f && f.category === 'audio'));
        return [...withoutAudio, file];
      }
      if (file.category === 'video') {
        const withoutVideo = prev.filter((f) => !('category' in f && f.category === 'video'));
        return [...withoutVideo, file];
      }
      return prev.some((f) => f.id === file.id) ? prev : [...prev, file];
    });
    setActiveFileId(file.id);
  };

  const handleCloseFileWindow = (fileId: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.id !== fileId));
    setActiveFileId((current) => (current === fileId ? null : current));
  };

  const handleToggleFileWindow = (fileId: string) => {
    setActiveFileId((current) => (current === fileId ? null : fileId));
  };

  const handleToggleFavoriteFile = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f))
    );
  };

  const handleToggleFavoriteWebApp = (appId: string) => {
    setWebApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, isFavorite: !a.isFavorite } : a))
    );
  };

  // Move Item Handler
  const handleConfirmMove = (targetFolderId: string | null, targetSubTabId: string) => {
    if (!moveModalItem) return;

    if (moveModalItem.type === 'file') {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === moveModalItem.item.id
            ? { ...f, folderId: targetFolderId, subTabId: targetSubTabId }
            : f
        )
      );
    } else if (moveModalItem.type === 'folder') {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === moveModalItem.item.id
            ? { ...f, parentFolderId: targetFolderId, subTabId: targetSubTabId }
            : f
        )
      );
    } else if (moveModalItem.type === 'webapp') {
      setWebApps((prev) =>
        prev.map((a) =>
          a.id === moveModalItem.item.id
            ? { ...a, folderId: targetFolderId, subTabId: targetSubTabId }
            : a
        )
      );
    }

    showToast(lang === 'te' ? 'అంశం విజయవంతంగా తరలించబడింది' : 'Item moved successfully');
  };

  // Sub-Tab Management
  const handleAddSubTab = (newSubTab: Omit<ExplorerSubTab, 'id' | 'order'>) => {
    const id = `subtab_${Date.now()}`;
    const order = subTabs.length;
    setSubTabs((prev) => [...prev, { ...newSubTab, id, order }]);
    setActiveSubTabId(id);
    showToast(lang === 'te' ? 'కొత్త సబ్-ట్యాబ్ జోడించబడింది' : 'New sub-tab created');
  };

  const handleUpdateSubTab = (id: string, updates: Partial<ExplorerSubTab>) => {
    setSubTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    showToast(lang === 'te' ? 'సబ్-ట్యాబ్ అప్‌డేట్ చేయబడింది' : 'Sub-tab updated');
  };

  const handleDeleteSubTab = (id: string) => {
    if (isSystemSubTab(id)) {
      showToast(lang === 'te' ? 'సిస్టమ్ సబ్-ట్యాబ్‌ను తొలగించలేరు' : 'System sub-tabs cannot be deleted');
      return;
    }
    setSubTabs((prev) => prev.filter((t) => t.id !== id));
    // move items in that subtab to default folders_files
    setFiles((prev) => prev.map((f) => (f.subTabId === id ? { ...f, subTabId: 'folders_files' } : f)));
    setFolders((prev) => prev.map((f) => (f.subTabId === id ? { ...f, subTabId: 'folders_files' } : f)));
    setWebApps((prev) => prev.map((a) => (a.subTabId === id ? { ...a, subTabId: 'folders_files' } : a)));
    if (activeSubTabId === id) setActiveSubTabId('folders_files');
    showToast(lang === 'te' ? 'సబ్-ట్యాబ్ తొలగించబడింది' : 'Sub-tab deleted');
  };

  // FILTER & SEARCH LOGIC
  const isSearchActive = searchQuery.trim().length > 0;

  // 1. Folders in current context
  const filteredFolders = useMemo(() => {
    let list = folders;

    // Filter by subtab
    if (activeSubTabId !== 'all') {
      list = list.filter((f) => f.subTabId === activeSubTabId);
    }

    // If searching, search across all folders in current subtab; otherwise only in current folder level
    if (isSearchActive) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
    } else {
      list = list.filter((f) => f.parentFolderId === currentFolderId);
    }

    return list;
  }, [folders, activeSubTabId, currentFolderId, searchQuery, isSearchActive]);

  // 2. Web Apps in current context (strictly respect folder containment & App Store category)
  const filteredWebApps = useMemo(() => {
    let list = webApps;

    // Filter by active subtab
    list = list.filter((a) => a.subTabId === activeSubTabId);

    // Strict Folder Containment:
    // When searching, search across all folders in current subtab;
    // Otherwise:
    // - In Root (currentFolderId === null): only show web apps placed in Root (no folder)
    // - Inside a Folder (currentFolderId !== null): only show web apps placed inside that specific folder!
    if (!isSearchActive) {
      if (currentFolderId === null) {
        list = list.filter((a) => !a.folderId || a.folderId === 'root');
      } else {
        list = list.filter((a) => a.folderId === currentFolderId);
      }
    }

    // App Store Category Filter (1. Pre-loaded vs 2. User Manually Added)
    if (activeSubTabId === 'web_apps' && appStoreCategory !== 'all') {
      if (appStoreCategory === 'preloaded') {
        list = list.filter((a) => a.isPreloaded || a.source === 'preloaded');
      } else if (appStoreCategory === 'user') {
        list = list.filter((a) => !a.isPreloaded && a.source !== 'preloaded');
      }
    }

    // Filter Type
    if (filterType === 'favorites') {
      list = list.filter((a) => a.isFavorite);
    } else if (filterType === 'folders' || filterType === 'documents' || filterType === 'media' || filterType === 'audio' || filterType === 'video' || filterType === 'images') {
      list = [];
    }

    // Search Query
    if (isSearchActive) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.url.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [webApps, activeSubTabId, currentFolderId, appStoreCategory, filterType, searchQuery, isSearchActive]);

  // 3. Files in current context
  const filteredFiles = useMemo(() => {
    let list = files;

    // Sub-tab filtering
    if (activeSubTabId === 'documents') {
      list = list.filter((f) => ['word', 'excel', 'pdf', 'ppt', 'text'].includes(f.category));
    } else if (activeSubTabId === 'media_hub') {
      list = list.filter((f) => ['audio', 'video', 'image'].includes(f.category));
    } else if (activeSubTabId === 'web_apps') {
      // in web_apps subtab, only show files specifically in this subtab
      list = list.filter((f) => f.subTabId === 'web_apps');
    } else {
      // regular subtab or folders_files
      list = list.filter((f) => f.subTabId === activeSubTabId);
    }

    // Folder location (unless searching globally)
    if (!isSearchActive && activeSubTabId !== 'documents' && activeSubTabId !== 'media_hub') {
      list = list.filter((f) => f.folderId === currentFolderId);
    }

    // Filter Type Chips
    if (filterType === 'documents') {
      list = list.filter((f) => ['word', 'excel', 'pdf', 'ppt', 'text'].includes(f.category));
    } else if (filterType === 'media') {
      list = list.filter((f) => ['audio', 'video', 'image'].includes(f.category));
    } else if (filterType === 'audio') {
      list = list.filter((f) => f.category === 'audio');
    } else if (filterType === 'video') {
      list = list.filter((f) => f.category === 'video');
    } else if (filterType === 'images') {
      list = list.filter((f) => f.category === 'image');
    } else if (filterType === 'favorites') {
      list = list.filter((f) => f.isFavorite);
    } else if (filterType === 'folders' || filterType === 'webapps') {
      list = [];
    }

    // Search Query
    if (isSearchActive) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.extension.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      if (sortOption === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOption === 'size_desc') return b.size - a.size;
      if (sortOption === 'size_asc') return a.size - b.size;
      if (sortOption === 'type') return a.category.localeCompare(b.category);
      return 0;
    });

    return list;
  }, [files, activeSubTabId, currentFolderId, filterType, searchQuery, isSearchActive, sortOption]);

  // 4. Filtered Registers for app_registers sub-tab
  const filteredRegisters = useMemo(() => {
    if (!registers || registers.length === 0) return [];
    if (!registerSearch.trim()) return registers;
    const q = registerSearch.toLowerCase();
    return registers.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.titleTe && r.titleTe.toLowerCase().includes(q)) ||
        r.columns.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.nameTe && c.nameTe.toLowerCase().includes(q))
        )
    );
  }, [registers, registerSearch]);

  // Total items count
  const totalItemCount = filteredFolders.length + filteredWebApps.length + filteredFiles.length;

  // Helper: File Icon Resolver
  const renderFileIcon = (file: ExplorerFile, size = 'md') => {
    const iconSize = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
    switch (file.category) {
      case 'pdf':
        return <FileText className={`${iconSize} text-red-400`} />;
      case 'excel':
        return <FileSpreadsheet className={`${iconSize} text-emerald-400`} />;
      case 'word':
        return <FileText className={`${iconSize} text-blue-400`} />;
      case 'ppt':
        return <FileText className={`${iconSize} text-orange-400`} />;
      case 'audio':
        return <Music className={`${iconSize} text-purple-400`} />;
      case 'video':
        return <Film className={`${iconSize} text-amber-400`} />;
      case 'image':
        return <ImageIcon className={`${iconSize} text-pink-400`} />;
      case 'code':
        return <FileCode className={`${iconSize} text-cyan-400`} />;
      case 'text':
        return <FileText className={`${iconSize} text-zinc-300`} />;
      default:
        return <File className={`${iconSize} text-zinc-400`} />;
    }
  };

  return (
    <div className={`w-full flex-1 flex flex-col overflow-hidden relative transition-colors ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#121214] text-white'
    }`}>
      {/* Hidden Multi-File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleUploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 1. Colorful Sub-Tabs Bar (Local Files, App Store, Digital Classes, App Tables & Registers, Custom Sub-Tabs) */}
      <div className={`w-full px-3 sm:px-6 pt-3 pb-2.5 border-b flex items-center justify-between gap-3 overflow-x-auto scrollbar-thin ${
        isLight
          ? 'bg-white border-slate-200 shadow-xs'
          : 'bg-gradient-to-r from-[#16161a] via-[#1a1924] to-[#16161a] border-white/10'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {/* Home Hub Badge */}
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold shrink-0 select-none ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border-purple-500/30 text-amber-200'
          }`}>
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="tracking-wide">HOME HUB</span>
          </div>

          {subTabs.map((tab) => {
            const isActive = activeSubTabId === tab.id;
            let activeClass = 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/40';
            let inactiveClass = isLight
              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 shadow-xs'
              : 'bg-[#1c1c20] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10';
            let iconElement = <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isLight ? 'text-blue-600' : 'text-blue-400'}`} />;

            if (tab.id === 'folders_files') {
              activeClass = 'bg-[#0a84ff] text-white shadow-lg shadow-blue-500/30 border border-blue-300/50';
              inactiveClass = isLight
                ? 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-300 shadow-xs'
                : 'bg-[#181a24] text-zinc-300 hover:text-white hover:bg-blue-500/15 border border-blue-500/25 hover:border-blue-400/50';
              iconElement = <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isLight ? 'text-blue-600' : 'text-blue-400'}`} />;
            } else if (tab.id === 'web_apps') {
              activeClass = 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-300/50';
              inactiveClass = isLight
                ? 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-300 shadow-xs'
                : 'bg-[#16221c] text-zinc-300 hover:text-white hover:bg-emerald-500/15 border border-emerald-500/25 hover:border-emerald-400/50';
              iconElement = <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />;
            } else if (tab.id === 'digital_classes') {
              activeClass = 'bg-[#ff0000] text-white shadow-lg shadow-red-600/35 border border-red-300/50';
              inactiveClass = isLight
                ? 'bg-white hover:bg-red-50 text-slate-800 border border-slate-300 shadow-xs'
                : 'bg-[#241618] text-zinc-300 hover:text-white hover:bg-red-500/15 border border-red-500/25 hover:border-red-400/50';
              iconElement = <Youtube className={`w-3.5 h-3.5 fill-current ${isActive ? 'text-white' : isLight ? 'text-red-600' : 'text-red-500'}`} />;
            } else if (tab.id === 'app_registers') {
              activeClass = 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 border border-purple-300/50';
              inactiveClass = isLight
                ? 'bg-white hover:bg-purple-50 text-slate-800 border border-slate-300 shadow-xs'
                : 'bg-[#1f1627] text-zinc-300 hover:text-white hover:bg-purple-500/15 border border-purple-500/25 hover:border-purple-400/50';
              iconElement = <Table2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isLight ? 'text-purple-600' : 'text-purple-400'}`} />;
            } else {
              activeClass = 'text-white shadow-lg border border-white/40';
              inactiveClass = isLight
                ? 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs'
                : 'bg-[#1c1c20] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10';
              iconElement = (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? '#ffffff' : tab.color }}
                />
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectSubTab(tab.id)}
                style={isActive && !isSystemSubTab(tab.id) ? { backgroundColor: tab.color } : undefined}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                {iconElement}
                <span>{lang === 'te' && tab.nameTe ? tab.nameTe : tab.name}</span>
              </button>
            );
          })}

          {/* Manage Sub-Tabs Button */}
          <button
            type="button"
            onClick={() => setIsManageTabsModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isLight
                ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 shadow-xs'
                : 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 border-purple-500/30 hover:border-purple-400/60 text-purple-300 hover:text-white'
            }`}
            title="Add, Edit or Delete Sub-Tabs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'te' ? 'సబ్-ట్యాబ్‌లు నిర్వహణ' : 'Manage Sub-Tabs'}</span>
          </button>
        </div>

        {/* Storage Stats Snippet */}
        <div className={`hidden lg:flex items-center gap-3 text-[11px] font-mono shrink-0 ${
          isLight ? 'text-slate-500' : 'text-zinc-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <HardDrive className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
            <span>Active</span>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>•</span>
          <span>{files.length} Files</span>
          <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>•</span>
          <span>{webApps.length} Apps</span>
        </div>
      </div>

      {/* 2. Top Navigation Bar: Line 1 (Dedicated Address Bar) & Line 2 (Search, Filters & Actions) */}
      {activeSubTabId !== 'digital_classes' && (
        <div className="w-full flex flex-col">
          {/* ========================================================
              LINE 1: DEDICATED FULL-WIDTH ADDRESS BAR (ROOT & BREADCRUMBS)
              ======================================================== */}
          <div className={`w-full px-3 sm:px-6 py-2 border-b flex items-center justify-between gap-3 overflow-x-auto shadow-xs ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121215] border-white/10'
          }`}>
            {/* Breadcrumb Path & Root Drop Target */}
            <div className="flex items-center gap-1.5 text-xs flex-1 min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 hidden sm:inline ${
                isLight ? 'text-slate-500' : 'text-zinc-500'
              }`}>
                Address:
              </span>

              {/* Root Directory Button (Also acts as Drop Target to drag files into Root) */}
              <button
                type="button"
                onClick={() => setCurrentFolderId(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => handleDropOnFolder(null, e)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 border ${
                  currentFolderId === null
                    ? isLight
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                      : 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                    : isLight
                      ? 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                      : 'bg-white/5 text-zinc-300 hover:text-white border-white/10 hover:bg-white/10'
                }`}
                title="Root Directory (Drop here to move files to Root)"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'రూట్ (Root)' : 'Root'}</span>
              </button>

              {breadcrumbPath.map((folder, idx) => {
                const isLast = idx === breadcrumbPath.length - 1;
                return (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-slate-400' : 'text-zinc-600'}`} />
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(folder.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => handleDropOnFolder(folder.id, e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer truncate max-w-[200px] border ${
                        isLast
                          ? isLight
                            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                            : 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                          : isLight
                            ? 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                            : 'bg-white/5 text-zinc-300 hover:text-white border-white/10 hover:bg-white/10'
                      }`}
                      title={`${folder.name} (Drop here to move into this folder)`}
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Address Bar Right: Item Counter & Bulk Selection status */}
            <div className="flex items-center gap-2 shrink-0 text-xs">
              {filteredFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectAllFiles(filteredFiles)}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                    selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0
                      ? 'bg-blue-600 text-white border-blue-500'
                      : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                  }`}
                  title="Toggle Select All files in view"
                >
                  {selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              )}
              <span className={`text-[11px] font-mono px-2 py-1 rounded-lg ${
                isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-zinc-400'
              }`}>
                {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
              </span>
            </div>
          </div>

          {/* ========================================================
              LINE 2: SEARCH, FILTERS, VIEW MODES & ACTION CONTROLS
              ======================================================== */}
          <div className={`w-full px-3 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#161619] border-white/10'
          }`}>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'te' ? 'ఫైల్స్, వెబ్ యాప్స్ శోధించండి...' : 'Search files, apps, tags...'}
                className={`w-full pl-9 pr-7 py-1.5 rounded-xl text-xs transition-colors ${
                  isLight
                    ? 'bg-slate-100 border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white'
                    : 'bg-[#1c1c1f] border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'}`}
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick Filter Select */}
            <div className={`flex items-center gap-1 rounded-xl p-0.5 border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#1c1c1f] border-white/10'
            }`}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ExplorerFilterType)}
                className={`bg-transparent text-xs px-2 py-1 focus:outline-none cursor-pointer ${
                  isLight ? 'text-slate-700' : 'text-zinc-300'
                }`}
              >
                <option value="all">All Types</option>
                <option value="documents">📄 Documents</option>
                <option value="media">🎬 Media</option>
                <option value="audio">🎵 Audio</option>
                <option value="video">📹 Video</option>
                <option value="images">🖼️ Images</option>
                <option value="webapps">🌐 Web Apps</option>
                <option value="favorites">⭐ Starred</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className={`flex items-center gap-1 rounded-xl p-0.5 border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#1c1c1f] border-white/10'
            }`}>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as ExplorerSortOption)}
                className={`bg-transparent text-xs px-2 py-1 focus:outline-none cursor-pointer font-sans ${
                  isLight ? 'text-slate-700' : 'text-zinc-300'
                }`}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name (A - Z)</option>
                <option value="name_desc">Name (Z - A)</option>
                <option value="size_desc">Size (Largest)</option>
                <option value="type">File Type</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl p-0.5 border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#1c1c1f] border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs' : 'bg-white/15 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs' : 'bg-white/15 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary Action: + Folder */}
            <button
              type="button"
              onClick={() => {
                setEditingFolder(null);
                setIsFolderModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-[#202024] hover:bg-[#28282c] border-white/15 text-white'
              }`}
              title="Create New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">{lang === 'te' ? '+ ఫోల్డర్' : '+ Folder'}</span>
            </button>

            {/* Primary Action: + Web App */}
            <button
              type="button"
              onClick={() => {
                setEditingWebApp(null);
                setIsWebAppModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300 hover:text-white'
              }`}
              title="Add Web Link as App"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{lang === 'te' ? '+ వెబ్ యాప్' : '+ Web App'}</span>
            </button>

            {/* Primary Action: 📤 Upload Multiple Files */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0a84ff] hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/25 active:scale-95"
              title="Upload multiple files at a time (Hold Ctrl or Shift to select multiple files)"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>{lang === 'te' ? 'ఫైల్స్ అప్‌లోడ్ (Multiple)' : 'Upload Multiple Files'}</span>
            </button>

            {/* Quick Note creation button */}
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className={`flex items-center gap-1 p-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white border-transparent'
              }`}
              title="Create Quick Note document"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ========================================================
              BULK FILE SELECTION ACTION BAR (Visible when files are checked)
              ======================================================== */}
          {selectedFileIds.length > 0 && (
            <div className={`w-full px-3 sm:px-6 py-2 border-b flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-950' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-bold">
                  {selectedFileIds.length} {selectedFileIds.length === 1 ? 'file' : 'files'} selected
                </span>
                <span className="text-[11px] opacity-75 hidden md:inline">
                  (Drag to drop on any folder or Root, or use action buttons)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkMoveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Move to...</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                    isLight ? 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2.5 Dedicated App Store Category Filter Bar (1. Pre-loaded Web Apps vs 2. User Manually Added) */}
      {activeSubTabId === 'web_apps' && (
        <div className={`w-full px-3 sm:px-6 py-2 border-b flex items-center justify-between gap-3 flex-wrap ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#161619] border-white/10'
        }`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-bold uppercase tracking-wider mr-1 hidden sm:inline ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              {lang === 'te' ? 'విభాగం:' : 'Categories:'}
            </span>
            <button
              type="button"
              onClick={() => setAppStoreCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                appStoreCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                  : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {lang === 'te' ? 'అన్ని యాప్‌లు' : 'All Web Apps'} ({webApps.filter((a) => a.subTabId === 'web_apps').length})
            </button>
            <button
              type="button"
              onClick={() => setAppStoreCategory('preloaded')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                appStoreCategory === 'preloaded'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 border border-amber-400/40'
                  : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <span>⚡</span>
              <span>{lang === 'te' ? '1. ప్రీ-లోడెడ్ యాప్‌లు (Developer)' : '1. Pre-Loaded Apps'}</span>
              <span className="text-[10px] opacity-80">
                ({webApps.filter((a) => a.subTabId === 'web_apps' && (a.isPreloaded || a.source === 'preloaded')).length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAppStoreCategory('user')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                appStoreCategory === 'user'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40'
                  : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <span>👤</span>
              <span>{lang === 'te' ? '2. యూజర్ యాప్‌లు (Manual)' : '2. User Added Apps'}</span>
              <span className="text-[10px] opacity-80">
                ({webApps.filter((a) => a.subTabId === 'web_apps' && !a.isPreloaded && a.source !== 'preloaded').length})
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingWebApp(null);
                setIsWebAppModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 shadow-xs'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? '+ కొత్త యాప్ జోడించండి' : '+ Add Web App'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Explorer Content Area (Drag & Drop Zone) */}
      <div
        className={`flex-1 min-h-[500px] p-4 sm:p-6 overflow-y-auto custom-scrollbar relative ${
          isDraggingOver ? 'bg-blue-900/15 ring-2 ring-blue-500 ring-inset' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          handleUploadFiles(e.dataTransfer.files);
        }}
      >
        {/* Drag Overlay Hint */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-blue-600/20 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none">
            <Upload className="w-12 h-12 text-blue-400 animate-bounce mb-3" />
            <span className="text-base font-bold text-white">Drop files to upload multiple files into {currentFolder?.name || 'Root'}</span>
          </div>
        )}

        {/* Digital Classes (NewGen eEducation Channel) Dedicated Sub-Tab */}
        {activeSubTabId === 'digital_classes' ? (
          <DigitalClassesView lang={lang} currentTheme={currentTheme} />
        ) : activeSubTabId === 'app_registers' ? (
          <div className="space-y-6">
            {/* Header Banner & Stats */}
            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl transition-colors ${
              isLight
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200 text-slate-800'
                : 'bg-gradient-to-r from-[#16231c] via-[#1c1c22] to-[#141416] border-emerald-500/30 text-white'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40">
                  <Table2 className="w-6 h-6 stroke-[2.3]" />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>{lang === 'te' ? 'యాప్ టేబుల్స్ & రిజిస్టర్లు' : 'App Tables & Registers'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                      {registers.length}
                    </span>
                  </h3>
                  <p className={`text-xs mt-0.5 leading-relaxed max-w-xl ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    {lang === 'te'
                      ? 'అనలిటిక్స్ గ్రిడ్‌లో ఇంపోర్ట్ చేయబడిన అన్ని స్ప్రెడ్‌షీట్ టేబుల్స్ మరియు రిజిస్టర్ల వివరాలు ఇక్కడ ఉన్నాయి. నేరుగా డేటా టేబుల్, పివొట్ లేదా లుకప్‌లో ఓపెన్ చేసుకోండి.'
                      : 'All spreadsheet tables, student admission reports, and form registers currently active in the application.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'te' ? 'కొత్త ఎక్సెల్ ఇంపోర్ట్' : 'Import New Excel'}</span>
                </button>
              </div>
            </div>

            {/* Filter Search Input */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`} />
                <input
                  type="text"
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  placeholder={lang === 'te' ? 'టేబుల్ పేరు లేదా కాలమ్ ద్వారా వెతకండి...' : 'Filter tables by name or column...'}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs transition-colors ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500'
                      : 'bg-[#1c1c1f] border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500'
                  }`}
                />
              </div>
              <span className={`text-xs font-mono hidden sm:inline ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Showing {filteredRegisters.length} of {registers.length} tables
              </span>
            </div>

            {/* Registers Grid */}
            {filteredRegisters.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#18181b] border-white/10 text-white'
              }`}>
                <Table2 className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-zinc-600'}`} />
                <h4 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {lang === 'te' ? 'టేబుల్స్ ఏవీ కనుగొనబడలేదు' : 'No Registers Found'}
                </h4>
                <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {lang === 'te'
                    ? 'ఎక్సెల్ ఫైల్‌ను అప్‌లోడ్ చేసి డేటా టేబుల్‌గా ఇంపోర్ట్ చేసుకోండి.'
                    : 'Import an Excel file to create your first dynamic table register.'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Import Excel Spreadsheet
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRegisters.map((reg) => {
                  const isActive = reg.id === activeRegId;
                  return (
                    <div
                      key={reg.id}
                      className={`rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col justify-between border ${
                        isLight
                          ? isActive
                            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-400'
                          : isActive
                            ? 'bg-[#1c1c1f] hover:bg-[#222226] border-emerald-500/50 ring-1 ring-emerald-500/30'
                            : 'bg-[#1c1c1f] hover:bg-[#222226] border-white/10 hover:border-emerald-500/30'
                      }`}
                    >
                      <div>
                        {/* Top Row: Icon + Badges */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <Table2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4
                                className={`text-xs sm:text-sm font-extrabold truncate max-w-[200px] ${isLight ? 'text-slate-900' : 'text-white'}`}
                                title={reg.title}
                              >
                                {reg.title}
                              </h4>
                              {reg.titleTe && (
                                <p className={`text-[11px] truncate max-w-[200px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{reg.titleTe}</p>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Counts & Stats */}
                        <div className={`flex items-center gap-2 mb-3 text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          <span className={`px-2 py-0.5 rounded-md font-semibold ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-zinc-300'}`}>
                            {reg.rows.length} Rows
                          </span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded-md font-semibold ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-zinc-300'}`}>
                            {reg.columns.length} Columns
                          </span>
                        </div>

                        {/* Column Pills Preview */}
                        <div className="mb-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                            Columns Preview:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-hidden">
                            {reg.columns.slice(0, 5).map((col) => (
                              <span
                                key={col.id}
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-mono truncate max-w-[120px] ${
                                  isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#141416] border-white/10 text-zinc-300'
                                }`}
                                title={col.name}
                              >
                                {col.name}
                              </span>
                            ))}
                            {reg.columns.length > 5 && (
                              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                                +{reg.columns.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className={`pt-3 border-t flex items-center justify-between gap-1.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectRegister?.(reg.id);
                            onNavigateToTab?.('register');
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Open in Data Table"
                        >
                          <Table2 className="w-3.5 h-3.5" />
                          <span>Data Table</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectRegister?.(reg.id);
                            onNavigateToTab?.('pivot');
                          }}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white border-transparent'
                          }`}
                          title="Open in Pivot Table"
                        >
                          <SplitSquareVertical className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectRegister?.(reg.id);
                            onNavigateToTab?.('lookup_studio');
                          }}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white border-transparent'
                          }`}
                          title="Open in Lookup Studio"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => exportRegisterToExcelOrCSV({ register: reg, format: 'xlsx' })}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white border-transparent'
                          }`}
                          title="Export to Excel (.xlsx)"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {onRenameRegister && (
                          <button
                            type="button"
                            onClick={() => setRegisterToRename(reg)}
                            className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                : 'bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white border-transparent'
                            }`}
                            title={lang === 'te' ? 'రిజిస్టర్ పేరు మార్చండి' : 'Rename Register'}
                          >
                            <Edit2 className="w-4 h-4 text-amber-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : totalItemCount === 0 ? (
          <div className={`flex-1 h-full min-h-[420px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#18181b] border-white/10 text-white'
          }`}>
            <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-xl ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <FolderPlus className="w-8 h-8" />
            </div>
            <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentFolderId !== null
                ? (lang === 'te' ? 'ఈ ఫోల్డర్ ఖాళీగా ఉంది' : 'This Folder is Empty')
                : (lang === 'te' ? 'ఎక్స్‌ప్లోరర్ ఖాళీగా ఉంది' : 'Explorer is Ready & Clean')}
            </h3>
            <p className={`text-xs max-w-md mb-6 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              {currentFolderId !== null
                ? (lang === 'te'
                    ? 'మీరు ఈ ఫోల్డర్‌లోకి ఫైల్స్ లేదా వెబ్ యాప్‌లను తరలించవచ్చు, లేదా కింద ఉన్న బటన్ల ద్వారా నేరుగా ఇక్కడే కొత్తవి జోడించవచ్చు.'
                    : 'You can move files or web apps into this folder, or add new ones directly inside this folder using the actions below.')
                : (lang === 'te'
                    ? 'ఒకేసారి ఎన్ని ఫైల్స్ అయినా (Word, Excel, PDF, PPT, ఆడియో, వీడియో) అప్‌లోడ్ చేసుకోండి. ఆడియో & వీడియోలు ఇక్కడే లోకల్‌గా ప్లే అవుతాయి, వెబ్ యాప్స్ నేరుగా మీ బ్రౌజర్‌లో ఓపెన్ అవుతాయి.'
                    : 'Upload multiple files at once (Word, Excel, PDF, PPT, Audio, Video). Media files play locally, and web apps launch directly in your browser.')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingWebApp(null);
                  setIsWebAppModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{currentFolderId !== null ? '+ Add Web App in this Folder' : 'Add Web App'}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-[#0a84ff] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Multiple Files</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-white/10 hover:bg-white/15 text-white border-transparent'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                <span>Create Sub-Folder</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================
             GRID VIEW: Folders, Web Apps, Files
             ======================================================== */
          <div className="space-y-6">
            
            {/* 1. Folders Section */}
            {filteredFolders.length > 0 && (
              <div>
                <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  <span>{lang === 'te' ? 'ఫోల్డర్లు' : 'Folders'} ({filteredFolders.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredFolders.map((folder) => {
                    const itemCount =
                      files.filter((f) => f.folderId === folder.id).length +
                      webApps.filter((a) => a.folderId === folder.id).length;
                    return (
                      <div
                        key={folder.id}
                        onDoubleClick={() => setCurrentFolderId(folder.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => handleDropOnFolder(folder.id, e)}
                        className={`group relative rounded-2xl p-3.5 transition-all shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between border ${
                          isLight
                            ? 'bg-white hover:bg-blue-50/50 border-slate-200 hover:border-blue-400 text-slate-800'
                            : 'bg-[#1c1c1f] hover:bg-[#242428] border-white/10 hover:border-blue-500/40 text-white'
                        }`}
                        title={`${folder.name} (Drop dragged files here to move into this folder)`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                          >
                            <Folder className="w-5 h-5 fill-current" />
                          </div>

                          {/* Options Menu */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                                setIsFolderModalOpen(true);
                              }}
                              className={`p-1 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                              title="Rename / Edit Folder"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveModalItem({ item: folder, type: 'folder' });
                              }}
                              className={`p-1 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600' : 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'}`}
                              title="Move Folder"
                            >
                              <FolderInput className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              className={`p-1 rounded-lg ${isLight ? 'hover:bg-red-50 text-slate-500 hover:text-red-600' : 'hover:bg-white/10 text-zinc-400 hover:text-red-400'}`}
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div onClick={() => setCurrentFolderId(folder.id)}>
                          <h4 className={`text-xs font-bold truncate transition-colors ${
                            isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-white group-hover:text-blue-400'
                          }`}>
                            {folder.name}
                          </h4>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Web Apps Section */}
            {filteredWebApps.length > 0 && (
              <div>
                <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>{lang === 'te' ? 'వెబ్ యాప్స్' : 'Web Apps'} ({filteredWebApps.length})</span>
                    {activeSubTabId === 'web_apps' && appStoreCategory !== 'all' && (
                      <span className={`text-[10px] font-normal lowercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        • {appStoreCategory === 'preloaded' ? 'Pre-Loaded only' : 'User Added only'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredWebApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => {
                        window.open(app.url, '_blank', 'noopener,noreferrer');
                      }}
                      className={`group relative rounded-2xl p-4 transition-all shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between border ${
                        isLight
                          ? 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-400 text-slate-800'
                          : 'bg-[#1c1c1f] hover:bg-[#242428] border-white/10 hover:border-emerald-500/40 text-white'
                      }`}
                      title={lang === 'te' ? 'బ్రౌజర్‌లో నేరుగా తెరవడానికి క్లిక్ చేయండి' : 'Click to launch directly in browser tab'}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-xs overflow-hidden border border-emerald-500/20">
                          {app.customIconUrl ? (
                            <img src={app.customIconUrl} alt={app.name} className="w-8 h-8 object-contain rounded-lg" />
                          ) : (
                            <span>{app.icon || '🌐'}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavoriteWebApp(app.id);
                            }}
                            className={`p-1 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-amber-500' : 'hover:bg-white/10 text-zinc-400 hover:text-amber-400'}`}
                            title="Favorite"
                          >
                            <Star className={`w-3.5 h-3.5 ${app.isFavorite ? 'text-amber-500 fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWebApp(app);
                              setIsWebAppModalOpen(true);
                            }}
                            className={`p-1 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                            title="Edit Web App"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveModalItem({ item: app, type: 'webapp' });
                            }}
                            className={`p-1 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600' : 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'}`}
                            title="Move Web App to Folder"
                          >
                            <FolderInput className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWebApp(app.id);
                            }}
                            className={`p-1 rounded-lg ${isLight ? 'hover:bg-red-50 text-slate-500 hover:text-red-600' : 'hover:bg-white/10 text-zinc-400 hover:text-red-400'}`}
                            title="Delete Web App"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className={`text-xs font-bold truncate transition-colors ${
                            isLight ? 'text-slate-900 group-hover:text-emerald-600' : 'text-white group-hover:text-emerald-400'
                          }`}>
                            {app.name}
                          </h4>
                          <ExternalLink className="w-3 h-3 text-emerald-500 shrink-0" />
                        </div>
                        <p className={`text-[11px] truncate mb-2 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          {app.description || app.url}
                        </p>
                        <div className={`flex items-center justify-between text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {app.isPreloaded || app.source === 'preloaded' ? (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                isLight ? 'text-amber-800 bg-amber-100 border-amber-300' : 'text-amber-300 bg-amber-500/15 border-amber-500/25'
                              }`}>
                                Pre-Loaded
                              </span>
                            ) : (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                isLight ? 'text-blue-800 bg-blue-100 border-blue-300' : 'text-blue-300 bg-blue-500/15 border-blue-500/25'
                              }`}>
                                User Added
                              </span>
                            )}
                            <span className="truncate max-w-[80px]">{app.category || 'General'}</span>
                          </div>
                          <span className="text-emerald-600 font-medium flex items-center gap-1 font-mono">
                            <ExternalLink className="w-2.5 h-2.5" />
                            Browser
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Files Section */}
            {filteredFiles.length > 0 && (
              <div>
                <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  <span>{lang === 'te' ? 'ఫైల్స్' : 'Files'} ({filteredFiles.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFileIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStartFile(e, file.id)}
                        onClick={() => handleOpenFile(file)}
                        className={`group relative rounded-2xl p-4 transition-all shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? isLight
                              ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/40 text-slate-900 shadow-md'
                              : 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40 text-white shadow-md'
                            : isLight
                              ? 'bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-400 text-slate-800'
                              : 'bg-[#1c1c1f] hover:bg-[#242428] border-white/10 hover:border-blue-500/40 text-white'
                        }`}
                        title="Click to open window • Drag to move to any folder or Root"
                      >
                        {/* Top Row: Selection Checkbox + Icon + Actions */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectFile(file.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                              title={isSelected ? 'Deselect file' : 'Select file for bulk move/delete'}
                            />
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                              isLight ? 'bg-slate-100' : 'bg-white/5'
                            }`}>
                              {renderFileIcon(file, 'md')}
                            </div>
                          </div>

                        {/* File Action Icons */}
                        <div className="flex items-center gap-1">
                          {/* Desktop-hover / secondary actions */}
                          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 opacity-90 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavoriteFile(file.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-amber-500' : 'hover:bg-white/10 text-zinc-400 hover:text-amber-400'
                              }`}
                              title={lang === 'te' ? 'స్టార్ ఫైల్' : 'Star File'}
                              aria-label="Star File"
                            >
                              <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'text-amber-500 fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveModalItem({ item: file, type: 'file' });
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600' : 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'
                              }`}
                              title={lang === 'te' ? 'ఫోల్డర్‌కు తరలించండి' : 'Move File'}
                              aria-label="Move File"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* 🗑️ Delete button - Always visible by default (mobile touch friendly) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.id);
                            }}
                            className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer shadow-xs ${
                              isLight
                                ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                                : 'bg-red-500/15 hover:bg-red-500/30 text-red-400 border-red-500/25'
                            }`}
                            title={lang === 'te' ? 'ఫైల్ తొలగించండి' : 'Delete File'}
                            aria-label="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* File Details */}
                      <div>
                        <h4 className={`text-xs font-bold truncate transition-colors mb-1 ${
                          isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-white group-hover:text-blue-400'
                        }`}>
                          {file.name}
                        </h4>
                        <div className={`flex items-center justify-between text-[11px] font-mono ${
                          isLight ? 'text-slate-500' : 'text-zinc-500'
                        }`}>
                          <span className={`uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-zinc-400'
                          }`}>
                            {file.extension}
                          </span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>

                        {/* Quick Indicator for Excel or Word */}
                        {(file.category === 'excel' || ['xlsx', 'xls', 'csv'].includes(file.extension)) && (
                          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <Table2 className="w-3 h-3" />
                              {lang === 'te' ? 'ఎక్సెల్ టేబుల్' : 'Excel Table'}
                            </span>
                            <span className={`${isLight ? 'text-slate-600 group-hover:text-emerald-600' : 'text-zinc-400 group-hover:text-emerald-300'} font-medium flex items-center gap-0.5`}>
                              {lang === 'te' ? 'ప్రివ్యూ & టేబుల్' : 'Preview & Table'} →
                            </span>
                          </div>
                        )}
                        {(file.category === 'word' || ['docx', 'doc'].includes(file.extension)) && (
                          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className="text-blue-600 font-semibold flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {lang === 'te' ? 'వర్డ్ డాక్యుమెంట్' : 'Word Doc'}
                            </span>
                            <span className={`${isLight ? 'text-slate-600 group-hover:text-blue-600' : 'text-zinc-400 group-hover:text-blue-300'} font-medium flex items-center gap-0.5`}>
                              {lang === 'te' ? 'చదవండి' : 'Read Doc'} →
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================
             LIST VIEW: Detailed Table View
             ======================================================== */
          <div className={`w-full rounded-2xl overflow-hidden shadow-xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1f] border-white/10'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-semibold border-b text-[11px] ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#242428] text-zinc-400 border-white/10'
              }`}>
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0}
                      onChange={() => handleSelectAllFiles(filteredFiles)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      title="Select / Deselect all files"
                    />
                  </th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Date Added</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                {/* Folders in List */}
                {filteredFolders.map((folder) => (
                  <tr
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleDropOnFolder(folder.id, e)}
                    className={`transition-colors cursor-pointer group ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.04]'
                    }`}
                    title="Click to open folder • Drop dragged files here to move into folder"
                  >
                    <td className="py-2.5 px-3 w-10 text-center">
                      <Folder className="w-4 h-4 text-blue-500 mx-auto fill-current opacity-60" />
                    </td>
                    <td className={`py-2.5 px-4 flex items-center gap-2.5 font-bold ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <Folder className="w-4 h-4 text-blue-500 shrink-0 fill-current" />
                      <span className="truncate max-w-md group-hover:text-blue-500">{folder.name}</span>
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Folder</td>
                    <td className={`py-2.5 px-3 font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>—</td>
                    <td className={`py-2.5 px-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      {new Date(folder.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setIsFolderModalOpen(true);
                          }}
                          className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveModalItem({ item: folder, type: 'folder' });
                          }}
                          className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-indigo-600' : 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'}`}
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className={`p-1 rounded ${isLight ? 'hover:bg-red-50 text-slate-500 hover:text-red-600' : 'hover:bg-white/10 text-zinc-400 hover:text-red-400'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Web Apps in List */}
                {filteredWebApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => {
                      window.open(app.url, '_blank', 'noopener,noreferrer');
                    }}
                    className={`transition-colors cursor-pointer group ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.04]'
                    }`}
                    title={lang === 'te' ? 'బ్రౌజర్‌లో నేరుగా తెరవడానికి క్లిక్ చేయండి' : 'Click to launch directly in browser tab'}
                  >
                    <td className="py-2.5 px-3 w-10 text-center">
                      <Globe className="w-3.5 h-3.5 text-emerald-500 mx-auto opacity-60" />
                    </td>
                    <td className={`py-2.5 px-4 flex items-center gap-2.5 font-bold ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm shrink-0 overflow-hidden border border-emerald-500/20">
                        {app.customIconUrl ? (
                          <img src={app.customIconUrl} alt={app.name} className="w-5 h-5 object-contain rounded" />
                        ) : (
                          <span>{app.icon || '🌐'}</span>
                        )}
                      </div>
                      <span className="truncate max-w-md group-hover:text-emerald-500">{app.name}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {app.isPreloaded || app.source === 'preloaded' ? (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          isLight ? 'text-amber-800 bg-amber-100 border-amber-300' : 'text-amber-300 bg-amber-500/15 border-amber-500/25'
                        }`}>
                          Pre-Loaded
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          isLight ? 'text-blue-800 bg-blue-100 border-blue-300' : 'text-blue-300 bg-blue-500/15 border-blue-500/25'
                        }`}>
                          User Added
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 text-[11px] truncate max-w-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{app.description || app.url}</td>
                    <td className={`py-2.5 px-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWebApp(app);
                            setIsWebAppModalOpen(true);
                          }}
                          className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                          title="Edit Web App"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveModalItem({ item: app, type: 'webapp' });
                          }}
                          className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-indigo-600' : 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'}`}
                          title="Move Web App to Folder"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWebApp(app.id);
                          }}
                          className={`p-1 rounded ${isLight ? 'hover:bg-red-50 text-slate-500 hover:text-red-600' : 'hover:bg-white/10 text-zinc-400 hover:text-red-400'}`}
                          title="Delete Web App"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Files in List */}
                {filteredFiles.map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);
                  return (
                    <tr
                      key={file.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStartFile(e, file.id)}
                      onClick={() => handleOpenFile(file)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? isLight ? 'bg-blue-50/90 font-medium' : 'bg-blue-600/20 font-medium'
                          : isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.04]'
                      }`}
                      title="Click to open window • Drag to move to any folder or Root"
                    >
                      <td className="py-2.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectFile(file.id)}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          title={isSelected ? 'Deselect file' : 'Select file'}
                        />
                      </td>
                      <td className={`py-2.5 px-4 flex items-center gap-2.5 font-bold ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {renderFileIcon(file, 'sm')}
                        <span className="truncate max-w-md group-hover:text-blue-500">{file.name}</span>
                      </td>
                    <td className={`py-2.5 px-3 uppercase text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      {file.extension}
                    </td>
                    <td className={`py-2.5 px-3 font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      {formatFileSize(file.size)}
                    </td>
                    <td className={`py-2.5 px-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(file.category === 'excel' || ['xlsx', 'xls', 'csv'].includes(file.extension)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFile(file);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isLight ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-500/20 text-emerald-400'
                            }`}
                            title={lang === 'te' ? 'టేబుల్ ప్రివ్యూ & ఓపెన్' : 'Preview & Open in Table'}
                          >
                            <Table2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(file.category === 'word' || ['docx', 'doc'].includes(file.extension)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFile(file);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isLight ? 'hover:bg-blue-50 text-blue-600' : 'hover:bg-blue-500/20 text-blue-400'
                            }`}
                            title={lang === 'te' ? 'డాక్యుమెంట్ చదవండి' : 'Read Word Document'}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavoriteFile(file.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-amber-500' : 'hover:bg-white/10 text-zinc-400 hover:text-amber-400'
                          }`}
                          title="Star File"
                        >
                          <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'text-amber-500 fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveModalItem({ item: file, type: 'file' });
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-indigo-400 transition-colors"
                          title="Move File"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </button>

                        {/* 🗑️ Delete button - Always visible and touch friendly */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/25 transition-all active:scale-95 cursor-pointer shadow-xs"
                          title={lang === 'te' ? 'ఫైల్ తొలగించండి' : 'Delete File'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/20 text-white text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Inbuilt File / Web App Viewer Modals (Multi-Window Windows Explorer Style) */}
      {openFiles.map((item) => (
        <ExplorerViewerModal
          key={item.id}
          item={item}
          isMinimized={activeFileId !== item.id}
          onMinimize={() => setActiveFileId(null)}
          onClose={() => handleCloseFileWindow(item.id)}
          lang={lang}
          onToggleDraw={onToggleDraw}
          isDrawActive={isDrawActive}
          allFolderFiles={files.filter((f) => f.folderId === currentFolderId)}
          onSelectTrack={(trackFile) => handleOpenFile(trackFile)}
          onImportToAppRegister={(newRegister) => {
            onImportRegister?.(newRegister);
            onNavigateToTable?.();
            setToastMessage(
              lang === 'te'
                ? `టేబుల్ "${newRegister.title}" డేటా టేబుల్‌లోకి దిగుమతి చేయబడింది!`
                : `Table "${newRegister.title}" imported into Data Table workspace!`
            );
          }}
        />
      ))}

      {/* Windows Explorer Style Floating Taskbar Dock */}
      {openFiles.length > 0 && (
        <aside
          aria-label="Windows Explorer Taskbar"
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] p-1.5 rounded-2xl bg-zinc-950/92 border border-white/20 shadow-2xl backdrop-blur-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Taskbar Title & Open Count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-zinc-300 uppercase tracking-wider border-r border-white/10 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{lang === 'te' ? 'టాస్క్‌బార్' : 'Taskbar'}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-mono">
              {openFiles.length}
            </span>
          </div>

          {/* Running / Minimized Window Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[70vw]">
            {openFiles.map((f) => {
              const isActive = activeFileId === f.id;
              const isApp = 'url' in f && !('extension' in f);
              const name = f.name;
              const category = 'category' in f ? (f as ExplorerFile).category : 'app';

              return (
                <div
                  key={f.id}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'bg-blue-600/30 border-blue-500/70 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/50'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => handleToggleFileWindow(f.id)}
                  title={
                    isActive
                      ? (lang === 'te' ? 'మినిమైజ్ చేయడానికి క్లిక్ చేయండి (Minimize)' : 'Click to minimize')
                      : (lang === 'te' ? 'స్క్రీన్‌పై తెరవడానికి క్లిక్ చేయండి (Restore)' : 'Click to restore')
                  }
                >
                  {/* File / App Icon */}
                  <span className="shrink-0 text-sm">
                    {isApp ? (
                      (f as WebAppItem).icon || '🌐'
                    ) : category === 'excel' ? (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    ) : category === 'audio' ? (
                      <Music className="w-4 h-4 text-purple-400" />
                    ) : category === 'video' ? (
                      <Film className="w-4 h-4 text-amber-400" />
                    ) : category === 'word' ? (
                      <FileText className="w-4 h-4 text-blue-400" />
                    ) : category === 'pdf' ? (
                      <FileText className="w-4 h-4 text-red-400" />
                    ) : category === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-pink-400" />
                    ) : (
                      <File className="w-4 h-4 text-zinc-400" />
                    )}
                  </span>

                  {/* Truncated File Name */}
                  <span className="max-w-[140px] truncate text-xs font-semibold">
                    {name}
                  </span>

                  {/* Active / Minimized indicator */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-zinc-500'
                    }`}
                  />

                  {/* Close button inside pill */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseFileWindow(f.id);
                    }}
                    className="p-1 -mr-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                    title={lang === 'te' ? 'విండో మూసివేయండి' : 'Close window'}
                    aria-label={`Close ${name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Actions: Minimize All / Close All */}
          <div className="flex items-center gap-1 pl-1 border-l border-white/10 shrink-0">
            {activeFileId !== null ? (
              <button
                type="button"
                onClick={() => setActiveFileId(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={lang === 'te' ? 'అన్నింటినీ మినిమైజ్ చేయండి (Minimize All)' : 'Minimize All to Taskbar'}
                aria-label="Minimize all windows"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpenFiles([]);
                setActiveFileId(null);
              }}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              title={lang === 'te' ? 'అన్ని విండోలను మూసివేయండి' : 'Close all windows'}
              aria-label="Close all windows"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Create / Edit Folder Modal */}
      {isFolderModalOpen && (
        <FolderModal
          isOpen={isFolderModalOpen}
          onClose={() => {
            setIsFolderModalOpen(false);
            setEditingFolder(null);
          }}
          onSave={handleSaveFolder}
          initialFolder={editingFolder}
          parentFolderId={currentFolderId}
          subTabId={activeSubTabId}
          allFolders={folders}
          lang={lang}
        />
      )}

      {/* Add / Edit Web App Modal */}
      {isWebAppModalOpen && (
        <WebAppModal
          isOpen={isWebAppModalOpen}
          onClose={() => {
            setIsWebAppModalOpen(false);
            setEditingWebApp(null);
          }}
          onSave={handleSaveWebApp}
          initialApp={editingWebApp}
          subTabId={activeSubTabId}
          currentFolderId={currentFolderId}
          folders={folders}
          lang={lang}
        />
      )}

      {/* Move Item Modal */}
      {moveModalItem && (
        <MoveItemModal
          isOpen={Boolean(moveModalItem)}
          onClose={() => setMoveModalItem(null)}
          item={moveModalItem.item}
          itemType={moveModalItem.type}
          folders={folders}
          subTabs={subTabs}
          onConfirmMove={handleConfirmMove}
          lang={lang}
        />
      )}

      {/* Bulk Move Modal for Multiple Selected Files */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-md border rounded-3xl shadow-2xl p-6 flex flex-col gap-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#1a1a1f] border-white/15 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold">
                  {lang === 'te'
                    ? `${selectedFileIds.length} ఫైల్స్‌ను తరలించండి`
                    : `Move ${selectedFileIds.length} Selected File(s)`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              {lang === 'te'
                ? 'ఈ ఫైల్స్ తరలించడానికి గమ్యస్థాన ఫోల్డర్‌ను ఎంచుకోండి:'
                : 'Select the destination folder or Root directory for the selected files:'}
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {/* Option 1: Move to Root */}
              <button
                type="button"
                onClick={() => handleBulkMove(null)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  currentFolderId === null
                    ? isLight ? 'bg-slate-100 border-slate-300' : 'bg-white/5 border-white/10'
                    : isLight
                      ? 'bg-blue-50/60 hover:bg-blue-100/70 border-blue-200 text-blue-900'
                      : 'bg-blue-600/15 hover:bg-blue-600/25 border-blue-500/30 text-white'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold">{lang === 'te' ? 'రూట్ డైరెక్టరీ' : 'Root Directory'} (/)</div>
                  <div className="text-[11px] text-zinc-400">Move out to the main Explorer root</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Option 2+: Available Folders */}
              {folders
                .filter((f) => f.subTabId === activeSubTabId)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleBulkMove(f.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      currentFolderId === f.id
                        ? isLight ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-white/5 border-white/10 opacity-60'
                        : isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Folder className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{f.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {files.filter((fl) => fl.folderId === f.id).length} files
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Sub-Tabs Modal */}
      {isManageTabsModalOpen && (
        <ManageSubTabsModal
          isOpen={isManageTabsModalOpen}
          onClose={() => setIsManageTabsModalOpen(false)}
          subTabs={subTabs}
          onAddSubTab={handleAddSubTab}
          onUpdateSubTab={handleUpdateSubTab}
          onDeleteSubTab={handleDeleteSubTab}
          lang={lang}
        />
      )}

      {/* Quick Note Document Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-md border rounded-2xl shadow-2xl p-5 flex flex-col gap-3 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#1c1c1f] border-white/15 text-white'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <FileText className="w-4 h-4 text-blue-500" />
              <span>{lang === 'te' ? 'టెక్స్ట్ డాక్యుమెంట్ / నోట్ సృష్టించండి' : 'Create Text Document / Note'}</span>
            </h3>
            <input
              type="text"
              autoFocus
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Document name (e.g. Circular_Notes.txt)"
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#121214] border-white/15 text-white placeholder:text-zinc-600'
              }`}
            />
            <textarea
              rows={5}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your notes or document text here..."
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#121214] border-white/15 text-white placeholder:text-zinc-600'
              }`}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isLight ? 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200' : 'text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15'
                }`}
              >
                {lang === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all"
              >
                {lang === 'te' ? 'నోట్ సేవ్ చేయండి' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Deleted / Missing Source File Alert Dialog */}
      {deletedFileAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-md border rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center ${
            isLight ? 'bg-white border-red-300 text-slate-900' : 'bg-[#18181b] border-red-500/30 text-white'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mb-3.5 shadow-lg shadow-red-950/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-1">
              {lang === 'te' ? 'హార్డ్ డిస్క్ / స్టోరేజ్ లోపం' : 'Storage / Hard Disk Alert'}
            </span>

            <h3 className={`text-xl font-black mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {lang === 'te' ? 'ఫైల్ డిలీట్ అయింది' : 'File Was Deleted or Moved'}
            </h3>

            <div className={`w-full p-3.5 rounded-xl border mb-4 text-left ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
            }`}>
              <div className={`font-bold text-xs truncate mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {deletedFileAlert.name}
              </div>
              <div className={`flex items-center justify-between text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                <span className={`uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/5 text-zinc-300'
                }`}>
                  {deletedFileAlert.extension}
                </span>
                <span>{formatFileSize(deletedFileAlert.size)}</span>
              </div>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
              {lang === 'te'
                ? 'ఈ ఫైల్ హార్డ్ డిస్క్ లేదా డివైస్ స్టోరేజ్ నుండి డిలీట్ చేయబడింది లేదా లొకేషన్ నుండి తరలించబడింది. సోర్స్ ఫైల్ అందుబాటులో లేదు.'
                : 'This source file was deleted from your hard disk / device storage or was moved from its original location. It cannot be opened.'}
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              <label className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95">
                <Upload className="w-4 h-4" />
                <span>{lang === 'te' ? 'ఫైల్ రీ-అప్‌లోడ్ చేయండి' : 'Re-Upload File'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleRestoreDeletedFile}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const id = deletedFileAlert.id;
                  setDeletedFileAlert(null);
                  handleDeleteFile(id);
                }}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                    : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-white'
                }`}
                title="Remove deleted entry from list"
              >
                <Trash2 className="w-4 h-4 sm:hidden inline mr-1.5" />
                <span>{lang === 'te' ? 'లిస్ట్ నుండి తొలగించండి' : 'Remove Entry'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDeletedFileAlert(null)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/15 text-zinc-300'
                }`}
              >
                {lang === 'te' ? 'మూసివేయి' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Register Modal */}
      {registerToRename && (
        <RenameRegisterModal
          isOpen={!!registerToRename}
          onClose={() => setRegisterToRename(null)}
          onSave={(id: string, newTitle: string, newTitleTe?: string, newDesc?: string) => {
            if (onRenameRegister) {
              onRenameRegister(id, newTitle, newTitleTe, newDesc);
            }
            setRegisterToRename(null);
          }}
          register={registerToRename}
          lang={lang}
          currentTheme={currentTheme}
        />
      )}
    </div>
  );
};
