import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Printer, Download, Image as ImageIcon, X, Check, FileText } from 'lucide-react';
import { ThemeId } from '../types/theme';

interface DrawPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  compositeDataUrl: string | null;
  lang?: 'en' | 'te';
  currentTheme?: ThemeId;
  registerTitle?: string;
}

export const DrawPrintModal: React.FC<DrawPrintModalProps> = ({
  isOpen,
  onClose,
  compositeDataUrl,
  lang = 'en',
  currentTheme,
  registerTitle = 'LogiXGridOS Screen Record',
}) => {
  const [docTitle, setDocTitle] = useState(registerTitle);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen || !compositeDataUrl) return null;

  const isLight =
    currentTheme === 'light' ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'light');

  // 1. Download as High-Resolution PDF
  const handleDownloadPDF = () => {
    try {
      setIsExporting(true);
      const img = new Image();
      img.onload = () => {
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        // Auto determine orientation if not forced
        const isLandscape = orientation === 'landscape';
        const pdf = new jsPDF({
          orientation: isLandscape ? 'l' : 'p',
          unit: 'pt',
          format: isLandscape ? [imgWidth, imgHeight] : [imgWidth, imgHeight],
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(compositeDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);

        // Optional title banner in PDF metadata
        const fileName = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
        pdf.save(fileName);

        setIsExporting(false);
        setExportSuccess(lang === 'te' ? 'పీడీఎఫ్ డౌన్‌లోడ్ పూర్తయింది!' : 'PDF downloaded successfully!');
        setTimeout(() => setExportSuccess(null), 3500);
      };
      img.src = compositeDataUrl;
    } catch (err) {
      console.error('PDF Export Error:', err);
      setIsExporting(false);
    }
  };

  // 2. Download as PNG Screenshot
  const handleDownloadPNG = () => {
    const a = document.createElement('a');
    a.href = compositeDataUrl;
    a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setExportSuccess(lang === 'te' ? 'ఇమేజ్ డౌన్‌లోడ్ పూర్తయింది!' : 'Image downloaded successfully!');
    setTimeout(() => setExportSuccess(null), 3500);
  };

  // 3. Print directly via styled print container
  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docTitle}</title>
            <style>
              @page {
                size: ${orientation};
                margin: 8mm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #ffffff;
                color: #000000;
              }
              .header {
                display: ${includeHeader ? 'flex' : 'none'};
                justify-content: space-between;
                align-items: center;
                padding-bottom: 8px;
                border-bottom: 2px solid #000;
                margin-bottom: 12px;
                font-size: 13px;
              }
              .header-title {
                font-weight: bold;
                font-size: 16px;
              }
              .header-date {
                font-family: monospace;
                font-size: 11px;
                color: #555;
              }
              .image-container {
                width: 100%;
                text-align: center;
              }
              img {
                max-width: 100%;
                height: auto;
                object-fit: contain;
                display: block;
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-title">${docTitle}</div>
              <div class="header-date">Captured: ${new Date().toLocaleString()}</div>
            </div>
            <div class="image-container">
              <img src="${compositeDataUrl}" />
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1500);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900'
            : 'bg-[#18181b] border-white/15 text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141416] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span>{lang === 'te' ? 'డ్రాయింగ్ స్క్రీన్ ప్రింట్ & పీడీఎఫ్ డౌన్‌లోడ్' : 'Print & PDF Download with Drawing'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  MS Excel Ink Ready
                </span>
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {lang === 'te'
                  ? 'మీ స్క్రీన్ రికార్డ్ మరియు గీసిన అన్ని డ్రాయింగ్స్ కలిసి ప్రింట్ లేదా పీడీఎఫ్‌గా సేవ్ చేయబడతాయి.'
                  : 'Your current screen and all ink drawings have been seamlessly composited into a high-res capture.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content: Live Preview & Settings */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {exportSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {/* Document Title & Layout Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                {lang === 'te' ? 'డాక్యుమెంట్ శీర్షిక' : 'Document Title'}
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                    : 'bg-[#242428] border-white/10 text-white focus:border-blue-500'
                }`}
                placeholder="Enter title..."
              />
            </div>

            <div className="flex items-center gap-4 pt-5 sm:pt-6">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="radio"
                  name="draw-orientation"
                  checked={orientation === 'landscape'}
                  onChange={() => setOrientation('landscape')}
                  className="accent-blue-500"
                />
                <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>
                  {lang === 'te' ? 'ల్యాండ్‌స్కేప్ (వెడల్పు)' : 'Landscape (Wide)'}
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="radio"
                  name="draw-orientation"
                  checked={orientation === 'portrait'}
                  onChange={() => setOrientation('portrait')}
                  className="accent-blue-500"
                />
                <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>
                  {lang === 'te' ? 'పోర్ట్రెయిట్ (నిలువు)' : 'Portrait (Tall)'}
                </span>
              </label>
            </div>
          </div>

          {/* Interactive Screen Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                {lang === 'te' ? 'కలసిన స్క్రీన్ ప్రివ్యూ' : 'Composited Screen Preview (Screen + Ink Overlay)'}
              </span>
              <span className={`font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Full Page Composite
              </span>
            </div>

            <div
              className={`w-full max-h-[360px] rounded-2xl border overflow-auto p-2 flex items-center justify-center ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/60 border-white/10'
              }`}
            >
              <img
                src={compositeDataUrl}
                alt="Drawn Screen Record"
                className="max-h-[330px] w-auto max-w-full rounded-lg shadow-md object-contain border border-white/5"
              />
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div
          className={`px-5 py-4 border-t flex flex-wrap items-center justify-between gap-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141416] border-white/10'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
            }`}
          >
            {lang === 'te' ? 'మూసివేయి' : 'Close'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PNG Image */}
            <button
              type="button"
              onClick={handleDownloadPNG}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-white/10 hover:bg-white/15 border-white/15 text-zinc-200'
              }`}
              title="Download merged image as PNG"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'te' ? 'ఇమేజ్ (PNG)' : 'Download Image'}</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:scale-95 rounded-xl shadow-md shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
              title="Generate PDF with screen and drawing overlay"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating PDF...' : lang === 'te' ? 'పీడీఎఫ్ డౌన్‌లోడ్' : 'Download PDF'}</span>
            </button>

            {/* Print Directly */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              title="Print screen record with drawing annotations"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'స్క్రీన్ ప్రింట్' : 'Print Screen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
