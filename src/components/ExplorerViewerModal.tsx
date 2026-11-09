import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExplorerFile, WebAppItem } from '../types/explorer';
import { getFileBlob, storeFileBlob, formatFileSize } from '../utils/explorerStorage';
import { idbGetItemSync, idbSetItem } from '../utils/indexedDBStorage';
import { detectHeaderRowIndex, inferColumnType } from '../utils/excelImport';
import { Register, ColumnDef, RowData } from '../types/register';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import { PDFDocumentViewer } from './PDFDocumentViewer';
import { SubWindowDrawCanvas } from './SubWindowDrawCanvas';
import {
  X,
  Minus,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  FileSpreadsheet,
  FileCode,
  Music,
  Video,
  Image as ImageIcon,
  Copy,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Table2,
  Sparkles,
  BookOpen,
  Printer,
  Search,
  ArrowRight,
  Info,
  Upload,
  AlertTriangle,
  PenTool,
  ListMusic,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Disc3
} from 'lucide-react';

interface ParsedExcelState {
  sheets: string[];
  activeSheet: string;
  rawRows: any[][];
  titleLines: string[];
  headers: string[];
  dataRows: any[][];
  headerRowIndex: number;
  columnWidths: number[];
  workbook?: XLSX.WorkBook;
}

interface ExplorerViewerModalProps {
  item: ExplorerFile | WebAppItem | null;
  onClose: () => void;
  lang?: 'en' | 'te';
  onImportToAppRegister?: (newRegister: Register) => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  onToggleDraw?: () => void;
  isDrawActive?: boolean;
  allFolderFiles?: ExplorerFile[];
  onSelectTrack?: (file: ExplorerFile) => void;
}

