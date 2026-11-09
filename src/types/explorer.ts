export type FileCategory = 
  | 'word' 
  | 'excel' 
  | 'pdf' 
  | 'ppt' 
  | 'audio' 
  | 'video' 
  | 'image' 
  | 'text' 
  | 'code' 
  | 'archive' 
  | 'other';

export interface ExplorerFile {
  id: string;
  name: string;
  extension: string;
  category: FileCategory;
  mimeType: string;
  size: number; // in bytes
  createdAt: string;
  updatedAt?: string;
  folderId: string | null; // null for root in subTab
  subTabId: string;
  url?: string; // remote web link or data URL if small
  blobKey?: string; // key in IndexedDB for binary storage
  textPreview?: string; // for text, json, csv
  tags?: string[];
  description?: string;
  isFavorite?: boolean;
}

export interface ExplorerFolder {
  id: string;
  name: string;
  color?: string; // Tailwind color or hex
  icon?: string; // Lucide icon identifier
  parentFolderId: string | null; // null for root folder in subTab
  subTabId: string;
  createdAt: string;
  description?: string;
  itemCount?: number;
}

export type WebAppLaunchMode = 'modal' | 'new_tab';

export interface WebAppItem {
  id: string;
  name: string;
  url: string;
  icon?: string; // emoji or icon name
  customIconUrl?: string; // data URL or image path for user-uploaded custom icon
  description?: string;
  subTabId: string;
  folderId: string | null;
  launchMode: WebAppLaunchMode;
  category?: string;
  isPreloaded?: boolean;
  source?: 'preloaded' | 'user';
  createdAt: string;
  isFavorite?: boolean;
}

export interface ExplorerSubTab {
  id: string;
  name: string;
  nameTe?: string;
  iconName: string;
  color: string;
  isCustom?: boolean;
  order: number;
  description?: string;
}

export type ExplorerFilterType = 
  | 'all' 
  | 'folders' 
  | 'documents' 
  | 'media' 
  | 'audio' 
  | 'video' 
  | 'images' 
  | 'webapps' 
  | 'favorites';

export type ExplorerSortOption = 
  | 'name_asc' 
  | 'name_desc' 
  | 'date_desc' 
  | 'date_asc' 
  | 'size_desc' 
  | 'size_asc' 
  | 'type';

export type ExplorerViewMode = 'grid' | 'list';
