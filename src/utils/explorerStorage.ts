import { ExplorerFile, ExplorerFolder, WebAppItem, ExplorerSubTab, FileCategory } from '../types/explorer';
export {
  storeFileBlob,
  getFileBlob,
  deleteFileBlob,
  memoryBlobCache,
} from './indexedDBStorage';

export function detectFileCategory(fileName: string, mimeType?: string): FileCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext)) return 'excel';
  if (ext === 'pdf') return 'pdf';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'ppt';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(ext) || mimeType?.startsWith('audio/')) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', '3gp'].includes(ext) || mimeType?.startsWith('video/')) return 'video';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
  if (['txt', 'log', 'md', 'markdown'].includes(ext)) return 'text';
  if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'scss', 'py', 'java', 'c', 'cpp', 'sql', 'xml', 'yaml', 'yml'].includes(ext)) return 'code';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';
  
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const STORAGE_KEYS = {
  FILES: 'dyn_explorer_files_v2',
  FOLDERS: 'dyn_explorer_folders_v2',
  WEB_APPS: 'dyn_explorer_webapps_v2',
  SUB_TABS: 'dyn_explorer_subtabs_v3',
  ACTIVE_SUB_TAB: 'dyn_explorer_active_subtab_v3',
};

// Protected System Sub-Tabs (user cannot delete these)
export const SYSTEM_SUB_TAB_IDS = ['folders_files', 'web_apps', 'digital_classes', 'app_registers'] as const;

export function isSystemSubTab(id: string): boolean {
  return (SYSTEM_SUB_TAB_IDS as readonly string[]).includes(id);
}

// Initial default sub-tabs: Local Files, App Store, Digital Classes, App Tables & Registers
export const defaultSubTabs: ExplorerSubTab[] = [
  {
    id: 'folders_files',
    name: 'Local Files',
    nameTe: 'లోకల్ ఫైల్స్',
    iconName: 'Folder',
    color: '#0a84ff', // Electric Blue
    order: 0,
    description: 'Local documents, uploaded files & folder storage',
  },
  {
    id: 'web_apps',
    name: 'App Store',
    nameTe: 'యాప్ స్టోర్',
    iconName: 'Globe',
    color: '#10b981', // Emerald Green
    order: 1,
    description: 'Web apps, productivity tools & bookmarked links',
  },
  {
    id: 'digital_classes',
    name: 'Digital Classes',
    nameTe: 'డిజిటల్ క్లాసెస్',
    iconName: 'Youtube',
    color: '#ff0000', // YouTube Red
    order: 2,
    description: 'NewGen eEducation Official YouTube Channel & video classes',
  },
  {
    id: 'app_registers',
    name: 'App Tables & Registers',
    nameTe: 'యాప్ టేబుల్స్ & రిజిస్టర్లు',
    iconName: 'Table2',
    color: '#8b5cf6', // Violet/Purple
    order: 3,
    description: 'Dynamic registers, spreadsheet tables & custom forms',
  },
];

// Developer Pre-Loaded Web Apps (Category 1: Pre-loaded with official verified URLs and descriptions)
export const developerPreloadedWebApps: WebAppItem[] = [
  {
    id: 'app_pre_newgen_youtube',
    name: 'NewGen eEducation YouTube',
    url: 'https://www.youtube.com/@gudurusathishkumar',
    icon: '▶️',
    description: 'Official YouTube channel: mathematics lectures, digital classes & TSPSC exam preparation.',
    category: 'Education & Classes',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_tspsc',
    name: 'TSPSC Official Portal',
    url: 'https://www.tspsc.gov.in',
    icon: '🏛️',
    description: 'Telangana State Public Service Commission: recruitment notifications, syllabus & hall tickets.',
    category: 'Govt & Recruitment',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_sheets',
    name: 'Google Sheets Online',
    url: 'https://sheets.google.com',
    icon: '📊',
    description: 'Collaborative spreadsheets, formula calculations, statistical registers and table ledgers.',
    category: 'Productivity & Office',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_drive',
    name: 'Google Drive Cloud Storage',
    url: 'https://drive.google.com',
    icon: '📁',
    description: 'Secure cloud file storage, shared documents, PDF viewer and multi-device access.',
    category: 'Cloud Storage',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_diksha',
    name: 'DIKSHA National Education',
    url: 'https://diksha.gov.in',
    icon: '🎓',
    description: 'Digital Infrastructure for Knowledge Sharing: QR-coded textbooks and pedagogical resources.',
    category: 'Education & Classes',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_ncert',
    name: 'NCERT E-Books & Textbooks',
    url: 'https://ncert.nic.in/textbook.php',
    icon: '📚',
    description: 'Official school textbooks, syllabi, mathematics questions, and academic publications.',
    category: 'Education & Classes',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_telangana_gov',
    name: 'Telangana State Govt Portal',
    url: 'https://telangana.gov.in',
    icon: '🏛️',
    description: 'Official Government of Telangana portal: citizen services, departmental notices and portals.',
    category: 'Govt & Services',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'app_pre_wolfram',
    name: 'Wolfram Alpha Intelligence',
    url: 'https://www.wolframalpha.com',
    icon: '🔢',
    description: 'Computational engine for step-by-step mathematics, calculus, algebra and statistics.',
    category: 'Mathematics & Science',
    subTabId: 'web_apps',
    folderId: null,
    launchMode: 'new_tab',
    isPreloaded: true,
    source: 'preloaded',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

// Clean empty initial data for folders and files
export const defaultFolders: ExplorerFolder[] = [];
export const defaultWebApps: WebAppItem[] = developerPreloadedWebApps;
export const defaultFiles: ExplorerFile[] = [];

