import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { ExplorerFile } from '../types/explorer';
import { getFileBlob } from '../utils/explorerStorage';

// Configure PDF.js Worker to ensure seamless loading in browser & iframe environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('PDF.js worker initialization notice:', err);
  }
}

interface PDFDocumentViewerProps {
  file: ExplorerFile;
  blobUrl?: string | null;
  lang?: 'en' | 'te';
  onDownload?: () => void;
  onDocumentRendered?: () => void;
}

interface PageData {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export const PDFDocumentViewer: React.FC<PDFDocumentViewerProps> = ({
  file,
  blobUrl,
  lang = 'en',
  onDownload,
  onDocumentRendered,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [renderedPages, setRenderedPages] = useState<PageData[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  // 1. Fetch PDF Data & Load PDF.js Document
  const loadPDFDocument = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setRenderedPages([]);

      // Retrieve binary blob from cache or IDB
      let blob: Blob | null = null;
      if (file.blobKey || file.id) {
        blob = await getFileBlob(file.blobKey || file.id);
      }

      // If not in blob store, attempt fetching from blobUrl or file.url
      if (!blob && blobUrl) {
        try {
          const res = await fetch(blobUrl);
          blob = await res.blob();
        } catch {}
      }

      if (!blob && file.url) {
        try {
          const res = await fetch(file.url);
          blob = await res.blob();
        } catch {}
      }

      // If still not available and file has base64 dataUrl
      if (!blob && file.url?.startsWith('data:')) {
        try {
          const res = await fetch(file.url);
          blob = await res.blob();
        } catch {}
      }

      let arrayBuffer: ArrayBuffer | null = null;
      if (blob) {
        arrayBuffer = await blob.arrayBuffer();
      }

      if (!arrayBuffer) {
        throw new Error('PDF file binary data could not be retrieved from local storage');
      }

      // Load PDF via PDF.js
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      if (!isMountedRef.current) return;

      setPdfDoc(doc);
      setNumPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF with PDF.js:', err);
      if (isMountedRef.current) {
        setErrorMsg(err?.message || 'Unable to parse PDF file');
        setLoading(false);
      }
    }
  }, [file, blobUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    loadPDFDocument();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadPDFDocument]);

  // 2. Render all pages sequentially into high-resolution canvases
  const renderAllPages = useCallback(
    async (doc: pdfjsLib.PDFDocumentProxy, scale: number) => {
      try {
        setLoading(true);
        const pagesList: PageData[] = [];
        const dpr = window.devicePixelRatio || 1;

        for (let i = 1; i <= doc.numPages; i++) {
          if (!isMountedRef.current) return;

          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            const renderContext = {
              canvasContext: ctx,
              viewport,
              canvas,
            };
            await page.render(renderContext).promise;
          }

          pagesList.push({
            pageNumber: i,
            canvas,
            width: viewport.width,
            height: viewport.height,
          });
        }

        if (isMountedRef.current) {
          setRenderedPages(pagesList);
          setLoading(false);
          // Notify parent modal that pages have rendered so drawing overlay can size accurately
          setTimeout(() => {
            onDocumentRendered?.();
          }, 50);
        }
      } catch (err: any) {
        console.error('Error rendering PDF pages:', err);
        if (isMountedRef.current) {
          setErrorMsg('Error rendering PDF pages');
          setLoading(false);
        }
      }
    },
    [onDocumentRendered]
  );

  useEffect(() => {
    if (pdfDoc) {
      renderAllPages(pdfDoc, zoomScale);
    }
  }, [pdfDoc, zoomScale, renderAllPages]);

  // Zoom handlers
  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.5, +(prev + 0.2).toFixed(2)));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.6, +(prev - 0.2).toFixed(2)));
  const handleZoomReset = () => setZoomScale(1.25);

  return (
    <div className="w-full flex flex-col bg-[#161619] text-white select-text">
      {/* PDF Sub-Window Control Bar: Zoom controls, page count, and download */}
      <div className="sticky top-14 z-20 px-4 py-2 bg-[#1c1c20]/95 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Reader</span>
          </div>

          {numPages > 0 && (
            <span className="text-xs text-zinc-300 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              {numPages} {lang === 'te' ? 'పేజీలు' : numPages === 1 ? 'Page' : 'Pages'}
            </span>
          )}

          <span className="text-xs text-emerald-400 font-medium hidden sm:inline">
            • {lang === 'te' ? 'పూర్తి పొడవు దర్శనం (స్క్రోల్‌బార్లు లేవు)' : 'Full document length visible (No internal scrollbars)'}
          </span>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomScale <= 0.6 || loading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-zinc-200 min-w-12 text-center">
            {Math.round(zoomScale * 80)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomScale >= 2.5 || loading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleZoomReset}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ml-2"
              title="Download Original PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'డౌన్‌లోడ్' : 'Download'}</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Pages Container: Entire Document Length Rendered Vertically */}
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center py-6 px-2 sm:px-6 bg-[#0f0f12] min-h-[600px] relative"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-red-400" />
            <span className="text-xs font-semibold">
              {lang === 'te' ? 'పీడీఎఫ్ పేజీలు లోడ్ అవుతున్నాయి...' : 'Rendering PDF document pages...'}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="my-12 p-6 max-w-lg w-full rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h4 className="text-sm font-bold text-red-300">
              {lang === 'te' ? 'పీడీఎఫ్ తెరవడంలో సమస్య ఏర్పడింది' : 'Unable to preview PDF directly'}
            </h4>
            <p className="text-xs text-zinc-400">{errorMsg}</p>
            {blobUrl && (
              <div className="pt-2">
                <embed
                  src={blobUrl}
                  type="application/pdf"
                  className="w-full h-96 rounded-xl border border-white/10 my-3"
                />
              </div>
            )}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'te' ? 'పీడీఎఫ్‌ను డౌన్‌లోడ్ చేయండి' : 'Download PDF to View'}</span>
              </button>
            )}
          </div>
        )}

        {!loading && !errorMsg && renderedPages.length === 0 && (
          <div className="py-20 text-center text-zinc-400">
            <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs">{lang === 'te' ? 'పీడీఎఫ్‌లో పేజీలు లేవు' : 'No pages found in PDF'}</p>
          </div>
        )}

        {/* Stack of All Rendered PDF Pages */}
        {!loading && !errorMsg && renderedPages.length > 0 && (
          <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
            {renderedPages.map((page) => (
              <div
                key={page.pageNumber}
                className="flex flex-col items-center group relative w-full"
              >
                {/* Page number banner */}
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 pb-1.5 px-1 max-w-full">
                  <span className="font-bold text-zinc-300">
                    {lang === 'te' ? `పేజీ ${page.pageNumber} / ${numPages}` : `Page ${page.pageNumber} of ${numPages}`}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {Math.round(page.width)} × {Math.round(page.height)} pt
                  </span>
                </div>

                {/* PDF Page Canvas Wrapper */}
                <div
                  className="shadow-2xl rounded-md bg-white border border-white/20 overflow-hidden transition-transform duration-150"
                  style={{
                    width: `${page.width}px`,
                    maxWidth: '100%',
                  }}
                  ref={(node) => {
                    if (node && !node.hasChildNodes()) {
                      node.appendChild(page.canvas);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
