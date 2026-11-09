import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Youtube,
  Play,
  Search,
  ExternalLink,
  Plus,
  X,
  Layers,
  Trash2,
  FolderPlus,
  Settings2,
  Edit2,
  Check,
  AlertCircle,
  Download,
  Upload,
  LayoutGrid,
  List,
  FileJson
} from 'lucide-react';
import { idbGetItemSync, idbSetItem } from '../utils/indexedDBStorage';

export type VideoSourceType = 'youtube' | 'direct' | 'vimeo' | 'generic';

export interface VideoCategory {
  id: string;
  name: string;
  color: string;
}

export interface ChannelVideo {
  id: string;
  youtubeId: string;
  title: string;
  categoryId: string;
  duration?: string;
  views?: string;
  publishedAt?: string;
  description?: string;
  tags?: string[];
  videoType?: VideoSourceType;
  videoUrl?: string;
}

export const CHANNEL_HANDLE = '@gudurusathishkumar';
export const CHANNEL_NAME = 'NewGen eEducation';
export const CHANNEL_URL = 'https://www.youtube.com/@gudurusathishkumar';

const STORAGE_KEY_CATEGORIES = 'newgen_digital_classes_categories_v3';
const STORAGE_KEY_VIDEOS = 'newgen_digital_classes_videos_v3';
const STORAGE_KEY_VIEW_MODE = 'newgen_digital_classes_view_mode';

const DEFAULT_CATEGORIES: VideoCategory[] = [
  { id: 'competitive', name: 'TSPSC & Competitive Exams', color: '#f59e0b' },
  { id: 'maths', name: 'Mathematics', color: '#3b82f6' },
  { id: 'cs', name: 'Computer Science & IT', color: '#10b981' },
  { id: 'electrical', name: 'Electrical Engineering', color: '#8b5cf6' },
  { id: 'ai', name: 'Artificial Intelligence', color: '#ec4899' },
  { id: 'governance', name: 'Digital Governance & Administration', color: '#06b6d4' },
];

const PRESET_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#eab308', // Yellow
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

/**
 * JavaScript function to parse any YouTube URL (including 'shorts' URLs)
 * and extract the video ID, then return the standard YouTube watch URL format:
 * `https://www.youtube.com/watch?v=VIDEO_ID`.
 *
 * @param url - Any YouTube URL (shorts, watch, youtu.be, embed, v, live, or 11-char ID)
 * @returns Standard YouTube watch URL string or null if not a YouTube link
 */
export function parseYouTubeToStandardWatchUrl(url: string): string | null {
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return null;
}

/**
 * Robust YouTube video ID extractor supporting all YouTube formats:
 * - Shorts: https://www.youtube.com/shorts/VIDEO_ID or with params ?feature=share
 * - Standard Watch: https://www.youtube.com/watch?v=VIDEO_ID
 * - Short domain: https://youtu.be/VIDEO_ID
 * - Mobile: https://m.youtube.com/watch?v=VIDEO_ID or https://m.youtube.com/shorts/VIDEO_ID
 * - Embed: https://www.youtube.com/embed/VIDEO_ID
 * - Live: https://www.youtube.com/live/VIDEO_ID
 * - Bare 11-character video ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();

  // 1. Direct 11-character alphanumeric ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // 2. Comprehensive RegExp capturing watch?v=, shorts/, youtu.be/, embed/, v/, live/
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  // 3. Fallback URL parsing for query parameters and path segments
  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    if (parsed.searchParams.has('v')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const keyIdx = pathParts.findIndex((p) => ['shorts', 'embed', 'v', 'live'].includes(p.toLowerCase()));
    if (keyIdx !== -1 && pathParts[keyIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[keyIdx + 1])) {
      return pathParts[keyIdx + 1];
    }
  } catch {}

  return null;
}

/**
 * Universal video link detector: detects YouTube (video & shorts), direct video files (.mp4/.webm/etc),
 * Vimeo, and generic video links so ANY type of video link can be added and played.
 */
export function detectVideoSource(url: string): {
  type: VideoSourceType;
  videoId?: string;
  embedUrl: string;
  watchUrl: string;
} {
  const clean = url.trim();
  const ytId = extractYouTubeId(clean);

  // 1. YouTube (standard watch or shorts)
  if (ytId) {
    return {
      type: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
    };
  }

  // 2. Direct HTML5 video file (.mp4, .webm, .ogg, .mov, .m4v)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(clean)) {
    return {
      type: 'direct',
      embedUrl: clean,
      watchUrl: clean,
    };
  }

  // 3. Vimeo
  const vimeoMatch = clean.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+))/);
  if (vimeoMatch && vimeoMatch[3]) {
    const vimeoId = vimeoMatch[3];
    return {
      type: 'vimeo',
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
      watchUrl: `https://vimeo.com/${vimeoId}`,
    };
  }

  // 4. Google Drive video preview link
  const gdriveMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    const driveId = gdriveMatch[1];
    return {
      type: 'generic',
      videoId: driveId,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      watchUrl: `https://drive.google.com/file/d/${driveId}/view`,
    };
  }

  // 5. Generic video / web stream link
  return {
    type: 'generic',
    embedUrl: clean,
    watchUrl: clean,
  };
}

