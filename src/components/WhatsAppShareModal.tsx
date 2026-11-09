import React, { useState, useMemo, useEffect } from 'react';
import { Register, RowData, ColumnDef } from '../types/register';
import { Language } from '../utils/translations';
import { getRowCellValue } from '../utils/calculations';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  X,
  Copy,
  Check,
  Send,
  ExternalLink,
  MessageCircle,
  FileSpreadsheet,
  CheckSquare,
  Sparkles,
  Phone,
  Layers,
  ChevronRight,
  Info,
  FileDown
} from 'lucide-react';

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: Register;
  rows: RowData[];
  selectedIndices?: number[];
  initialSingleRow?: RowData | null;
  initialRowIndex?: number | null;
  lang?: Language;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  register,
  rows,
  selectedIndices = [],
  initialSingleRow = null,
  initialRowIndex = null,
  lang = 'en',
}) => {
  // Determine initial mode
  const initialMode = initialSingleRow
    ? 'single'
    : selectedIndices.length > 0
    ? 'selected'
    : 'summary';

  const [shareMode, setShareMode] = useState<'single' | 'selected' | 'summary' | 'full' | 'csv'>(initialMode);
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [includeStats, setIncludeStats] = useState<boolean>(true);
  const [includeEmptyCells, setIncludeEmptyCells] = useState<boolean>(false);
  const [maxRowsLimit, setMaxRowsLimit] = useState<number>(20);
  const [copied, setCopied] = useState<boolean>(false);
  const [csvDownloaded, setCsvDownloaded] = useState<boolean>(false);

  // Generate full CSV content of the entire register
  const csvFileName = useMemo(() => {
    const safeTitle = (register.title || 'register').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safeTitle}_all_data.csv`;
  }, [register.title]);

  const fullCsvContent = useMemo(() => {
    const headers = register.columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(',');
    const rowLines = rows.map((r) => {
      return register.columns
        .map((col) => {
          const val = getRowCellValue(r, col, register.columns);
          if (val === undefined || val === null) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });
    return [headers, ...rowLines].join('\n');
  }, [register.columns, rows]);

  const handleDownloadCsv = () => {
    const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCsvDownloaded(true);
    setTimeout(() => setCsvDownloaded(false), 3000);
  };

  // Auto-detect phone number if single row is provided
  useEffect(() => {
    if (initialSingleRow) {
      setShareMode('single');
      // Look for phone or mobile columns
      const phoneCol = register.columns.find((col) => {
        const name = col.name.toLowerCase();
        return (
          name.includes('phone') ||
          name.includes('mobile') ||
          name.includes('contact') ||
          name.includes('whatsapp') ||
          name.includes('cell')
        );
      });

      if (phoneCol && initialSingleRow[phoneCol.id]) {
        const raw = String(initialSingleRow[phoneCol.id]).trim();
        const cleaned = raw.replace(/[^0-9+]/g, '');
        if (cleaned.length >= 7) {
          setTargetPhone(cleaned);
          return;
        }
      }

      // Fallback search in values
      for (const col of register.columns) {
        const val = String(initialSingleRow[col.id] || '').trim();
        const digits = val.replace(/[^0-9]/g, '');
        if (digits.length === 10) {
          setTargetPhone(val.startsWith('+') ? val : `+91${digits}`);
          break;
        }
      }
    } else if (selectedIndices.length > 0) {
      setShareMode('selected');
    } else {
      setShareMode('summary');
    }
  }, [initialSingleRow, selectedIndices, register.columns]);

  // Clean phone number for WhatsApp URL
  const cleanedPhoneNumber = useMemo(() => {
    let p = targetPhone.replace(/[^0-9+]/g, '').trim();
    if (p.startsWith('+')) {
      p = p.substring(1);
    }
    // If 10 digits without country code, default to Indian prefix (+91)
    if (p.length === 10) {
      p = `91${p}`;
    }
    return p;
  }, [targetPhone]);

  // Generate formatted WhatsApp message text
  const messageText = useMemo(() => {
    const lines: string[] = [];
    const dateStr = new Date().toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Custom Note / Header
    if (customNote.trim()) {
      lines.push(customNote.trim());
      lines.push('');
    }

    if (shareMode === 'single' && initialSingleRow) {
      // 1. Single Record Format
      const rowIndex = initialRowIndex !== null ? initialRowIndex + 1 : 1;
      lines.push(`📋 *${register.title || 'Official Register'}*`);
      lines.push(`📌 *Record #${rowIndex}* · _${dateStr}_`);
      lines.push('─────────────────────');

      register.columns.forEach((col) => {
        const val = getRowCellValue(initialSingleRow, col, register.columns);
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
        if (hasVal || includeEmptyCells) {
          const displayVal = hasVal ? (col.unit ? `${col.unit} ${val}` : String(val)) : '-';
          lines.push(`*${col.name}*: ${displayVal}`);
        }
      });

      lines.push('─────────────────────');
      lines.push(`_Shared via LogiXGridOS_`);
    } else if (shareMode === 'summary') {
      // 2. Table Summary Format
      lines.push(`📊 *${register.title || 'Table Report'}*`);
      lines.push(`🗓 *Date*: ${dateStr}`);
      lines.push(`📁 *Category*: ${register.category ? register.category.toUpperCase() : 'General'}`);
      lines.push(`👥 *Total Records*: ${rows.length}`);
      lines.push('─────────────────────');

      if (includeStats) {
        // Find numeric columns for sum and averages
        const numericCols = register.columns.filter(
          (c) => c.type === 'number' || c.type === 'currency'
        );

        if (numericCols.length > 0) {
          lines.push('*Key Totals & Metrics:*');
          numericCols.slice(0, 5).forEach((col) => {
            let sum = 0;
            let count = 0;
            rows.forEach((r) => {
              const raw = r[col.id];
              if (raw !== undefined && raw !== null && raw !== '') {
                const n = Number(raw);
                if (!isNaN(n)) {
                  sum += n;
                  count++;
                }
              }
            });

            if (count > 0) {
              const formattedSum = col.unit ? `${col.unit} ${sum.toLocaleString()}` : sum.toLocaleString();
              lines.push(`• *${col.name} (Total)*: ${formattedSum}`);
            }
          });
          lines.push('─────────────────────');
        }
      }

      // Column overview list
      lines.push(`*Available Columns (${register.columns.length})*:`);
      const colNames = register.columns.map((c) => c.name).join(', ');
      lines.push(colNames);

      lines.push('─────────────────────');
      lines.push(`_Generated by LogiXGridOS_`);
    } else if (shareMode === 'selected') {
      // 3. Selected Records
      const selectedRows = rows.filter((r) => selectedIndices.includes(r.__originalIndex));
      lines.push(`📋 *${register.title}*`);
      lines.push(`⚡ *${selectedRows.length} Selected Record(s)* · _${dateStr}_`);
      lines.push('─────────────────────');

      selectedRows.forEach((row, i) => {
        lines.push(`*#${i + 1} Record*`);
        register.columns.slice(0, 6).forEach((col) => {
          const val = getRowCellValue(row, col, register.columns);
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            lines.push(`• *${col.name}*: ${col.unit ? `${col.unit} ` : ''}${val}`);
          }
        });
        if (i < selectedRows.length - 1) {
          lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
        }
      });

      lines.push('─────────────────────');
    } else if (shareMode === 'csv') {
      // 5. Entire Register CSV Export Format
      lines.push(`📎 *${register.title || 'Official Register'}* - Entire Register CSV Export`);
      lines.push(`📊 *Total Records*: ${rows.length} rows | ${register.columns.length} columns`);
      lines.push(`📁 *File*: ${csvFileName}`);
      lines.push(`🗓 *Exported on*: ${dateStr}`);
      lines.push('─────────────────────');
      lines.push(`✅ Complete .CSV file has been exported from LogiXGridOS.`);
      lines.push(`📁 Attach the downloaded file *${csvFileName}* to this chat.`);
      lines.push('─────────────────────');
      lines.push(`_Exported via LogiXGridOS_`);
    } else {
      // 4. Full / Truncated List
      const sliceRows = rows.slice(0, maxRowsLimit);
      lines.push(`📋 *${register.title}*`);
      lines.push(`📑 *Records List (${sliceRows.length} of ${rows.length})* · _${dateStr}_`);
      lines.push('─────────────────────');

      sliceRows.forEach((row, i) => {
        // pick primary 2-3 fields: e.g. admission no, name, father name, or first 3 columns
        const fields = register.columns
          .slice(0, 3)
          .map((col) => {
            const val = getRowCellValue(row, col, register.columns);
            return val !== undefined && val !== null && String(val).trim() !== ''
              ? `${col.name}: ${val}`
              : null;
          })
          .filter(Boolean);

        lines.push(`${i + 1}. ${fields.join(' | ')}`);
      });

      if (rows.length > maxRowsLimit) {
        lines.push(`\n_...and ${rows.length - maxRowsLimit} more records in LogiXGridOS_`);
      }

      lines.push('─────────────────────');
      lines.push(`_Shared via LogiXGridOS_`);
    }

    return lines.join('\n');
  }, [
    shareMode,
    register,
    rows,
    selectedIndices,
    initialSingleRow,
    initialRowIndex,
    customNote,
    includeStats,
    includeEmptyCells,
    maxRowsLimit,
    csvFileName,
    lang,
  ]);

  // Construct direct WhatsApp URLs
  const directWhatsAppUrl = useMemo(() => {
    const encoded = encodeURIComponent(messageText);
    if (cleanedPhoneNumber) {
      return `https://api.whatsapp.com/send?phone=${cleanedPhoneNumber}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }, [messageText, cleanedPhoneNumber]);

  const webWhatsAppUrl = useMemo(() => {
    const encoded = encodeURIComponent(messageText);
    if (cleanedPhoneNumber) {
      return `https://web.whatsapp.com/send?phone=${cleanedPhoneNumber}&text=${encoded}`;
    }
    return `https://web.whatsapp.com/send?text=${encoded}`;
  }, [messageText, cleanedPhoneNumber]);

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#1c1c1e] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-14 px-5 bg-[#242426] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <WhatsAppIcon className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{lang === 'te' ? 'వాట్సాప్‌లో షేర్ చేయండి' : 'Direct WhatsApp Share'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {register.title}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                {lang === 'te'
                  ? 'వన్-క్లిక్ ద్వారా రికార్డులను లేదా సారాంశాన్ని వాట్సాప్‌కు పంపండి'
                  : 'Send table summaries or entry records directly to WhatsApp'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. Share Mode Selection Tabs */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              {lang === 'te' ? 'షేర్ చేయాల్సిన కంటెంట్' : 'What do you want to share?'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {initialSingleRow && (
                <button
                  type="button"
                  onClick={() => setShareMode('single')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    shareMode === 'single'
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{lang === 'te' ? 'ఈ రికార్డ్' : 'This Record'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShareMode('csv')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  shareMode === 'csv'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'te' ? 'రిజిస్టర్ CSV ఫైల్' : 'Register CSV File'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShareMode('summary')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  shareMode === 'summary'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{lang === 'te' ? 'సారాంశం' : 'Table Summary'}</span>
              </button>

              {selectedIndices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShareMode('selected')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    shareMode === 'selected'
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    {lang === 'te' ? `ఎంపికైనవి (${selectedIndices.length})` : `Selected (${selectedIndices.length})`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShareMode('full')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  shareMode === 'full'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>{lang === 'te' ? 'జాబితా (List)' : 'Records List'}</span>
              </button>
            </div>
          </div>

          {/* 2. Recipient Phone Number & Custom Message */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'te' ? 'ఫోన్ నంబర్ (ఐచ్ఛికం)' : 'Recipient Phone (Optional)'}</span>
                </span>
                {cleanedPhoneNumber && (
                  <span className="text-[10px] text-emerald-400 font-mono">+{cleanedPhoneNumber}</span>
                )}
              </label>
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="e.g. 9876543210 or +91 9876543210"
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/15 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                {lang === 'te'
                  ? 'ఖాళీగా ఉంచితే, వాట్సాప్ కాంటాక్ట్ లిస్ట్ నుండి ఎంచుకోవచ్చు.'
                  : 'Leave blank to select contact/group inside WhatsApp.'}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'te' ? 'అదనపు సందేశం (ఐచ్ఛికం)' : 'Custom Greeting / Note'}</span>
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Please find the student report..."
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/15 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                {lang === 'te' ? 'సందేశం పైభాగంలో కనిపిస్తుంది' : 'Prepends greeting to top of WhatsApp text.'}
              </p>
            </div>
          </div>

          {/* Mode-specific Options */}
          {shareMode === 'csv' && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                    <span>{csvFileName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200">
                      {rows.length} rows · {register.columns.length} cols
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-300/80">
                    {lang === 'te'
                      ? 'పూర్తి రిజిస్టర్ CSV ఫైల్‌ను డౌన్‌లోడ్ చేసి వాట్సాప్ చాట్‌లో అటాచ్ చేయండి'
                      : 'Export entire register as .CSV and attach file directly into WhatsApp chat'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {csvDownloaded ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                  <span>{csvDownloaded ? (lang === 'te' ? 'డౌన్‌లోడ్ అయింది!' : 'Downloaded!') : (lang === 'te' ? 'CSV డౌన్‌లోడ్' : 'Download CSV')}</span>
                </button>
              </div>
            </div>
          )}

          {shareMode === 'summary' && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <input
                type="checkbox"
                id="waIncludeStats"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="waIncludeStats" className="text-zinc-300 font-medium cursor-pointer select-none">
                {lang === 'te' ? 'గణాంకాలు మరియు మొత్తం గణనలను చేర్చండి (Sums & Totals)' : 'Include calculated column totals & key metrics'}
              </label>
            </div>
          )}

          {shareMode === 'single' && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <input
                type="checkbox"
                id="waIncludeEmpty"
                checked={includeEmptyCells}
                onChange={(e) => setIncludeEmptyCells(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="waIncludeEmpty" className="text-zinc-300 font-medium cursor-pointer select-none">
                {lang === 'te' ? 'ఖాళీ నిలువు వరుసలను కూడా చూపించు' : 'Include empty/blank columns in message'}
              </label>
            </div>
          )}

          {shareMode === 'full' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="text-zinc-300 font-medium">
                {lang === 'te' ? 'గరిష్ట రికార్డులు:' : 'Max records to include:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[10, 20, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxRowsLimit(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      maxRowsLimit === num
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Live WhatsApp Chat Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-400" />
                <span>{lang === 'te' ? 'వాట్సాప్ ప్రివ్యూ' : 'WhatsApp Message Preview'}</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (lang === 'te' ? 'కాపీ అయింది!' : 'Copied!') : (lang === 'te' ? 'టెక్స్ట్ కాపీ చేయండి' : 'Copy Text')}</span>
              </button>
            </div>

            {/* WhatsApp Chat Bubble Mockup */}
            <div className="p-3.5 rounded-2xl bg-[#0b141a] border border-emerald-950 shadow-inner relative overflow-hidden">
              {/* WhatsApp chat background subtle pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#128c7e_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative max-w-lg ml-auto bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-xs shadow-md">
                <pre className="text-xs font-sans whitespace-pre-wrap break-words leading-relaxed select-text">
                  {messageText}
                </pre>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-200/80">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-emerald-300 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-[#242426] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-white/10 hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              title="Copy formatted text to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            {/* Web WhatsApp Direct Link */}
            <a
              href={webWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-white/10 hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              title="Open directly in WhatsApp Web in browser"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span>WhatsApp Web</span>
            </a>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {lang === 'te' ? 'రద్దు చేయండి' : 'Cancel'}
            </button>

            {/* Primary WhatsApp Action Link */}
            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (shareMode === 'csv') {
                  handleDownloadCsv();
                }
                setTimeout(onClose, 800);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-95 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer ring-1 ring-emerald-400/50"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>
                {shareMode === 'csv'
                  ? (lang === 'te' ? 'CSV డౌన్‌లోడ్ & వాట్సాప్ ఓపెన్' : 'Download CSV & Open WhatsApp')
                  : (lang === 'te' ? 'వాట్సాప్‌లో పంపండి' : 'Send via WhatsApp')}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
