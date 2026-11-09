import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { idbGetItemSync, idbSetItem } from '../utils/indexedDBStorage';
import {
  MousePointer2,
  PenTool,
  Eraser,
  Undo2,
  Redo2,
  FileDown,
  Trash2,
  X,
  Plus,
  Minimize2,
  Maximize2,
  Sparkles,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Check,
  ChevronDown,
  GripHorizontal,
  Presentation,
  Grid,
} from 'lucide-react';
import { ThemeId } from '../types/theme';

export type DrawTool =
  | 'select'
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'galaxy'
  | 'vanishing'
  | 'eraser'
  | 'lasso'
  | 'shape_arrow'
  | 'shape_rect'
  | 'shape_circle'
  | 'shape_line'
  | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: DrawTool;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  createdAt?: number;
  durationMs?: number;
}

interface PresetPen {
  id: string;
  name: string;
  nameTe: string;
  tool: DrawTool;
  color: string;
  width: number;
  opacity: number;
  bodyColor: string;
  tipColor: string;
  type: 'action' | 'ballpoint' | 'galaxy' | 'pencil' | 'highlighter' | 'fountain' | 'vanishing' | 'custom';
  letter?: string;
}

const PRESET_PENS: PresetPen[] = [
  {
    id: 'vanishing-pen',
    name: 'Vanishing Rainbow Pen (Zoom 5s)',
    nameTe: 'వానిషింగ్ రెయిన్‌బో పెన్ (5 సెకన్లు)',
    tool: 'vanishing',
    color: '#ff007f',
    width: 4.5,
    opacity: 1,
    bodyColor: 'linear-gradient(135deg, #ef4444, #f97316, #facc15, #10b981, #06b6d4, #8b5cf6)',
    tipColor: '#ec4899',
    type: 'vanishing',
    letter: '🌈',
  },
  {
    id: 'action-pen',
    name: 'Action Pen (Fine)',
    nameTe: 'యాక్షన్ పెన్',
    tool: 'pen',
    color: '#000000',
    width: 1.5,
    opacity: 1,
    bodyColor: '#ffffff',
    tipColor: '#475569',
    type: 'action',
    letter: 'A',
  },
  {
    id: 'black-pen',
    name: 'Black Ballpoint',
    nameTe: 'బ్లాక్ పెన్',
    tool: 'pen',
    color: '#000000',
    width: 2.5,
    opacity: 1,
    bodyColor: '#18181b',
    tipColor: '#000000',
    type: 'ballpoint',
  },
  {
    id: 'red-pen',
    name: 'Red Ballpoint',
    nameTe: 'రెడ్ పెన్',
    tool: 'pen',
    color: '#dc2626',
    width: 2.5,
    opacity: 1,
    bodyColor: '#ef4444',
    tipColor: '#dc2626',
    type: 'ballpoint',
  },
  {
    id: 'galaxy-pen',
    name: 'Galaxy Shimmer Pen',
    nameTe: 'గెలాక్సీ మెరిసే పెన్',
    tool: 'galaxy',
    color: '#38bdf8',
    width: 3.5,
    opacity: 1,
    bodyColor: 'linear-gradient(135deg, #818cf8, #c084fc, #38bdf8)',
    tipColor: '#38bdf8',
    type: 'galaxy',
  },
  {
    id: 'graphite-pencil',
    name: 'Graphite Pencil',
    nameTe: 'గ్రాఫైట్ పెన్సిల్',
    tool: 'pencil',
    color: '#475569',
    width: 2,
    opacity: 0.85,
    bodyColor: '#94a3b8',
    tipColor: '#334155',
    type: 'pencil',
  },
  {
    id: 'yellow-highlighter',
    name: 'Yellow Highlighter',
    nameTe: 'ఎల్లో హైలైటర్',
    tool: 'highlighter',
    color: '#facc15',
    width: 22,
    opacity: 0.45,
    bodyColor: '#facc15',
    tipColor: '#eab308',
    type: 'highlighter',
  },
  {
    id: 'blue-fountain',
    name: 'Deep Blue Fountain',
    nameTe: 'బ్లూ ఫౌంటెన్ పెన్',
    tool: 'pen',
    color: '#1d4ed8',
    width: 3,
    opacity: 1,
    bodyColor: '#1e40af',
    tipColor: '#1d4ed8',
    type: 'fountain',
  },
  {
    id: 'green-pen',
    name: 'Emerald Green',
    nameTe: 'గ్రీన్ పెన్',
    tool: 'pen',
    color: '#16a34a',
    width: 2.5,
    opacity: 1,
    bodyColor: '#22c55e',
    tipColor: '#16a34a',
    type: 'ballpoint',
  },
];