export const ExplorerViewerModal: React.FC<ExplorerViewerModalProps> = ({
  item,
  onClose,
  lang = 'en',
  onImportToAppRegister,
  onMinimize,
  isMinimized = false,
  onToggleDraw,
  isDrawActive = false,
  allFolderFiles = [],
  onSelectTrack,
}) => {
  if (!item) return null;

  const isWebApp = 'url' in item && 'launchMode' in item;
  const file = isWebApp ? null : (item as ExplorerFile);
  const webApp = isWebApp ? (item as WebAppItem) : null;
  const isExcelFile = Boolean(file && (file.category === 'excel' || ['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(file.extension)));

  // Blob URL state for local uploaded files
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Excel Spreadsheet State
  const [excelState, setExcelState] = useState<ParsedExcelState | null>(null);
  const [manualHeaderIdx, setManualHeaderIdx] = useState<number | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  // Word (.docx) HTML State
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [wordStats, setWordStats] = useState<{ words: number; chars: number } | null>(null);

  // Image states
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  // Sub-Window Integrated Drawing Layer
  const [isSubWindowDrawActive, setIsSubWindowDrawActive] = useState(false);
  const documentContentRef = useRef<HTMLDivElement | null>(null);

  // Audio / Video states & Queue
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState(true);

  // Folder Media Playlist Queue (All songs or videos in the same current folder)
  const folderMediaFiles = useMemo(() => {
    if (!file) return [];
    const matched = allFolderFiles.filter((f) => f.category === file.category);
    if (!matched.some((f) => f.id === file.id)) {
      return [file, ...matched];
    }
    return matched;
  }, [allFolderFiles, file]);

  const currentTrackIndex = useMemo(() => {
    if (!file) return -1;
    return folderMediaFiles.findIndex((f) => f.id === file.id);
  }, [folderMediaFiles, file]);

  const handleNextTrack = () => {
    if (folderMediaFiles.length <= 1) return;
    if (isShuffle) {
      const candidates = folderMediaFiles.filter((f) => f.id !== file?.id);
      const randomTrack = candidates[Math.floor(Math.random() * candidates.length)];
      if (randomTrack && onSelectTrack) {
        onSelectTrack(randomTrack);
      }
    } else {
      const nextIdx = (currentTrackIndex + 1) % folderMediaFiles.length;
      if (onSelectTrack) {
        onSelectTrack(folderMediaFiles[nextIdx]);
      }
    }
  };

  const handlePrevTrack = () => {
    if (mediaRef.current && mediaRef.current.currentTime > 3) {
      mediaRef.current.currentTime = 0;
      return;
    }
    if (folderMediaFiles.length <= 1) return;
    const prevIdx = (currentTrackIndex - 1 + folderMediaFiles.length) % folderMediaFiles.length;
    if (onSelectTrack) {
      onSelectTrack(folderMediaFiles[prevIdx]);
    }
  };

  // Helper to process sheet rows into titleLines, headers, dataRows, columnWidths
  const processSheetData = (rawRows: any[][], sheetNames: string[], activeSheet: string, wb?: XLSX.WorkBook, forcedHeaderIdx?: number): ParsedExcelState => {
    const worksheet = wb?.Sheets[activeSheet];
    const detectedIdx = forcedHeaderIdx !== undefined ? forcedHeaderIdx : detectHeaderRowIndex(rawRows, worksheet);
    const headerRowIndex = Math.min(Math.max(0, detectedIdx), Math.max(0, rawRows.length - 1));

    // Extract title lines (rows 0 to headerRowIndex - 1)
    const titleLines: string[] = [];
    for (let r = 0; r < headerRowIndex; r++) {
      const row = rawRows[r] || [];
      const lineText = row
        .filter((c: any) => c !== null && c !== undefined && String(c).trim() !== '')
        .map((c: any) => String(c).trim())
        .join(' • ');
      if (lineText) {
        titleLines.push(lineText);
      }
    }

    // Extract headers
    const rawHeaderRow = rawRows[headerRowIndex] || [];
    // Max cols across first 30 rows to ensure no columns are missed
    const maxCols = Math.max(
      rawHeaderRow.length,
      ...rawRows.slice(headerRowIndex, headerRowIndex + 30).map((r) => r.length)
    );

    const headers: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const val = rawHeaderRow[c];
      const str = val !== null && val !== undefined ? String(val).trim() : '';
      headers.push(str || `Column ${c + 1}`);
    }

    // Extract data rows
    const dataRows = rawRows.slice(headerRowIndex + 1);

    // Auto-calculate column widths
    const columnWidths = headers.map((h, cIdx) => {
      const headerLen = String(h).length;
      let maxDataLen = headerLen;
      // sample up to 40 data rows
      for (let r = 0; r < Math.min(40, dataRows.length); r++) {
        const cell = dataRows[r]?.[cIdx];
        if (cell !== undefined && cell !== null) {
          const l = String(cell).trim().length;
          if (l > maxDataLen) maxDataLen = l;
        }
      }
      // ~9.5px per character + padding, bounded between 80px and 450px
      return Math.max(80, Math.min(450, Math.round(maxDataLen * 9.5 + 28)));
    });

    return {
      sheets: sheetNames,
      activeSheet,
      rawRows,
      titleLines,
      headers,
      dataRows,
      headerRowIndex,
      columnWidths,
      workbook: wb,
    };
  };

  // Load file content (Excel, Word docx, Media, PDF, Text)
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadContent = async () => {
      setLoading(true);
      setExcelState(null);
      setWordHtml(null);
      setWordStats(null);
      setManualHeaderIdx(null);

      if (webApp) {
        setLoading(false);
        return;
      }

      if (file) {
        let blob: Blob | null = null;
        if (file.blobKey || file.id) {
          blob = await getFileBlob(file.blobKey || file.id);
        }

        // If blob not in IDB/memory, check if file.url contains Data URL or Object URL
        if (!blob && file.url) {
          try {
            const res = await fetch(file.url);
            blob = await res.blob();
          } catch {}
        }

        let parsedExcelResult: ParsedExcelState | null = null;

        if (blob && active) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);

          const isExcel = file.category === 'excel' || ['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(file.extension);
          const isWord = file.category === 'word' || ['docx', 'doc'].includes(file.extension);

          // 1. Process Excel Spreadsheet
          if (isExcel) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const workbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellDates: true,
                dateNF: 'yyyy-mm-dd',
              });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false,
              });

              parsedExcelResult = processSheetData(rawRows, workbook.SheetNames, firstSheetName, workbook);
              setExcelState(parsedExcelResult);
            } catch (e) {
              console.error('Failed to parse excel blob with XLSX', e);
            }
          }

          // 2. Process Word (.docx) with mammoth
          if (isWord && file.extension === 'docx') {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              if (active) {
                setWordHtml(result.value);
                const textOnly = result.value.replace(/<[^>]+>/g, ' ');
                const words = textOnly.trim().split(/\s+/).filter(Boolean).length;
                setWordStats({ words, chars: textOnly.length });
              }
            } catch (e) {
              console.error('Failed to parse docx with mammoth', e);
            }
          }
        } else if (file.url) {
          setBlobUrl(file.url);
        }

        // Fallback ONLY for plain-text CSV/TSV if binary blob was unavailable
        // NEVER parse binary files (.xlsx / .xls) with textPreview!
        if (!parsedExcelResult && file.textPreview && (file.extension === 'csv' || file.extension === 'tsv')) {
          try {
            const rawRows = file.textPreview.split('\n').map((l) => l.split(','));
            parsedExcelResult = processSheetData(rawRows, ['Sheet1'], 'Sheet1');
            setExcelState(parsedExcelResult);
          } catch {}
        }
      }

      if (active) setLoading(false);
    };

    loadContent();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file?.id, webApp?.id]);

  // Handle Sheet Switch for Excel
  const handleSwitchExcelSheet = (sheetName: string) => {
    if (!excelState?.workbook) return;
    const worksheet = excelState.workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const parsed = processSheetData(rawRows, excelState.sheets, sheetName, excelState.workbook);
    setExcelState(parsed);
    setManualHeaderIdx(null);
  };

  // Handle Manual Header Row Change
  const handleChangeHeaderRow = (newIdx: number) => {
    if (!excelState) return;
    setManualHeaderIdx(newIdx);
    const parsed = processSheetData(
      excelState.rawRows,
      excelState.sheets,
      excelState.activeSheet,
      excelState.workbook,
      newIdx
    );
    setExcelState(parsed);
  };

  // Handle manual file selection if blob was missing in browser storage
  const handleRecoverExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (!chosen || !file) return;

    try {
      setLoading(true);
      await storeFileBlob(file.blobKey || file.id, chosen);
      const arrayBuffer = await chosen.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        dateNF: 'yyyy-mm-dd',
      });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      const parsed = processSheetData(rawRows, workbook.SheetNames, firstSheetName, workbook);
      setExcelState(parsed);
      const newUrl = URL.createObjectURL(chosen);
      setBlobUrl(newUrl);
    } catch (err) {
      console.error('Failed to parse selected Excel file', err);
    } finally {
      setLoading(false);
    }
  };

  // Universal source file re-upload/recovery
  const handleReuploadSourceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (!chosen || !file) return;

    try {
      setLoading(true);
      await storeFileBlob(file.blobKey || file.id, chosen);
      const newUrl = URL.createObjectURL(chosen);
      setBlobUrl(newUrl);

      const isExcel = file.category === 'excel' || ['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(file.extension);
      const isWord = file.category === 'word' || ['docx', 'doc'].includes(file.extension);

      if (isExcel) {
        try {
          const arrayBuffer = await chosen.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });
          const parsed = processSheetData(rawRows, workbook.SheetNames, firstSheet, workbook);
          setExcelState(parsed);
        } catch {}
      } else if (isWord && file.extension === 'docx') {
        try {
          const arrayBuffer = await chosen.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setWordHtml(result.value);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to recover source file', err);
    } finally {
      setLoading(false);
    }
  };

  const isBinary = Boolean(
    file &&
      ['xlsx', 'xls', 'docx', 'doc', 'pdf', 'ppt', 'pptx', 'mp4', 'webm', 'mp3', 'wav', 'png', 'jpg', 'jpeg'].includes(
        file.extension.toLowerCase()
      )
  );
  const hasUsableSource = Boolean(blobUrl || file?.url || (file?.textPreview && !isBinary));

  // Action: Open in Local Table / Import as Register
  const handleOpenAsLocalTable = () => {
    if (!excelState || !file) return;

    const regTitle = excelState.titleLines[0] || file.name.replace(/\.[^/.]+$/, '');
    const columns: ColumnDef[] = excelState.headers.map((h, i) => {
      const sampleValues = excelState.dataRows.slice(0, 30).map((r) => r[i]);
      const inferred = inferColumnType(sampleValues);
      return {
        id: `col_${Date.now()}_${i + 1}`,
        name: h || `Column ${i + 1}`,
        type: inferred.type,
        options: inferred.options,
        unit: inferred.unit,
      };
    });

    const rows: RowData[] = excelState.dataRows.map((r, rIdx) => {
      const rowObj: RowData = { id: `row_${Date.now()}_${rIdx + 1}` };
      columns.forEach((col, cIdx) => {
        rowObj[col.id] = r[cIdx] !== undefined && r[cIdx] !== null ? r[cIdx] : '';
      });
      return rowObj;
    });

    const newRegister: Register = {
      id: `reg_${Date.now()}`,
      title: regTitle,
      titleTe: '',
      description: excelState.titleLines.slice(1).join(' • ') || 'Imported from Excel spreadsheet',
      descriptionTe: '',
      category: 'custom',
      columns,
      rows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFileName: file.name,
      sheetName: excelState.activeSheet,
      isExcelUpload: true,
    };

    if (onImportToAppRegister) {
      onImportToAppRegister(newRegister);
      onClose();
    } else {
      // Direct IndexedDB fallback
      try {
        const stored = idbGetItemSync<any[]>('dyn_registers_data_v3', []);
        const list = Array.isArray(stored) ? [...stored] : [];
        list.push(newRegister);
        idbSetItem('dyn_registers_data_v3', list);
        idbSetItem('dyn_active_reg_id_v3', newRegister.id);
        window.location.reload();
      } catch (err) {
        console.error('Failed to save imported register', err);
      }
    }
  };

  // Copy text or link
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Handler
  const handleDownload = async () => {
    if (webApp) {
      window.open(webApp.url, '_blank');
      return;
    }
    if (!file) return;

    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (file.textPreview && !isBinary) {
      const blob = new Blob([file.textPreview], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert(
        lang === 'te'
          ? 'సోర్స్ ఫైల్ అందుబాటులో లేదు. దయచేసి ఫైల్‌ను మళ్లీ అప్‌లోడ్ చేయండి.'
          : 'Source file is not available on this device storage. Please re-upload the file to download.'
      );
    }
  };

  // Time formatter
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered Excel data rows for preview table search
  const displayedDataRows = useMemo(() => {
    if (!excelState) return [];
    if (!tableSearch.trim()) return excelState.dataRows;
    const q = tableSearch.toLowerCase();
    return excelState.dataRows.filter((row) =>
      row.some((cell) => cell !== undefined && cell !== null && String(cell).toLowerCase().includes(q))
    );
  }, [excelState, tableSearch]);

  const effectiveUrl = blobUrl || file?.url || webApp?.url;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xl p-2 sm:p-4 md:p-6 lg:p-8 animate-in fade-in duration-200 ${
        isMinimized ? 'hidden pointer-events-none' : ''
      }`}
    >
      <div
        className={`bg-[#18181b] border border-white/15 rounded-2xl shadow-2xl flex flex-col transition-all duration-200 mx-auto ${
          isFullscreen ? 'w-full min-h-screen rounded-none border-none' : 'w-full max-w-6xl min-h-[500px]'
        }`}
      >
        {/* Top Header Bar - Sticky so controls remain accessible during scrolling */}
        <div className="sticky top-0 z-30 h-14 px-4 bg-[#202024]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            {isWebApp ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shrink-0">
                {webApp?.icon || '🌐'}
              </div>
            ) : file?.category === 'excel' ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            ) : file?.category === 'word' ? (
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            ) : file?.category === 'pdf' ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            ) : file?.category === 'audio' ? (
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4" />
              </div>
            ) : file?.category === 'video' ? (
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
            ) : file?.category === 'image' ? (
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate max-w-lg">
                {isWebApp ? webApp?.name : file?.name}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                {isWebApp ? (
                  <span className="text-emerald-400 font-mono truncate max-w-xs">{webApp?.url}</span>
                ) : (
                  <>
                    <span className="uppercase font-semibold text-zinc-300">{file?.extension}</span>
                    <span>•</span>
                    <span>{file?.size ? formatFileSize(file.size) : 'External'}</span>
                    {wordStats && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400 font-medium">{wordStats.words} words</span>
                      </>
                    )}
                    {excelState && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">{excelState.dataRows.length} rows</span>
                        <span>•</span>
                        <span className="text-zinc-400">{excelState.headers.length} columns</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action for Excel: Open as Local Table / Import as Register */}
            {excelState && (
              <button
                type="button"
                onClick={handleOpenAsLocalTable}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40"
                title="Import this Excel spreadsheet directly into the Data Table / Register workspace"
              >
                <Table2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">
                  {lang === 'te' ? 'డేటా టేబుల్‌లో తెరవండి (ఇంపోర్ట్)' : 'Open in Data Table'}
                </span>
                <span className="sm:hidden">Import Table</span>
              </button>
            )}

            {!isWebApp && (
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a84ff] hover:bg-blue-600 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                title="Download this file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'te' ? 'డౌన్‌లోడ్' : 'Download'}</span>
              </button>
            )}

            {/* 🎨 Draw Screen Tool on Every Window */}
            <button
              type="button"
              onClick={() => {
                // If main screen draw overlay is currently open, turn it off so they don't conflict or duplicate
                if (isDrawActive && onToggleDraw) {
                  onToggleDraw();
                }
                setIsSubWindowDrawActive((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                isSubWindowDrawActive
                  ? 'bg-amber-500 text-slate-900 shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
              }`}
              title={isSubWindowDrawActive ? 'Close Sub-Window Drawing Tool' : 'Open Drawing Tool on this window'}
              aria-label="Draw Screen Tool"
            >
              <PenTool className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
              <span className="hidden sm:inline">{isSubWindowDrawActive ? 'Drawing ON' : 'Draw'}</span>
            </button>

            {/* 1. Minimize Window to Taskbar (Windows Explorer Style) */}
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={lang === 'te' ? 'క్రింది టాస్క్‌బార్‌కి మినిమైజ్ చేయండి (Minimize)' : 'Minimize to Taskbar'}
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            {/* 2. Maximize / Restore Window */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* 3. Close Window */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body - Expands naturally with no internal scrollbars! */}
        <div
          ref={documentContentRef}
          className="flex-1 w-full bg-[#121214] relative flex flex-col min-h-[500px]"
        >
          {/* Sub-Window Integrated Drawing Layer */}
          <SubWindowDrawCanvas
            isActive={isSubWindowDrawActive}
            onClose={() => setIsSubWindowDrawActive(false)}
            windowId={file?.id || webApp?.id || 'subwindow'}
            documentTitle={file?.name || webApp?.name || 'Document'}
            containerRef={documentContentRef}
            lang={lang}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-xs font-medium">Loading content...</span>
            </div>
          ) : isWebApp ? (
            /* 🌐 Web App Direct Launcher */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#1c1c1f]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-4 shadow-xl">
                {webApp?.icon || '🌐'}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{webApp?.name}</h3>
              <p className="text-xs text-emerald-400 font-mono mb-4 max-w-md truncate">{webApp?.url}</p>
              <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                {lang === 'te'
                  ? 'భద్రతా కారణాల వల్ల వెబ్‌సైట్‌లు ఇన్‌బిల్ట్ ప్రివ్యూలో ఓపెన్ కావు. ఈ లింక్ నేరుగా మీ బ్రౌజర్ కొత్త ట్యాబ్‌లో ఓపెన్ అవుతుంది.'
                  : 'Web apps open directly in your browser tab to prevent connection refusal and security errors.'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.open(webApp?.url, '_blank', 'noopener,noreferrer');
                    onClose();
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{lang === 'te' ? 'బ్రౌజర్‌లో తెరవండి' : 'Open in Browser Tab'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  {lang === 'te' ? 'మూసివేయి' : 'Close'}
                </button>
              </div>
            </div>
          ) : !hasUsableSource ? (
            /* ⚠️ Source File Unavailable Alert Screen */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#151518]">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-xl">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-1.5">
                {lang === 'te' ? 'హార్డ్ డిస్క్ / స్టోరేజ్ లోపం' : 'Hard Disk / Storage Alert'}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 max-w-md truncate">
                {lang === 'te' ? 'ఫైల్ డిలీట్ అయింది' : 'File Was Deleted or Moved'}
              </h3>
              <p className="text-xs text-zinc-400 mb-2 font-mono">
                {file?.name}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-400 mb-4">
                <span>{file?.extension?.toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(file?.size || 0)}</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mb-6 leading-relaxed">
                {lang === 'te'
                  ? 'ఈ ఫైల్ హార్డ్ డిస్క్ లేదా డివైస్ స్టోరేజ్ నుండి డిలీట్ చేయబడింది లేదా లొకేషన్ నుండి తరలించబడింది. దయచేసి ఒరిజినల్ ఫైల్‌ను మళ్లీ అప్‌లోడ్ చేయండి.'
                  : 'This file was deleted from your hard disk / device storage or was moved from this location. Please re-upload the source file to open or download.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{lang === 'te' ? 'ఫైల్‌ను మళ్లీ అప్‌లోడ్ చేయండి' : 'Re-Upload Source File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleReuploadSourceFile}
                  />
                </label>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {lang === 'te' ? 'మూసివేయి' : 'Close'}
                </button>
              </div>
            </div>
          ) : excelState ? (
            /* ========================================================
               📊 EXCEL VIEWER: SEPARATE REPORT TITLES & AUTO-FITTED TABLE
               ======================================================== */
            <div className="w-full flex flex-col bg-[#161619]">
              {/* 1. Dedicated Excel Report Titles Banner (Above Headers) */}
              {excelState.titleLines.length > 0 && (
                <div className="px-5 py-3.5 bg-gradient-to-r from-[#1c1c22] via-[#222228] to-[#1c1c22] border-b border-white/10 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          Report Title / శీర్షిక
                        </span>
                        <span className="text-[11px] text-zinc-500 hidden sm:inline">
                          (Detected row {excelState.titleLines.length > 1 ? `1-${excelState.titleLines.length}` : '1'} above table headers)
                        </span>
                      </div>
                      {/* Main Title Banner */}
                      <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight break-words">
                        {excelState.titleLines[0]}
                      </h3>
                      {/* Subtitle / Metadata Lines */}
                      {excelState.titleLines.slice(1).map((subLine, idx) => (
                        <p key={idx} className="text-xs text-zinc-300 mt-1 font-medium leading-snug">
                          {subLine}
                        </p>
                      ))}
                    </div>

                    {/* Quick Import Button right next to title */}
                    <button
                      type="button"
                      onClick={handleOpenAsLocalTable}
                      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shrink-0"
                      title="Import into Local Data Table"
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      <span>{lang === 'te' ? 'టేబుల్‌లో తెరవండి' : 'Open in Table'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Worksheets Bar & Table Controls */}
              <div className="px-4 py-2 bg-[#202024] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
                {/* Left: Worksheet Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
                    Worksheets:
                  </span>
                  {excelState.sheets.map((sheet) => (
                    <button
                      key={sheet}
                      type="button"
                      onClick={() => handleSwitchExcelSheet(sheet)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        excelState.activeSheet === sheet
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/30'
                          : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>

                {/* Right: Header Row Selector & Table Search */}
                <div className="flex items-center gap-2 ml-auto">
                  {/* Header Row Selector Dropdown */}
                  <div className="flex items-center gap-1.5 bg-[#141416] border border-white/10 rounded-xl px-2 py-1">
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">Header at:</span>
                    <select
                      value={excelState.headerRowIndex}
                      onChange={(e) => handleChangeHeaderRow(Number(e.target.value))}
                      className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: Math.min(10, excelState.rawRows.length) }, (_, i) => (
                        <option key={i} value={i} className="bg-[#1c1c1f]">
                          Row {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search inside table */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Filter records..."
                      className="w-32 sm:w-44 pl-8 pr-2 py-1 bg-[#141416] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Auto-Fitted Spreadsheet Table Grid (Full Document Length, No Internal Scrollbars) */}
              <div className="w-full overflow-x-auto select-text">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  {/* Table Headers */}
                  <thead className="bg-[#242428] text-white font-bold sticky top-14 z-20 shadow-md">
                    <tr className="border-b border-white/15">
                      {/* Fixed Row # Column */}
                      <th className="w-12 py-2.5 px-3 text-center font-mono text-[11px] text-zinc-400 bg-[#1c1c20] border-r border-white/10 sticky left-0 z-30 select-none">
                        #
                      </th>
                      {excelState.headers.map((colName, cIdx) => {
                        const colWidth = excelState.columnWidths[cIdx] || 120;
                        return (
                          <th
                            key={cIdx}
                            style={{ minWidth: colWidth, width: colWidth }}
                            className="py-2.5 px-3.5 border-r border-white/10 text-white font-bold whitespace-nowrap truncate bg-[#242428] group"
                            title={colName}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate">{colName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono opacity-60">
                                {String.fromCharCode(65 + (cIdx % 26))}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Table Data Rows */}
                  <tbody className="divide-y divide-white/5">
                    {displayedDataRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={excelState.headers.length + 1}
                          className="py-12 text-center text-zinc-400 text-xs"
                        >
                          No matching records found
                        </td>
                      </tr>
                    ) : (
                      displayedDataRows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`hover:bg-white/[0.04] transition-colors ${
                            rIdx % 2 === 1 ? 'bg-white/[0.015]' : ''
                          }`}
                        >
                          {/* Row Number */}
                          <td className="w-12 py-2 px-3 text-center font-mono text-[10px] text-zinc-500 bg-[#1a1a1e] border-r border-white/10 sticky left-0 z-10 select-none">
                            {rIdx + 1}
                          </td>
                          {excelState.headers.map((_, cIdx) => {
                            const cellValue = row[cIdx];
                            const strVal = cellValue !== undefined && cellValue !== null ? String(cellValue) : '';
                            const colWidth = excelState.columnWidths[cIdx] || 120;
                            return (
                              <td
                                key={cIdx}
                                style={{ minWidth: colWidth, width: colWidth }}
                                className="py-2 px-3.5 border-r border-white/5 text-zinc-200 whitespace-nowrap truncate font-normal"
                                title={strVal}
                              >
                                {strVal || <span className="text-zinc-600">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary Bar */}
              <div className="px-4 py-2 bg-[#1c1c20] border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">
                    {displayedDataRows.length} of {excelState.dataRows.length} rows
                  </span>
                  <span>•</span>
                  <span>{excelState.headers.length} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 hidden sm:inline">Sheet: {excelState.activeSheet}</span>
                  <button
                    type="button"
                    onClick={handleOpenAsLocalTable}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-sans cursor-pointer transition-all"
                  >
                    Import as Register
                  </button>
                </div>
              </div>
            </div>
          ) : isExcelFile ? (
            /* 📊 Excel File Recovery / Load Card */
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#161619]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {file?.name}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                {lang === 'te'
                  ? 'ఈ ఎక్సెల్ ఫైల్ ప్రివ్యూ చేయడానికి మరియు రిపోర్ట్ శీర్షికలతో సహా చూడటానికి ఫైల్‌ను ఎంచుకోండి.'
                  : 'Select this Excel spreadsheet from your device to load its worksheets, report titles, and table headers.'}
              </p>
              <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{lang === 'te' ? 'ఎక్సెల్ ఫైల్ ఎంచుకోండి' : 'Select Excel File to View'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleRecoverExcelFile}
                />
              </label>
            </div>
          ) : file?.category === 'word' || file?.extension === 'docx' || file?.extension === 'doc' ? (
            /* ========================================================
               📝 WORD (.DOCX / .DOC) VIEWER POWERED BY MAMMOTH (Full Length)
               ======================================================== */
            <div className="w-full flex flex-col bg-[#141417]">
              {/* Word Document Toolbar */}
              <div className="sticky top-14 z-20 px-4 py-2.5 bg-[#1c1c20]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between text-xs text-zinc-300 shrink-0 shadow-md">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white truncate max-w-sm">{file?.name}</span>
                  {wordStats && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-mono">
                      {wordStats.words} words
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (wordHtml) {
                        const tempEl = document.createElement('div');
                        tempEl.innerHTML = wordHtml;
                        handleCopy(tempEl.innerText);
                      } else if (file?.textPreview) {
                        handleCopy(file.textPreview);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy All Text'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Word</span>
                  </button>
                </div>
              </div>

              {/* Document Paper Container (Full document length, no internal scrollbar) */}
              <div className="w-full p-4 sm:p-8 flex justify-center bg-[#101013]">
                <div className="w-full max-w-4xl bg-[#1c1c22] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-12 text-zinc-100 select-text font-serif leading-relaxed">
                  {wordHtml ? (
                    <div
                      className="word-doc-content space-y-4"
                      dangerouslySetInnerHTML={{ __html: wordHtml }}
                    />
                  ) : file?.textPreview ? (
                    <div className="whitespace-pre-wrap font-sans text-xs text-zinc-200 leading-relaxed">
                      {file.textPreview}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-60" />
                      <h4 className="text-sm font-bold text-white mb-1">{file?.name}</h4>
                      <p className="text-xs text-zinc-400 mb-5">
                        Word document preview loaded. You can download the file to edit in Microsoft Word or Google Docs.
                      </p>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                      >
                        Download Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : file?.category === 'pdf' || file?.extension === 'pdf' ? (
            /* ========================================================
               📄 INBUILT PDF VIEWER POWERED BY PDF.JS (Full Document Length, No Internal Scrollbars)
               ======================================================== */
            <PDFDocumentViewer
              file={file}
              blobUrl={effectiveUrl}
              lang={lang}
              onDownload={handleDownload}
            />
          ) : file?.category === 'video' ? (
            /* 🎬 Inbuilt Video Player with Media Queue & Playlist */
            <div className="w-full h-full flex flex-col bg-black relative overflow-hidden">
              <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
                <video
                  ref={(el) => {
                    (mediaRef as any).current = el;
                  }}
                  src={effectiveUrl || undefined}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                  onEnded={() => {
                    if (isRepeat && mediaRef.current) {
                      mediaRef.current.currentTime = 0;
                      mediaRef.current.play();
                    } else if (folderMediaFiles.length > 1) {
                      handleNextTrack();
                    } else {
                      setIsPlaying(false);
                    }
                  }}
                />

                {/* Video Playlist Queue Overlay Drawer */}
                {showQueueDrawer && folderMediaFiles.length > 0 && (
                  <div className="absolute right-3 top-3 bottom-14 w-72 sm:w-80 bg-[#16161a]/95 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex flex-col shadow-2xl z-20 transition-all">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                      <div className="flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white">
                          Folder Queue ({folderMediaFiles.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQueueDrawer(false)}
                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white text-xs cursor-pointer"
                        title="Hide Queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                      {folderMediaFiles.map((vf, idx) => {
                        const isCurrent = vf.id === file.id;
                        return (
                          <div
                            key={vf.id}
                            onClick={() => onSelectTrack?.(vf)}
                            className={`p-2 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                              isCurrent
                                ? 'bg-purple-600/30 border border-purple-500/50 text-white shadow-sm'
                                : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-transparent'
                            }`}
                          >
                            <span className="font-mono text-[10px] w-4 text-center shrink-0 text-zinc-400">
                              {idx + 1}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center shrink-0 text-purple-400">
                              {isCurrent && isPlaying ? (
                                <Disc3 className="w-4 h-4 animate-spin text-purple-300" />
                              ) : (
                                <Video className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${isCurrent ? 'text-purple-200 font-bold' : ''}`}>
                                {vf.name}
                              </p>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {formatFileSize(vf.size)}
                              </span>
                            </div>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/40 text-purple-200 font-bold">
                                PLAYING
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Video Player Bottom Controls & Playlist Navigation */}
              <div className="h-14 w-full bg-[#18181b]/95 border-t border-white/10 px-4 flex items-center justify-between text-xs text-zinc-300 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-zinc-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  {folderMediaFiles.length > 1 && (
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={handlePrevTrack}
                        className="p-1 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
                        title="Previous Video in Folder"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTrack}
                        className="p-1 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
                        title="Next Video in Folder"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRepeat(!isRepeat)}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isRepeat ? 'bg-purple-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                    title={isRepeat ? 'Repeat ON' : 'Repeat OFF'}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isShuffle ? 'bg-purple-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                    title={isShuffle ? 'Shuffle ON' : 'Shuffle OFF'}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQueueDrawer(!showQueueDrawer)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      showQueueDrawer ? 'bg-purple-600 text-white' : 'bg-white/10 text-zinc-300 hover:text-white'
                    }`}
                    title="Toggle Video Queue"
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Queue ({folderMediaFiles.length})</span>
                  </button>

                  <div className="h-4 w-[1px] bg-white/15 mx-1" />

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400 hidden sm:inline">Speed:</span>
                    {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (mediaRef.current) mediaRef.current.playbackRate = rate;
                        }}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : file?.category === 'audio' ? (
            /* 🎵 Inbuilt Audio Player with Media Queue Playlist */
            <div className="w-full h-full flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#1c1c22] via-[#141418] to-[#0e0e11] gap-6 overflow-y-auto">
              {/* Left / Top: Active Player Card */}
              <div className="w-full max-w-md bg-[#24242c] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center shrink-0">
                <div
                  className={`w-28 sm:w-32 h-28 sm:h-32 rounded-full border-4 border-white/15 shadow-2xl flex items-center justify-center mb-5 relative ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '8s' }}
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 opacity-80" />
                  <div className="absolute w-12 h-12 rounded-full bg-[#1c1c20] border-2 border-white/20 flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white mb-1 truncate w-full px-2" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-xs text-purple-400 mb-5 font-medium truncate w-full">
                  {file.description || 'Audio Song / Recording'}
                </p>

                <audio
                  ref={(el) => {
                    (mediaRef as any).current = el;
                  }}
                  src={effectiveUrl || undefined}
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
                  onEnded={() => {
                    if (isRepeat && mediaRef.current) {
                      mediaRef.current.currentTime = 0;
                      mediaRef.current.play();
                    } else if (folderMediaFiles.length > 1) {
                      handleNextTrack();
                    } else {
                      setIsPlaying(false);
                    }
                  }}
                />

                {/* Progress bar */}
                <div className="w-full mb-4">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCurrentTime(val);
                      if (mediaRef.current) mediaRef.current.currentTime = val;
                    }}
                    className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Controls & Skip */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isShuffle ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={isShuffle ? 'Shuffle ON' : 'Shuffle OFF'}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrevTrack}
                    disabled={folderMediaFiles.length <= 1}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    title="Previous Track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (mediaRef.current) {
                        if (isPlaying) {
                          mediaRef.current.pause();
                        } else {
                          mediaRef.current.play();
                        }
                      }
                    }}
                    className="w-13 h-13 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextTrack}
                    disabled={folderMediaFiles.length <= 1}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    title="Next Track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRepeat(!isRepeat)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isRepeat ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={isRepeat ? 'Repeat ON' : 'Repeat OFF'}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub Controls: Mute & Speed */}
                <div className="flex items-center justify-between w-full pt-3 border-t border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (mediaRef.current) mediaRef.current.muted = !isMuted;
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                    <span className="text-[11px]">{isMuted ? 'Muted' : 'Volume'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {[1, 1.25, 1.5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (mediaRef.current) mediaRef.current.playbackRate = rate;
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right / Bottom: Folder Audio Queue List */}
              <div className="w-full max-w-md bg-[#1e1e24] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col h-[340px] shrink-0">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Folder Queue ({folderMediaFiles.length})
                    </h4>
                  </div>
                  {currentTrackIndex !== -1 && (
                    <span className="text-[11px] font-mono text-purple-300">
                      Playing {currentTrackIndex + 1} of {folderMediaFiles.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {folderMediaFiles.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                      No other songs in this folder
                    </div>
                  ) : (
                    folderMediaFiles.map((itemTrack, idx) => {
                      const isCurrent = itemTrack.id === file.id;
                      return (
                        <div
                          key={itemTrack.id}
                          onClick={() => onSelectTrack?.(itemTrack)}
                          className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer flex items-center gap-3 border ${
                            isCurrent
                              ? 'bg-purple-600/25 border-purple-500/50 text-white shadow-sm ring-1 ring-purple-400/30'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-transparent'
                          }`}
                        >
                          <span className="font-mono text-xs w-4 text-center shrink-0 text-zinc-400">
                            {idx + 1}
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                            {isCurrent && isPlaying ? (
                              <Disc3 className="w-4 h-4 animate-spin text-purple-300" />
                            ) : (
                              <Music className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isCurrent ? 'text-purple-200 font-bold' : ''}`}>
                              {itemTrack.name}
                            </p>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {formatFileSize(itemTrack.size)}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-purple-500/40 text-purple-200 font-bold shrink-0">
                              PLAYING
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : file?.category === 'image' ? (
            /* 🖼️ High-Res Image Viewer with Zoom & Rotate */
            <div className="w-full h-full flex flex-col justify-center items-center bg-[#0d0d0f] relative overflow-auto p-4">
              <div
                className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                }}
              >
                <img
                  src={effectiveUrl || undefined}
                  alt={file.name}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
                />
              </div>

              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#202024]/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs text-zinc-300 shadow-xl">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.2, z - 0.25))}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px] w-12 text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(4, z + 0.25))}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-white/15 mx-1" />
                <button
                  type="button"
                  onClick={() => setImageRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                  title="Rotate 90deg"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageZoom(1);
                    setImageRotation(0);
                  }}
                  className="px-2 py-1 text-[11px] bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            /* 💻 Text / Code / Note Document Viewer (Full Document Length) */
            <div className="w-full flex flex-col bg-[#141416]">
              <div className="sticky top-14 z-20 px-4 py-2 bg-[#1e1e22]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between text-xs text-zinc-400 shadow-md">
                <span className="font-mono text-zinc-300 font-semibold">{file?.name}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(file?.textPreview || '')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="w-full p-4 font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed select-text bg-[#0e0e10]">
                {file?.textPreview ||
                  '// No preview available for this file type.\nClick Download to save and open in your preferred desktop software.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