interface DigitalClassesViewProps {
  lang?: 'en' | 'te';
  currentTheme?: string;
}

export const DigitalClassesView: React.FC<DigitalClassesViewProps> = ({
  lang = 'en',
  currentTheme
}) => {
  const isLight = currentTheme === 'light' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  // Categories State
  const [categories, setCategories] = useState<VideoCategory[]>(() => {
    try {
      const saved = idbGetItemSync<VideoCategory[] | string>(STORAGE_KEY_CATEGORIES);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Videos State
  const [videos, setVideos] = useState<ChannelVideo[]>(() => {
    try {
      const saved = idbGetItemSync<ChannelVideo[] | string>(STORAGE_KEY_VIDEOS);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      // Check legacy storage migration
      const legacySaved = idbGetItemSync<any[] | string>('dyn_digital_classes_my_uploads_v2');
      if (legacySaved) {
        const parsedLegacy = typeof legacySaved === 'string' ? JSON.parse(legacySaved) : legacySaved;
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          return parsedLegacy.map((v: any) => ({
            id: v.id || `vid_${Date.now()}_${Math.random()}`,
            youtubeId: v.youtubeId || '',
            title: v.title || 'Video Lecture',
            categoryId: v.category === 'tspsc' ? 'competitive' : (v.category || 'competitive'),
            duration: v.duration || 'Lecture',
            views: v.views || 'Video',
            publishedAt: v.publishedAt || new Date().toISOString().split('T')[0],
            description: v.description || '',
            tags: v.tags || []
          }));
        }
      }
    } catch {}
    return [];
  });

  // View Mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const savedMode = idbGetItemSync<string>(STORAGE_KEY_VIEW_MODE);
      if (savedMode === 'list' || savedMode === 'grid') {
        return savedMode;
      }
    } catch {}
    return 'grid';
  });

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [playingVideo, setPlayingVideo] = useState<ChannelVideo | null>(null);
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Quick Add Input state
  const [quickUrl, setQuickUrl] = useState('');
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Hidden File input for Restore JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Video Modal Form state
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  // Category Manager Form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');

  // Persist categories
  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEY_CATEGORIES, categories);
    } catch {}
  }, [categories]);

  // Persist videos
  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEY_VIDEOS, videos);
    } catch {}
  }, [videos]);

  // Persist view mode
  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEY_VIEW_MODE, viewMode);
    } catch {}
  }, [viewMode]);

  // Set default category when categories change
  useEffect(() => {
    if (categories.length > 0) {
      if (!quickCategory || !categories.some(c => c.id === quickCategory)) {
        setQuickCategory(categories[0].id);
      }
      if (!formCategory || !categories.some(c => c.id === formCategory)) {
        setFormCategory(categories[0].id);
      }
    }
  }, [categories, quickCategory, formCategory]);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Helper to fetch title via oEmbed
  const fetchYouTubeTitle = async (yId: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${yId}&format=json`);
      if (res.ok) {
        const data = await res.json();
        return data.title || null;
      }
    } catch {}
    return null;
  };

  // Quick Add Video submission (YouTube, Shorts, Direct MP4, or any video link)
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = quickUrl.trim();
    if (!rawUrl) return;

    const source = detectVideoSource(rawUrl);
    const identifier = source.videoId || rawUrl;

    if (!identifier || identifier.length < 3) {
      showNotification('Please enter a valid YouTube URL, Shorts link, or video URL');
      return;
    }

    if (videos.some((v) => (v.youtubeId && v.youtubeId === identifier) || (v.videoUrl && v.videoUrl === rawUrl))) {
      showNotification('This video is already in your collection');
      setQuickUrl('');
      return;
    }

    setIsQuickAdding(true);
    let title = '';

    if (source.type === 'youtube' && source.videoId) {
      const fetchedTitle = await fetchYouTubeTitle(source.videoId);
      title = fetchedTitle || `YouTube Video (${source.videoId})`;
    } else if (source.type === 'direct') {
      const filename = rawUrl.split('/').pop()?.split('?')[0] || 'Direct Video Lesson';
      title = decodeURIComponent(filename).replace(/[-_]/g, ' ');
    } else if (source.type === 'vimeo') {
      title = `Vimeo Lesson (${source.videoId || 'Video'})`;
    } else {
      title = `Digital Video Class`;
    }

    const assignedCategory = quickCategory || (categories[0]?.id ?? 'general');

    const newVideo: ChannelVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      youtubeId: source.videoId || rawUrl,
      title,
      categoryId: assignedCategory,
      duration: source.type === 'youtube' ? 'Lecture' : 'Video',
      views: 'Video',
      publishedAt: new Date().toISOString().split('T')[0],
      description: `Educational video curated for ${categories.find((c) => c.id === assignedCategory)?.name || 'Classes'}.`,
      tags: [assignedCategory, 'educational', source.type],
      videoType: source.type,
      videoUrl: rawUrl,
    };

    setVideos((prev) => [newVideo, ...prev]);
    setIsQuickAdding(false);
    setQuickUrl('');
    showNotification(`Added "${title}" to your video library`);
  };

  // Add Video from Modal (YouTube, Shorts, or Any Video Link)
  const handleAddVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const rawUrl = formUrl.trim();
    if (!rawUrl) {
      setFormError('Please enter a video URL');
      return;
    }

    const source = detectVideoSource(rawUrl);
    const identifier = source.videoId || rawUrl;

    if (!identifier || identifier.length < 3) {
      setFormError('Please enter a valid video link, YouTube URL, or video ID');
      return;
    }

    if (videos.some((v) => (v.youtubeId && v.youtubeId === identifier) || (v.videoUrl && v.videoUrl === rawUrl))) {
      setFormError('This video already exists in your library');
      return;
    }

    let titleVal = formTitle.trim();
    if (!titleVal) {
      if (source.type === 'youtube' && source.videoId) {
        setIsFetchingMeta(true);
        const fetchedTitle = await fetchYouTubeTitle(source.videoId);
        setIsFetchingMeta(false);
        titleVal = fetchedTitle || `Lecture Video (${source.videoId})`;
      } else if (source.type === 'direct') {
        const filename = rawUrl.split('/').pop()?.split('?')[0] || 'Video Lesson';
        titleVal = decodeURIComponent(filename).replace(/[-_]/g, ' ');
      } else {
        titleVal = `Digital Video Lecture`;
      }
    }

    const assignedCategory = formCategory || (categories[0]?.id ?? 'general');

    const newVideo: ChannelVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      youtubeId: source.videoId || rawUrl,
      title: titleVal,
      categoryId: assignedCategory,
      duration: 'Lecture',
      views: 'Video',
      publishedAt: new Date().toISOString().split('T')[0],
      description: formDescription.trim() || `Educational video curated for ${categories.find((c) => c.id === assignedCategory)?.name || 'Classes'}.`,
      tags: [assignedCategory, 'educational', source.type],
      videoType: source.type,
      videoUrl: rawUrl,
    };

    setVideos((prev) => [newVideo, ...prev]);
    setIsAddVideoModalOpen(false);
    setFormUrl('');
    setFormTitle('');
    setFormDescription('');
    setFormError('');
    showNotification(`Added "${titleVal}" successfully`);
  };

  // Delete Video
  const handleDeleteVideo = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove "${title}"?`)) {
      setVideos(prev => prev.filter(v => v.id !== id));
      showNotification(`Removed "${title}"`);
    }
  };

  // Clear All Videos
  const handleClearAllVideos = () => {
    if (window.confirm('Are you sure you want to clear all videos from your library? (You can restore them later if you saved a backup JSON)')) {
      setVideos([]);
      showNotification('All videos removed from library');
    }
  };

  // BACKUP JSON HANDLER
  const handleBackupJson = () => {
    if (videos.length === 0 && categories.length === 0) {
      showNotification('No videos or categories to backup');
      return;
    }

    const exportData = {
      app: 'NewGen eEducation - Digital Classes',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      channelHandle: CHANNEL_HANDLE,
      channelUrl: CHANNEL_URL,
      totalVideos: videos.length,
      categories,
      videos
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `NewGen_Digital_Classes_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showNotification(`Backup exported (${videos.length} videos, ${categories.length} categories)`);
  };

  // Trigger restore file selection
  const handleTriggerRestore = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // RESTORE JSON HANDLER (WITH DE-DUPLICATION FILTER)
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let rawVideos: any[] = [];
        let rawCategories: any[] = [];

        if (Array.isArray(parsed)) {
          rawVideos = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.videos)) {
            rawVideos = parsed.videos;
          }
          if (Array.isArray(parsed.categories)) {
            rawCategories = parsed.categories;
          }
        }

        if (rawVideos.length === 0 && rawCategories.length === 0) {
          showNotification('No valid videos or categories found in the JSON file');
          return;
        }

        // 1. Process & Deduplicate Categories
        const existingCatIds = new Set(categories.map(c => c.id));
        const existingCatNames = new Set(categories.map(c => c.name.trim().toLowerCase()));
        const newCategoriesToAdd: VideoCategory[] = [];

        for (const cat of rawCategories) {
          if (!cat || typeof cat !== 'object') continue;
          const name = (cat.name || '').trim();
          if (!name) continue;
          const id = (cat.id || name.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();

          if (!existingCatIds.has(id) && !existingCatNames.has(name.toLowerCase())) {
            existingCatIds.add(id);
            existingCatNames.add(name.toLowerCase());
            newCategoriesToAdd.push({
              id,
              name,
              color: cat.color || PRESET_COLORS[newCategoriesToAdd.length % PRESET_COLORS.length]
            });
          }
        }

        const updatedCategories = newCategoriesToAdd.length > 0
          ? [...categories, ...newCategoriesToAdd]
          : categories;

        if (newCategoriesToAdd.length > 0) {
          setCategories(updatedCategories);
        }

        // 2. Process & Deduplicate Videos
        // Filter out any duplicates based on youtubeId or id
        const existingYIds = new Set(videos.map(v => v.youtubeId).filter(Boolean));
        const existingIds = new Set(videos.map(v => v.id).filter(Boolean));

        let addedCount = 0;
        let duplicateCount = 0;
        const newVideosToAdd: ChannelVideo[] = [];

        for (const item of rawVideos) {
          if (!item || typeof item !== 'object') continue;
          const yId = (item.youtubeId || extractYouTubeId(item.url || item.link || '')).trim();
          const id = (item.id || '').trim();

          // Check if already in current list
          if ((yId && existingYIds.has(yId)) || (id && existingIds.has(id))) {
            duplicateCount++;
            continue;
          }

          if (!yId && !item.title) continue;

          const effectiveYId = yId || 'unknown';
          const assignedCatId = item.categoryId || item.category || updatedCategories[0]?.id || 'general';

          const sanitizedVideo: ChannelVideo = {
            id: id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            youtubeId: effectiveYId,
            title: item.title || `Lecture Video (${effectiveYId})`,
            categoryId: assignedCatId,
            duration: item.duration || 'Lecture',
            views: item.views || 'Video',
            publishedAt: item.publishedAt || new Date().toISOString().split('T')[0],
            description: item.description || '',
            tags: Array.isArray(item.tags) ? item.tags : [assignedCatId]
          };

          if (effectiveYId !== 'unknown') {
            existingYIds.add(effectiveYId);
          }
          if (sanitizedVideo.id) {
            existingIds.add(sanitizedVideo.id);
          }

          newVideosToAdd.push(sanitizedVideo);
          addedCount++;
        }

        if (addedCount > 0) {
          setVideos(prev => [...newVideosToAdd, ...prev]);
          showNotification(
            `Restored ${addedCount} new video(s)${duplicateCount > 0 ? ` (${duplicateCount} duplicate(s) filtered out)` : ''}${newCategoriesToAdd.length > 0 ? ` and ${newCategoriesToAdd.length} category(ies)` : ''}.`
          );
        } else if (duplicateCount > 0) {
          showNotification(`All ${duplicateCount} video(s) already exist in your collection (duplicates filtered out).`);
        } else {
          showNotification('No new videos found in the file.');
        }
      } catch (err) {
        showNotification('Invalid JSON file format. Please upload a valid backup JSON file.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  // Category Management Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
    const newCat: VideoCategory = {
      id,
      name: trimmed,
      color: newCatColor || PRESET_COLORS[0]
    };

    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    showNotification(`Category "${trimmed}" created`);
  };

  const handleStartEditCategory = (cat: VideoCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  };

  const handleSaveEditCategory = (id: string) => {
    const trimmed = editCatName.trim();
    if (!trimmed) return;

    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, name: trimmed, color: editCatColor } : c))
    );
    setEditingCatId(null);
    showNotification(`Category updated`);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }

    if (window.confirm(`Delete category "${name}"? Existing videos in this category will be moved to another category.`)) {
      const remainingCats = categories.filter(c => c.id !== id);
      const fallbackCatId = remainingCats[0].id;

      // Reassign videos belonging to deleted category
      setVideos(prev =>
        prev.map(v => (v.categoryId === id ? { ...v, categoryId: fallbackCatId } : v))
      );

      setCategories(remainingCats);
      if (activeCategory === id) {
        setActiveCategory('all');
      }
      showNotification(`Deleted category "${name}"`);
    }
  };

  // Filtered list
  const filteredVideos = useMemo(() => {
    let list = videos;
    if (activeCategory !== 'all') {
      list = list.filter(v => v.categoryId === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        v =>
          v.title.toLowerCase().includes(q) ||
          (v.description && v.description.toLowerCase().includes(q)) ||
          (v.tags && v.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [videos, activeCategory, searchQuery]);

  return (
    <div className="w-full flex-1 flex flex-col space-y-3.5 pb-6 animate-fade-in">
      
      {/* Hidden file input for JSON restore */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleRestoreFileSelect}
        className="hidden"
      />

      {/* 1. CHANNEL HEADER BANNER - Compact Workspace Fit, Title kept prominent */}
      <div className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4.5 shadow-xl transition-colors ${
        isLight
          ? 'bg-gradient-to-r from-red-50 via-rose-50/70 to-white border-red-200 shadow-md'
          : 'bg-gradient-to-r from-[#20080b] via-[#160a0d] to-[#121214] border-red-500/25 shadow-xl'
      }`}>
        <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-red-400/10' : 'bg-red-600/15'
        }`} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#ff0000] p-1 shadow-md shadow-red-600/30 flex items-center justify-center shrink-0">
              <Youtube className="w-6 h-6 text-white fill-current" />
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Title kept same size as requested */}
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-1.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  NewGen <span className="text-red-500">e</span>Education
                </h2>
                <span className={`px-2 py-0.2 rounded-full border text-[10px] font-mono font-bold ${
                  isLight
                    ? 'bg-red-100/70 border-red-300 text-red-700'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}>
                  {CHANNEL_HANDLE}
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-zinc-800 text-zinc-300 border-white/5'
                }`}>
                  Educational Video Hub
                </span>
              </div>

              <p className={`text-xs max-w-2xl leading-normal ${
                isLight ? 'text-slate-600' : 'text-zinc-300'
              }`}>
                Official digital learning library and educational video catalog curated for NewGen eEducation classes.
              </p>

              {/* Status & Stats info */}
              <div className={`flex flex-wrap items-center gap-2.5 pt-0.5 text-[11px] ${
                isLight ? 'text-slate-500' : 'text-zinc-400'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{videos.length}</span>
                  <span>Video{videos.length === 1 ? '' : 's'}</span>
                </div>
                <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{categories.length}</span>
                  <span>Categories</span>
                </div>
                <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>•</span>
                <a
                  href={CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'} hover:underline flex items-center gap-1 font-mono text-[10px]`}
                >
                  <span>youtube.com/@gudurusathishkumar</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons: Add Video, Categories, Backup, Restore, Channel, Clear */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddVideoModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all cursor-pointer active:scale-95 shadow-md shadow-red-600/30"
              title="Add YouTube Video"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Video</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800 shadow-xs'
                  : 'bg-[#221013] hover:bg-red-950/60 border-red-500/30 text-red-200 hover:text-white'
              }`}
              title="Manage Categories"
            >
              <Settings2 className="w-3.5 h-3.5 text-red-500" />
              <span>Categories</span>
            </button>

            {/* Backup JSON Button */}
            <button
              type="button"
              onClick={handleBackupJson}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-white/10'
              }`}
              title="Backup your added videos and categories to a JSON file"
            >
              <Download className="w-3 h-3 text-emerald-500" />
              <span>Backup</span>
            </button>

            {/* Restore JSON Button */}
            <button
              type="button"
              onClick={handleTriggerRestore}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-white/10'
              }`}
              title="Restore videos and categories from a JSON backup file (filters duplicates)"
            >
              <Upload className="w-3 h-3 text-blue-500" />
              <span>Restore</span>
            </button>

            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-xs'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/10'
              }`}
              title="Visit official YouTube Channel"
            >
              <Youtube className="w-3.5 h-3.5 text-white fill-current" />
              <span>Channel</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>

            {videos.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllVideos}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200'
                    : 'bg-zinc-900/80 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border-white/5'
                }`}
                title="Clear all videos"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className={`mt-2.5 py-1.5 px-3 rounded-lg border text-[11px] font-medium flex items-center gap-2 animate-fade-in ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-950/50 border-red-500/30 text-zinc-100'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="flex-1">{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 2. QUICK ADD VIDEO BAR - Compact */}
      <form
        onSubmit={handleQuickAdd}
        className={`flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 rounded-xl shadow-xs border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#18181b] border-white/10'
        }`}
      >
        <div className={`flex items-center gap-1.5 pl-1.5 w-full sm:w-auto shrink-0 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
          <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className={`text-[11px] font-bold whitespace-nowrap ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
            Add Video / Shorts / Link:
          </span>
        </div>

        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Paste YouTube URL, Shorts, MP4, or any video link..."
            className={`w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              isLight
                ? 'bg-slate-50 border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-red-500'
                : 'bg-[#121214] border border-white/10 text-white placeholder:text-zinc-500 focus:border-red-500'
            }`}
          />
        </div>

        <div className="w-full sm:w-44 shrink-0">
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className={`w-full px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
              isLight
                ? 'bg-slate-50 border border-slate-300 text-slate-800 focus:bg-white focus:border-red-500'
                : 'bg-[#121214] border border-white/10 text-zinc-200 focus:border-red-500'
            }`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isQuickAdding || !quickUrl.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isQuickAdding ? 'Adding...' : 'Add Video'}</span>
        </button>
      </form>

      {/* 3. CATEGORY TABS, VIEW SWITCHER & SEARCH BAR - Compact Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-wrap flex-1 min-w-0">
          {/* All Videos Tab */}
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              activeCategory === 'all'
                ? 'bg-red-600 text-white shadow-sm border border-red-400/40'
                : isLight
                  ? 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 shadow-xs'
                  : 'bg-[#18181b] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All Videos</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono ${
                activeCategory === 'all'
                  ? 'bg-black/30 text-white'
                  : isLight
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-white/5 text-zinc-400'
              }`}
            >
              {videos.length}
            </span>
          </button>

          {/* User Categories */}
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = videos.filter((v) => v.categoryId === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm border border-red-400/40'
                    : isLight
                      ? 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 shadow-xs'
                      : 'bg-[#18181b] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono ${
                    isActive
                      ? 'bg-black/30 text-white'
                      : isLight
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-white/5 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Quick Manage Categories button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed text-[11px] font-medium cursor-pointer transition-colors ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                : 'bg-[#18181b] hover:bg-white/10 text-zinc-400 hover:text-white border-white/15'
            }`}
            title="Add or Edit Categories"
          >
            <FolderPlus className={`w-3 h-3 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`} />
            <span>Edit Categories</span>
          </button>
        </div>

        {/* Right side: View Switcher (Grid / List) & Search Bar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Toggle: Grid vs List */}
          <div className={`flex items-center p-0.5 rounded-lg shadow-xs border ${
            isLight ? 'bg-white border-slate-300' : 'bg-[#18181b] border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-red-600 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-red-600 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="List View"
            >
              <List className="w-3 h-3" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[170px] sm:w-56 shrink-0">
            <Search className={`w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className={`w-full pl-8 pr-7 py-1 rounded-lg text-xs transition-colors ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500'
                  : 'bg-[#18181b] border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. VIDEOS (GRID / LIST VIEW) OR EMPTY STATE */}
      {videos.length === 0 ? (
        <div className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 text-center shadow-lg space-y-4 ${
          isLight
            ? 'bg-white border-red-200'
            : 'bg-radial from-[#1e0a0e] via-[#120709] to-[#0c0406] border-red-500/20'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-[#ff0000] p-1 shadow-xl shadow-red-600/30 mx-auto flex items-center justify-center">
            <Youtube className="w-8 h-8 text-white fill-current" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                isLight
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {CHANNEL_HANDLE}
              </span>
            </div>
            <h3 className={`text-lg sm:text-xl font-black tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              NewGen eEducation Video Portal
            </h3>
            <p className={`text-xs leading-normal ${
              isLight ? 'text-slate-600' : 'text-zinc-300'
            }`}>
              Add your YouTube video lectures to organize them into custom categories. If you have a saved backup JSON file, you can restore your videos instantly below.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAddVideoModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Video</span>
            </button>

            {/* Direct Restore JSON button in empty state */}
            <button
              type="button"
              onClick={handleTriggerRestore}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm border ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-white/15 text-zinc-200 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Restore Backup JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer active:scale-95 transition-all border ${
                isLight
                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                  : 'bg-[#221013] hover:bg-red-950/60 border-red-500/30 text-red-200 hover:text-white'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-red-500" />
              <span>Configure Categories</span>
            </button>

            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                isLight
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-xs'
                  : 'bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-white fill-current" />
              <span>Visit YouTube</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className={`p-8 text-center rounded-xl space-y-2.5 border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#18181b] border-white/10'
        }`}>
          <Youtube className={`w-9 h-9 mx-auto ${isLight ? 'text-slate-400' : 'text-zinc-600'}`} />
          <h4 className={`text-xs sm:text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>No Videos Found</h4>
          <p className={`text-[11px] max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            No videos match the selected category or search filter.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
            >
              Show All Videos
            </button>
            <button
              type="button"
              onClick={() => setIsAddVideoModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white border-transparent'
              }`}
            >
              + Add Video
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW - Compact Cards for Better Workspace Fit */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
          {filteredVideos.map((video) => {
            const catObj = categories.find((c) => c.id === video.categoryId);
            const thumbUrl = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;

            return (
              <div
                key={video.id}
                className={`group relative flex flex-col rounded-xl overflow-hidden transition-all border ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-red-400 shadow-xs hover:shadow-md'
                    : 'bg-[#18181b] hover:bg-[#1f1f23] border-white/10 hover:border-red-500/40 shadow-sm hover:shadow-lg hover:shadow-red-950/20'
                }`}
              >
                {/* Thumbnail with overlay & duration */}
                <div
                  className="relative aspect-video w-full bg-[#0c0c0e] overflow-hidden cursor-pointer"
                  onClick={() => setPlayingVideo(video)}
                >
                  <img
                    src={thumbUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Gradient dark scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Red Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Category Pill Top Left - Compact */}
                  <div className="absolute top-2 left-2">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs border"
                      style={{
                        backgroundColor: 'rgba(18, 18, 20, 0.85)',
                        color: catObj?.color || '#fff',
                        borderColor: `${catObj?.color || '#fff'}40`
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: catObj?.color || '#fff' }}
                      />
                      <span className="truncate max-w-[110px]">{catObj?.name || 'General'}</span>
                    </span>
                  </div>

                  {/* Delete button top right */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteVideo(video.id, video.title, e)}
                    className="absolute top-2 right-2 p-1 rounded-md bg-black/75 hover:bg-red-600 text-zinc-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer shadow-xs"
                    title="Remove Video"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Content - Compact */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <h3
                      onClick={() => setPlayingVideo(video)}
                      className={`text-xs font-bold line-clamp-2 transition-colors cursor-pointer leading-snug ${
                        isLight ? 'text-slate-900 group-hover:text-red-600' : 'text-white group-hover:text-red-400'
                      }`}
                      title={video.title}
                    >
                      {video.title}
                    </h3>

                    {video.description && (
                      <p className={`text-[10px] line-clamp-1 leading-normal ${
                        isLight ? 'text-slate-500' : 'text-zinc-400'
                      }`}>
                        {video.description}
                      </p>
                    )}
                  </div>

                  {/* Meta & Watch Actions */}
                  <div className={`pt-1.5 border-t space-y-1.5 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-red-500 font-bold">{CHANNEL_HANDLE}</span>
                      <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>{video.publishedAt}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPlayingVideo(video)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Watch</span>
                      </button>

                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1 rounded-lg transition-colors cursor-pointer border ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white border-transparent'
                        }`}
                        title="Open on YouTube"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW - Compact Rows for Workspace Area */
        <div className="flex flex-col space-y-1.5">
          {filteredVideos.map((video, idx) => {
            const catObj = categories.find((c) => c.id === video.categoryId);
            const thumbUrl = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;

            return (
              <div
                key={video.id}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-xl transition-all border ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-red-300 shadow-xs'
                    : 'bg-[#18181b] hover:bg-[#1f1f23] border-white/10 hover:border-red-500/30 shadow-xs'
                }`}
              >
                {/* Left: Serial Index, Thumbnail & Video Details */}
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  {/* Row index */}
                  <span className={`text-[10px] font-mono font-bold w-5 text-center shrink-0 hidden sm:inline-block ${
                    isLight ? 'text-slate-500' : 'text-zinc-500'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Compact Thumbnail with play button */}
                  <div
                    className="relative w-24 sm:w-28 aspect-video bg-[#0c0c0e] rounded-lg overflow-hidden shrink-0 cursor-pointer shadow-xs"
                    onClick={() => setPlayingVideo(video)}
                  >
                    <img
                      src={thumbUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider border shrink-0"
                        style={{
                          backgroundColor: `${catObj?.color || '#f59e0b'}15`,
                          color: catObj?.color || '#f59e0b',
                          borderColor: `${catObj?.color || '#f59e0b'}40`
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: catObj?.color || '#f59e0b' }}
                        />
                        <span>{catObj?.name || 'General'}</span>
                      </span>

                      <span className={`text-[9px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                        {video.publishedAt}
                      </span>
                    </div>

                    <h4
                      onClick={() => setPlayingVideo(video)}
                      className={`text-xs font-bold transition-colors truncate cursor-pointer leading-tight ${
                        isLight ? 'text-slate-900 hover:text-red-600' : 'text-white hover:text-red-400'
                      }`}
                      title={video.title}
                    >
                      {video.title}
                    </h4>

                    {video.description && (
                      <p className="text-[10px] text-zinc-400 line-clamp-1 leading-normal">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pl-1">
                  <button
                    type="button"
                    onClick={() => setPlayingVideo(video)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Watch</span>
                  </button>

                  <a
                    href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteVideo(video.id, video.title, e)}
                    className="p-1 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CATEGORY MANAGEMENT MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181b] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manage Categories</h3>
                  <p className="text-[11px] text-zinc-400">
                    Create, edit, or delete categories for your video lectures.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create New Category Form */}
            <form onSubmit={handleAddCategory} className="p-3.5 rounded-2xl bg-[#121214] border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-red-400" />
                <span>Add New Category</span>
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category Name (e.g., TSPSC General Studies)"
                  className="flex-1 w-full px-3 py-2 bg-[#18181b] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                />

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {PRESET_COLORS.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        newCatColor === color ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={color}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shrink-0"
                >
                  Create
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Existing Categories ({categories.length})
              </h4>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const videoCount = videos.filter((v) => v.categoryId === cat.id).length;
                  const isEditing = editingCatId === cat.id;

                  if (isEditing) {
                    return (
                      <div
                        key={cat.id}
                        className="p-3 rounded-xl bg-[#121214] border border-red-500/40 space-y-2.5 animate-fade-in"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[#18181b] border border-white/20 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditCategory(cat.id)}
                            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Color Selector for Edit */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-zinc-400">Color:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditCatColor(c)}
                                style={{ backgroundColor: c }}
                                className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                                  editCatColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#121214] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-semibold text-white truncate">
                          {cat.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-zinc-400 font-mono shrink-0">
                          {videoCount} video{videoCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                          title="Rename / Change Color"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 cursor-pointer transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                }}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD VIDEO MODAL */}
      {isAddVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181b] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-white">Add Video Lecture</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVideoModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVideoSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Video Link, YouTube URL, Shorts, or ID *
                </label>
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="Paste YouTube watch URL, Shorts, MP4, or any video link..."
                  className="w-full px-3 py-2 bg-[#121214] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Video Title (Optional)</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    Auto-fetched if left blank
                  </span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Auto-detected from YouTube if empty"
                  className="w-full px-3 py-2 bg-[#121214] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddVideoModalOpen(false);
                      setIsCategoryModalOpen(true);
                    }}
                    className="text-[11px] text-red-400 hover:underline cursor-pointer"
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Key concepts, topics, or notes for this class..."
                  className="w-full px-3 py-2 bg-[#121214] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {formError && <p className="text-xs text-red-400">{formError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVideoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingMeta}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer"
                >
                  {isFetchingMeta ? 'Fetching details...' : 'Add Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. IN-APP YOUTUBE EMBEDDED PLAYER MODAL */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="w-full max-w-4xl bg-[#141416] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-[#18181b] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#ff0000] text-white flex items-center justify-center shrink-0">
                  <Youtube className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate max-w-lg">
                    {playingVideo.title}
                  </h4>
                  <span className="text-[11px] text-red-400 font-mono">
                    NewGen eEducation • {CHANNEL_HANDLE}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {extractYouTubeId(playingVideo.youtubeId || playingVideo.videoUrl || '') ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${extractYouTubeId(playingVideo.youtubeId || playingVideo.videoUrl || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 hover:text-white cursor-pointer"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <a
                    href={playingVideo.videoUrl || playingVideo.youtubeId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 hover:text-white cursor-pointer"
                  >
                    <span>Open Video Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setPlayingVideo(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded Video Player: YouTube (Videos & Shorts), Direct HTML5 video, Vimeo, or Generic */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {playingVideo.videoType === 'direct' || /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(playingVideo.videoUrl || playingVideo.youtubeId) ? (
                <video
                  src={playingVideo.videoUrl || playingVideo.youtubeId}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              ) : playingVideo.videoType === 'vimeo' ? (
                <iframe
                  src={playingVideo.videoUrl || `https://player.vimeo.com/video/${playingVideo.youtubeId}?autoplay=1`}
                  title={playingVideo.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : extractYouTubeId(playingVideo.youtubeId || playingVideo.videoUrl || '') ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(playingVideo.youtubeId || playingVideo.videoUrl || '')}?autoplay=1&rel=0&modestbranding=1`}
                  title={playingVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <iframe
                  src={playingVideo.videoUrl || playingVideo.youtubeId}
                  title={playingVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}
            </div>

            {/* Video Footer info */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 bg-[#141416]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">{playingVideo.title}</h3>
                {playingVideo.categoryId && (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      color: categories.find((c) => c.id === playingVideo.categoryId)?.color || '#f59e0b',
                      borderColor: `${categories.find((c) => c.id === playingVideo.categoryId)?.color || '#f59e0b'}40`,
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    }}
                  >
                    {categories.find((c) => c.id === playingVideo.categoryId)?.name || 'General'}
                  </span>
                )}
              </div>

              {playingVideo.description && (
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
                  {playingVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