interface SubWindowDrawCanvasProps {
  isActive: boolean;
  onClose: () => void;
  windowId: string;
  documentTitle: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  lang?: 'en' | 'te';
  currentTheme?: ThemeId;
}

export const SubWindowDrawCanvas: React.FC<SubWindowDrawCanvasProps> = ({
  isActive,
  onClose,
  windowId,
  documentTitle,
  containerRef,
  lang = 'en',
  currentTheme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const storageKey = `dyn_subwindow_draw_strokes_${windowId}`;

  // Strokes storage specific to this sub-window
  const [strokes, setStrokes] = useState<Stroke[]>(() => {
    try {
      const saved = idbGetItemSync<Stroke[] | string>(storageKey);
      if (saved) return typeof saved === 'string' ? JSON.parse(saved) : saved;
    } catch {}
    return [];
  });

  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Update strokes & persist
  const saveStrokes = useCallback(
    (updater: Stroke[] | ((prev: Stroke[]) => Stroke[])) => {
      setStrokes((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          const now = Date.now();
          const clean = next.filter(
            (s) => !(s.tool === 'vanishing' && s.createdAt && now - s.createdAt >= (s.durationMs || 5000))
          );
          idbSetItem(storageKey, clean);
        } catch {}
        return next;
      });
    },
    [storageKey]
  );

  // Whiteboard mode inside sub-window
  const [isWhiteboard, setIsWhiteboard] = useState(false);
  const [whiteboardStyle, setWhiteboardStyle] = useState<'plain' | 'dots' | 'ruled' | 'chalkboard'>('plain');
  const [showWhiteboardMenu, setShowWhiteboardMenu] = useState(false);

  // Tool settings
  const [activeTool, setActiveTool] = useState<DrawTool>('pen');
  const [activePenId, setActivePenId] = useState<string>('black-pen');
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [penOpacity, setPenOpacity] = useState<number>(1);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  // Menus & Toolbar
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [activeShape, setActiveShape] = useState<'arrow' | 'rect' | 'circle' | 'line'>('arrow');
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Text insertion state
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [textInputVal, setTextInputVal] = useState('');

  // Draggable sub-window toolbar offset
  const [toolbarOffset, setToolbarOffset] = useState<{ x: number; y: number } | null>(null);
  const isDraggingToolbarRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const isLight =
    currentTheme === 'light' ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'light');

  // Render strokes list onto 2D context
  const renderStrokesToContext = useCallback(
    (ctx: CanvasRenderingContext2D, strokeList: Stroke[], scaleMultiplier: number = 1) => {
      strokeList.forEach((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return;

        ctx.save();
        ctx.scale(scaleMultiplier, scaleMultiplier);

        if (stroke.tool === 'highlighter') {
          ctx.globalAlpha = stroke.opacity || 0.45;
          ctx.globalCompositeOperation = 'multiply';
        } else if (stroke.tool === 'vanishing') {
          let alpha = stroke.opacity || 1;
          if (stroke.createdAt && stroke.durationMs) {
            const elapsed = Date.now() - stroke.createdAt;
            const remaining = stroke.durationMs - elapsed;
            if (remaining <= 0) {
              alpha = 0;
            } else if (remaining < 1500) {
              // Smooth fade-out in the last 1.5 seconds
              alpha = (stroke.opacity || 1) * (remaining / 1500);
            }
          }
          ctx.globalAlpha = alpha;
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.globalAlpha = stroke.opacity || 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.width;

        if (stroke.tool === 'vanishing') {
          const first = stroke.points[0];
          const last = stroke.points[stroke.points.length - 1] || first;
          const dx = last.x - first.x;
          const dy = last.y - first.y;
          const dist = Math.hypot(dx, dy);
          const grad = ctx.createLinearGradient(
            first.x,
            first.y,
            dist < 40 ? first.x + 100 : last.x,
            dist < 40 ? first.y + 100 : last.y
          );
          grad.addColorStop(0, '#ef4444'); // Red
          grad.addColorStop(0.17, '#f97316'); // Orange
          grad.addColorStop(0.33, '#facc15'); // Yellow
          grad.addColorStop(0.50, '#10b981'); // Emerald
          grad.addColorStop(0.67, '#06b6d4'); // Cyan
          grad.addColorStop(0.83, '#6366f1'); // Indigo
          grad.addColorStop(1, '#ec4899'); // Pink
          ctx.strokeStyle = grad;
          ctx.shadowColor = 'rgba(236, 72, 153, 0.75)';
          ctx.shadowBlur = 10;
        } else if (stroke.tool === 'galaxy') {
          const first = stroke.points[0];
          const last = stroke.points[stroke.points.length - 1] || first;
          const grad = ctx.createLinearGradient(first.x, first.y, last.x + 50, last.y + 50);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.33, '#c084fc');
          grad.addColorStop(0.66, '#f472b6');
          grad.addColorStop(1, '#facc15');
          ctx.strokeStyle = grad;
          ctx.shadowColor = 'rgba(192, 132, 252, 0.6)';
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        if (stroke.tool.startsWith('shape_') && stroke.points.length >= 2) {
          const p1 = stroke.points[0];
          const p2 = stroke.points[stroke.points.length - 1];

          if (stroke.tool === 'shape_arrow') {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const headLength = Math.max(14, stroke.width * 3.5);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(
              p2.x - headLength * Math.cos(angle - Math.PI / 6),
              p2.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              p2.x - headLength * Math.cos(angle + Math.PI / 6),
              p2.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          } else if (stroke.tool === 'shape_rect') {
            ctx.beginPath();
            const rx = Math.min(p1.x, p2.x);
            const ry = Math.min(p1.y, p2.y);
            const rw = Math.abs(p2.x - p1.x);
            const rh = Math.abs(p2.y - p1.y);
            ctx.rect(rx, ry, rw, rh);
            ctx.stroke();
          } else if (stroke.tool === 'shape_circle') {
            ctx.beginPath();
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const radiusX = Math.abs(p2.x - p1.x) / 2;
            const radiusY = Math.abs(p2.y - p1.y) / 2;
            ctx.ellipse(cx, cy, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (stroke.tool === 'shape_line') {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        } else if (stroke.tool === 'text' && stroke.text) {
          const pt = stroke.points[0];
          ctx.font = `bold ${stroke.fontSize || 16}px -apple-system, sans-serif`;
          const textMetrics = ctx.measureText(stroke.text);
          ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(24, 24, 27, 0.9)';
          ctx.fillRect(pt.x - 4, pt.y - 18, textMetrics.width + 8, 24);
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(pt.x - 4, pt.y - 18, textMetrics.width + 8, 24);
          ctx.fillStyle = stroke.color;
          ctx.fillText(stroke.text, pt.x, pt.y);
        } else {
          if (stroke.points.length === 1) {
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length - 1; i++) {
              const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
              const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
              ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
            }

            const last = stroke.points[stroke.points.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.stroke();
          }
        }

        ctx.restore();
      });
    },
    [isLight]
  );

  // Redraw strokes
  const renderStrokes = useCallback(
    (extraStroke?: Stroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const allToDraw = extraStroke ? [...strokes, extraStroke] : strokes;
      renderStrokesToContext(ctx, allToDraw, dpr);
    },
    [strokes, renderStrokesToContext]
  );

  // Synchronize canvas dimensions with the entire document length of the sub-window!
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const fullWidth = Math.max(container.scrollWidth, container.clientWidth, 600);
    const fullHeight = Math.max(container.scrollHeight, container.clientHeight, 600);

    if (canvas.width !== fullWidth * dpr || canvas.height !== fullHeight * dpr) {
      canvas.width = fullWidth * dpr;
      canvas.height = fullHeight * dpr;
      canvas.style.width = `${fullWidth}px`;
      canvas.style.height = `${fullHeight}px`;
    }

    renderStrokes();
  }, [containerRef, renderStrokes]);

  useEffect(() => {
    if (isActive) {
      updateCanvasDimensions();
      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(() => {
        updateCanvasDimensions();
      });
      observer.observe(container);

      window.addEventListener('resize', updateCanvasDimensions);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateCanvasDimensions);
      };
    }
  }, [isActive, containerRef, updateCanvasDimensions]);

  useEffect(() => {
    renderStrokes();
  }, [strokes, renderStrokes]);

  // Vanishing Pen Animation Loop: auto smooth fade-out and auto-remove after 5 seconds
  useEffect(() => {
    const hasVanishing = strokes.some((s) => s.tool === 'vanishing');
    if (!hasVanishing || !isActive) return;

    let animId: number;
    const tick = () => {
      const now = Date.now();
      let hasExpired = false;
      const validStrokes = strokes.filter((s) => {
        if (s.tool === 'vanishing' && s.createdAt) {
          const limit = s.durationMs || 5000;
          if (now - s.createdAt >= limit) {
            hasExpired = true;
            return false;
          }
        }
        return true;
      });

      if (hasExpired) {
        saveStrokes(validStrokes);
      } else {
        renderStrokes();
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [strokes, isActive, saveStrokes, renderStrokes]);

  // Document coordinate calculation relative to sub-window content container
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      const me = e as React.MouseEvent;
      return {
        x: me.clientX - rect.left,
        y: me.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'select') return;

    const pt = getCoordinates(e);

    if (activeTool === 'text') {
      setTextInputPos(pt);
      setTextInputVal('');
      return;
    }

    if (activeTool === 'eraser' || activeTool === 'lasso') {
      setIsDrawing(true);
      eraseAtPoint(pt);
      return;
    }

    setIsDrawing(true);
    setStartPoint(pt);
    setCurrentPoints([pt]);
  };

  const eraseAtPoint = (pt: Point) => {
    const eraseRadius = 26;
    saveStrokes((prev) =>
      prev.filter((stroke) => {
        return !stroke.points.some(
          (p) => Math.hypot(p.x - pt.x, p.y - pt.y) < eraseRadius + stroke.width / 2
        );
      })
    );
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCoordinates(e);

    if (activeTool === 'eraser' || activeTool === 'lasso') {
      eraseAtPoint(pt);
      return;
    }

    if (activeTool.startsWith('shape_')) {
      if (startPoint) {
        const liveStroke: Stroke = {
          id: 'temp-live',
          tool: activeTool,
          points: [startPoint, pt],
          color: penColor,
          width: penWidth,
          opacity: penOpacity,
        };
        renderStrokes(liveStroke);
      }
      return;
    }

    const updated = [...currentPoints, pt];
    setCurrentPoints(updated);

    const liveStroke: Stroke = {
      id: 'temp-live',
      tool: activeTool,
      points: updated,
      color: penColor,
      width: penWidth,
      opacity: penOpacity,
    };
    renderStrokes(liveStroke);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pt = getCoordinates(e);

    if (activeTool === 'eraser' || activeTool === 'lasso') {
      renderStrokes();
      return;
    }

    let finalPoints: Point[] = [];
    if (activeTool.startsWith('shape_')) {
      if (startPoint) {
        finalPoints = [startPoint, pt];
      }
    } else {
      finalPoints = [...currentPoints, pt];
    }

    if (finalPoints.length > 0) {
      const isVanishing = activeTool === 'vanishing';
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool: activeTool,
        points: finalPoints,
        color: penColor,
        width: isVanishing ? Math.max(penWidth, 5) : penWidth,
        opacity: penOpacity,
        createdAt: isVanishing ? Date.now() : undefined,
        durationMs: isVanishing ? 5000 : undefined,
      };

      saveStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
    }

    setCurrentPoints([]);
    setStartPoint(null);
  };

  const handleSaveTextAnnotation = () => {
    if (textInputPos && textInputVal.trim()) {
      const newStroke: Stroke = {
        id: `text-${Date.now()}`,
        tool: 'text',
        points: [textInputPos],
        color: penColor,
        width: 1,
        opacity: 1,
        text: textInputVal.trim(),
        fontSize: 16,
      };
      saveStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
    }
    setTextInputPos(null);
    setTextInputVal('');
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack((prev) => [...prev, [last]]);
    saveStrokes((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const toRestore = redoStack[redoStack.length - 1];
    saveStrokes((prev) => [...prev, ...toRestore]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    if (window.confirm(lang === 'te' ? 'అన్ని డ్రాయింగ్స్ తొలగించాలా?' : 'Clear all drawings on this window?')) {
      setRedoStack((prev) => [...prev, [...strokes]]);
      saveStrokes([]);
    }
  };

  // Draggable toolbar
  const handleToolbarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingToolbarRef.current = true;
    const currentX = toolbarOffset ? toolbarOffset.x : Math.max(10, (window.innerWidth - 780) / 2);
    const currentY = toolbarOffset ? toolbarOffset.y : 64;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentX,
      startY: currentY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleToolbarPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingToolbarRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    const maxX = Math.max(10, window.innerWidth - 240);
    const maxY = Math.max(10, window.innerHeight - 80);
    const newX = Math.min(Math.max(10, dragStartRef.current.startX + dx), maxX);
    const newY = Math.min(Math.max(10, dragStartRef.current.startY + dy), maxY);
    setToolbarOffset({ x: newX, y: newY });
  };

  const handleToolbarPointerUp = (e: React.PointerEvent) => {
    if (isDraggingToolbarRef.current) {
      isDraggingToolbarRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Download PDF: Save current page view of the sub-window with annotations
  const handleDownloadPDFSubWindow = async () => {
    try {
      setIsCapturing(true);

      const container = containerRef.current;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dpr = 2;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = viewportWidth * dpr;
      exportCanvas.height = viewportHeight * dpr;
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) throw new Error('Export canvas failed to create context');

      // 1. If Whiteboard mode is ON inside sub-window
      if (isWhiteboard) {
        exportCtx.save();
        exportCtx.scale(dpr, dpr);

        if (whiteboardStyle === 'chalkboard') {
          exportCtx.fillStyle = '#18261e';
          exportCtx.fillRect(0, 0, viewportWidth, viewportHeight);
        } else {
          exportCtx.fillStyle = '#ffffff';
          exportCtx.fillRect(0, 0, viewportWidth, viewportHeight);

          if (whiteboardStyle === 'dots') {
            exportCtx.fillStyle = '#94a3b8';
            for (let x = 12; x < viewportWidth; x += 24) {
              for (let y = 12; y < viewportHeight; y += 24) {
                exportCtx.beginPath();
                exportCtx.arc(x, y, 1.2, 0, Math.PI * 2);
                exportCtx.fill();
              }
            }
          } else if (whiteboardStyle === 'ruled') {
            exportCtx.strokeStyle = '#cbd5e1';
            exportCtx.lineWidth = 1;
            for (let y = 32; y < viewportHeight; y += 32) {
              exportCtx.beginPath();
              exportCtx.moveTo(0, y);
              exportCtx.lineTo(viewportWidth, y);
              exportCtx.stroke();
            }
          }
        }

        renderStrokesToContext(exportCtx, strokes, 1);

        exportCtx.fillStyle = whiteboardStyle === 'chalkboard' ? '#86efac' : '#2563eb';
        exportCtx.font = 'bold 12px sans-serif';
        exportCtx.fillText(
          `Sub-Window Whiteboard • ${documentTitle} • ${new Date().toLocaleDateString()}`,
          16,
          24
        );
        exportCtx.restore();

        const imgData = exportCanvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: viewportWidth > viewportHeight ? 'l' : 'p',
          unit: 'pt',
          format: [viewportWidth, viewportHeight],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, viewportWidth, viewportHeight);
        const fileName = `${documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Whiteboard_${Date.now()}.pdf`;
        pdf.save(fileName);

        setToastMessage(lang === 'te' ? '✓ వైట్‌బోర్డ్ పీడీఎఫ్ సేవ్ చేయబడింది' : '✓ Whiteboard saved as PDF');
        setTimeout(() => setToastMessage(null), 3500);
        setIsCapturing(false);
        return;
      }

      // 2. Overlay Mode (Spreadsheet table or PDF pages + Ink strokes)
      let docCanvas: HTMLCanvasElement | null = null;
      if (container) {
        try {
          docCanvas = await html2canvas(container, {
            scale: dpr,
            useCORS: true,
            allowTaint: true,
            logging: false,
            ignoreElements: (el) => el.classList?.contains('subwindow-draw-ribbon'),
          });
        } catch (err) {
          console.warn('html2canvas subwindow capture notice:', err);
        }
      }

      exportCtx.fillStyle = '#161619';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      if (docCanvas) {
        // Draw captured document content
        const drawH = Math.min(exportCanvas.height, (docCanvas.height * exportCanvas.width) / docCanvas.width);
        exportCtx.drawImage(docCanvas, 0, 0, exportCanvas.width, drawH);
      } else {
        exportCtx.save();
        exportCtx.scale(dpr, dpr);
        exportCtx.fillStyle = '#ffffff';
        exportCtx.font = 'bold 16px sans-serif';
        exportCtx.fillText(documentTitle, 24, 40);
        exportCtx.font = '12px sans-serif';
        exportCtx.fillStyle = '#94a3b8';
        exportCtx.fillText(`Captured: ${new Date().toLocaleString()}`, 24, 60);
        exportCtx.restore();
      }

      // Draw strokes directly on top
      exportCtx.save();
      exportCtx.scale(dpr, dpr);
      renderStrokesToContext(exportCtx, strokes, 1);
      exportCtx.restore();

      const finalImg = exportCanvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: viewportWidth > viewportHeight ? 'l' : 'p',
        unit: 'pt',
        format: [viewportWidth, viewportHeight],
      });
      pdf.addImage(finalImg, 'PNG', 0, 0, viewportWidth, viewportHeight);

      const safeTitle = documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeTitle}_Preview_${Date.now()}.pdf`;
      pdf.save(fileName);

      setToastMessage(lang === 'te' ? `✓ పీడీఎఫ్ సేవ్ చేయబడింది: ${fileName}` : `✓ PDF saved: ${fileName}`);
      setTimeout(() => setToastMessage(null), 3500);
      setIsCapturing(false);
    } catch (err) {
      console.error('Error exporting subwindow drawing:', err);
      setIsCapturing(false);
    }
  };

  if (!isActive) return null;

  return (
    <>
      {/* Optional Whiteboard Surface over the sub-window content */}
      {isWhiteboard && (
        <div
          className={`absolute top-0 left-0 w-full z-15 pointer-events-none transition-all duration-200 ${
            whiteboardStyle === 'chalkboard' ? 'bg-[#18261e]' : 'bg-[#ffffff]'
          }`}
          style={{
            height: canvasRef.current
              ? `${canvasRef.current.height / (window.devicePixelRatio || 1)}px`
              : '100%',
            minHeight: '600px',
            backgroundImage:
              whiteboardStyle === 'dots'
                ? 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)'
                : whiteboardStyle === 'ruled'
                ? 'linear-gradient(to bottom, transparent 31px, #cbd5e1 32px)'
                : undefined,
            backgroundSize:
              whiteboardStyle === 'dots'
                ? '24px 24px'
                : whiteboardStyle === 'ruled'
                ? '100% 32px'
                : undefined,
          }}
        />
      )}

      {/* Interactive Sub-Window HTML5 Canvas Drawing Layer */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDrawing(false)}
        className={`absolute top-0 left-0 z-20 transition-all ${
          activeTool === 'select'
            ? 'pointer-events-none'
            : activeTool === 'eraser'
            ? 'cursor-cell pointer-events-auto'
            : activeTool.startsWith('shape_')
            ? 'cursor-crosshair pointer-events-auto'
            : 'cursor-crosshair pointer-events-auto touch-none'
        }`}
      />

      {/* Text Annotation Input Box */}
      {textInputPos && (
        <div
          style={{ left: `${textInputPos.x}px`, top: `${textInputPos.y}px` }}
          className="absolute z-40 -translate-y-full -translate-x-2 bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-2xl border border-blue-500 flex items-center gap-1.5 animate-in fade-in"
        >
          <input
            type="text"
            value={textInputVal}
            onChange={(e) => setTextInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTextAnnotation();
              if (e.key === 'Escape') setTextInputPos(null);
            }}
            placeholder="Type note and hit Enter..."
            autoFocus
            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-zinc-700 text-slate-900 dark:text-white border-none outline-none w-56"
          />
          <button
            type="button"
            onClick={handleSaveTextAnnotation}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTextInputPos(null)}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Window Floating Drawing Toolbar (Draggable & dockable) */}
      <div
        className="fixed z-40 w-[96vw] max-w-5xl subwindow-draw-ribbon animate-in slide-in-from-top-2 duration-150"
        style={
          toolbarOffset
            ? { left: `${toolbarOffset.x}px`, top: `${toolbarOffset.y}px`, transform: 'none' }
            : { left: '50%', top: '68px', transform: 'translateX(-50%)' }
        }
      >
        <div className="rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-[#18181b]/95 text-white transition-all">
          {/* Toolbar Header: Document title, Move handle, Close button */}
          <div className="px-3.5 py-1.5 border-b border-white/10 flex items-center justify-between text-xs bg-white/5 select-none">
            <div className="flex items-center gap-2">
              <div
                onPointerDown={handleToolbarPointerDown}
                onPointerMove={handleToolbarPointerMove}
                onPointerUp={handleToolbarPointerUp}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 cursor-grab active:cursor-grabbing font-bold text-[10px] uppercase tracking-wider select-none transition-colors"
                title="Drag toolbar anywhere"
              >
                <GripHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'లాగండి' : 'Move'}</span>
              </div>

              {toolbarOffset && (
                <button
                  type="button"
                  onClick={() => setToolbarOffset(null)}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}

              <span className="font-extrabold tracking-wide uppercase text-amber-400 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" />
                <span>Sub-Window Draw</span>
              </span>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 truncate max-w-[200px]">
                {documentTitle}
              </span>

              {isWhiteboard && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Presentation className="w-3 h-3" />
                  <span>Whiteboard ON</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {strokes.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {strokes.length} strokes
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsRibbonCollapsed((prev) => !prev)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
                title={isRibbonCollapsed ? 'Expand Ribbon' : 'Minimize Ribbon'}
              >
                {isRibbonCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-rose-600 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close Drawing Toolbar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controls Body */}
          {!isRibbonCollapsed && (
            <div className="p-2 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2.5 overflow-x-auto scrollbar-thin">
              {/* Group 1: Tools (Select, Draw, Eraser) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTool('select')}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-11 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool === 'select'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Select mode: Click cells and scroll freely"
                  >
                    <MousePointer2 className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold mt-0.5">Select</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeTool === 'select' || activeTool === 'eraser') {
                        setActiveTool('pen');
                      }
                    }}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-11 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool !== 'select' &&
                      activeTool !== 'eraser' &&
                      !activeTool.startsWith('shape_') &&
                      activeTool !== 'text'
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Draw on document"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold mt-0.5">Draw</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('eraser')}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-11 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool === 'eraser'
                        ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Stroke Eraser"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold mt-0.5">Eraser</span>
                  </button>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-1 text-zinc-500">
                  Tools
                </span>
              </div>

              <div className="w-[1px] h-11 shrink-0 bg-white/15" />

              {/* Group 2: Whiteboard Option inside Sub-Window */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsWhiteboard((prev) => !prev)}
                    className={`flex flex-col items-center justify-center px-2.5 h-11 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      isWhiteboard
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title={
                      isWhiteboard
                        ? 'Whiteboard Mode ON: Click to switch back to document overlay'
                        : 'Toggle Whiteboard on this sub-window'
                    }
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] font-bold">Whiteboard</span>
                      <span className={`text-[8px] px-1 rounded font-black ${isWhiteboard ? 'bg-white text-emerald-800' : 'bg-zinc-700 text-zinc-300'}`}>
                        {isWhiteboard ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </button>

                  {isWhiteboard && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowWhiteboardMenu((prev) => !prev)}
                        className="flex items-center gap-1 px-1.5 h-11 rounded-xl border border-white/15 bg-white/10 text-white text-xs cursor-pointer"
                        title="Whiteboard Pattern"
                      >
                        <Grid className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-bold capitalize hidden sm:inline">{whiteboardStyle}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                      </button>

                      {showWhiteboardMenu && (
                        <div className="absolute top-full mt-2 left-0 p-1.5 rounded-2xl border border-white/20 bg-[#1c1c1f] text-white shadow-2xl z-50 w-32 space-y-1 animate-in fade-in">
                          {(['plain', 'dots', 'ruled', 'chalkboard'] as const).map((style) => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => {
                                setWhiteboardStyle(style);
                                setShowWhiteboardMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded-xl text-xs hover:bg-emerald-600 transition-colors capitalize ${
                                whiteboardStyle === style ? 'font-bold bg-emerald-500/20' : ''
                              }`}
                            >
                              <span>{style}</span>
                              {whiteboardStyle === style && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-1 text-zinc-500">
                  Board
                </span>
              </div>

              <div className="w-[1px] h-11 shrink-0 bg-white/15" />

              {/* Group 3: Undo / Redo */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={strokes.length === 0}
                    className={`p-1.5 rounded-xl border border-white/15 transition-all cursor-pointer ${
                      strokes.length > 0 ? 'bg-white/10 hover:bg-white/15 text-white' : 'opacity-30 border-transparent cursor-not-allowed'
                    }`}
                    title="Undo stroke"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className={`p-1.5 rounded-xl border border-white/15 transition-all cursor-pointer ${
                      redoStack.length > 0 ? 'bg-white/10 hover:bg-white/15 text-white' : 'opacity-30 border-transparent cursor-not-allowed'
                    }`}
                    title="Redo stroke"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-2 text-zinc-500">
                  Undo
                </span>
              </div>

              <div className="w-[1px] h-11 shrink-0 bg-white/15" />

              {/* Group 4: MS Excel Preset Pens */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {PRESET_PENS.map((pen) => {
                    const isSelected =
                      activePenId === pen.id &&
                      activeTool !== 'select' &&
                      activeTool !== 'eraser' &&
                      !activeTool.startsWith('shape_') &&
                      activeTool !== 'text';
                    return (
                      <button
                        key={pen.id}
                        type="button"
                        onClick={() => {
                          setActivePenId(pen.id);
                          setActiveTool(pen.tool);
                          setPenColor(pen.color);
                          setPenWidth(pen.width);
                          setPenOpacity(pen.opacity);
                        }}
                        className={`group relative flex flex-col items-center justify-between h-12 w-7 sm:w-8 px-0.5 pt-0.5 pb-0.5 rounded-xl transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-amber-500/25 ring-2 ring-amber-400 shadow-md -translate-y-0.5'
                            : 'hover:bg-white/10'
                        }`}
                        title={pen.name}
                      >
                        <div
                          className="w-4 h-6 rounded-t-sm flex flex-col items-center justify-between relative shadow-xs border border-black/20"
                          style={{ background: pen.bodyColor }}
                        >
                          {pen.letter && <span className="text-[9px] font-black text-black">{pen.letter}</span>}
                          {pen.type === 'galaxy' && <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />}
                          <div
                            className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] absolute -bottom-1.5"
                            style={{ borderTopColor: pen.tipColor }}
                          />
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: pen.color }} />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-1 text-zinc-500">
                  Pens
                </span>
              </div>

              <div className="w-[1px] h-11 shrink-0 bg-white/15" />

              {/* Group 5: Shapes & Note */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShapesMenu((prev) => !prev)}
                      className={`flex items-center gap-1 px-2 h-11 rounded-xl border transition-all cursor-pointer ${
                        activeTool.startsWith('shape_')
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Shapes (Arrow, Rect, Circle, Line)"
                    >
                      {activeShape === 'arrow' && <ArrowRight className="w-3.5 h-3.5" />}
                      {activeShape === 'rect' && <Square className="w-3.5 h-3.5" />}
                      {activeShape === 'circle' && <Circle className="w-3.5 h-3.5" />}
                      {activeShape === 'line' && <Minus className="w-3.5 h-3.5" />}
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>

                    {showShapesMenu && (
                      <div className="absolute top-full mt-2 left-0 p-1.5 rounded-2xl border border-white/20 bg-[#1c1c1f] text-white shadow-2xl z-50 w-32 space-y-1 animate-in fade-in">
                        {(['arrow', 'rect', 'circle', 'line'] as const).map((shp) => (
                          <button
                            key={shp}
                            type="button"
                            onClick={() => {
                              setActiveShape(shp);
                              setActiveTool(`shape_${shp}` as DrawTool);
                              setShowShapesMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded-xl text-xs hover:bg-purple-600 capitalize cursor-pointer text-left"
                          >
                            <span>{shp}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTool('text')}
                    className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl border transition-all cursor-pointer ${
                      activeTool === 'text'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Type text note"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold mt-0.5">Note</span>
                  </button>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-1 text-zinc-500">
                  Shapes
                </span>
              </div>

              <div className="w-[1px] h-11 shrink-0 bg-white/15" />

              {/* Group 6: Clear & Download PDF */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={strokes.length === 0}
                    className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl border transition-all cursor-pointer ${
                      strokes.length > 0
                        ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
                        : 'opacity-30 border-transparent cursor-not-allowed'
                    }`}
                    title="Clear drawings on this window"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-semibold mt-0.5">Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPDFSubWindow}
                    disabled={isCapturing}
                    className="flex flex-col items-center justify-center px-3.5 h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95 border border-white/20 whitespace-nowrap disabled:opacity-50"
                    title="Download PDF of this sub-window view with drawings"
                  >
                    <div className="flex items-center gap-1">
                      <FileDown className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-bold mt-0.5">
                      {isCapturing ? 'Saving...' : 'Download PDF'}
                    </span>
                  </button>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold mt-1 text-zinc-500">
                  Export
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-zinc-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
