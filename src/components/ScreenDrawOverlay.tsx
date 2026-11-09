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
  Layers,
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

const STORAGE_KEY_DRAW_STROKES = 'logixgridos_draw_strokes_by_tab_v3';

interface ScreenDrawOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'en' | 'te';
  currentTheme?: ThemeId;
  registerTitle?: string;
  activeTab?: string;
  activeTabKey?: string;
}

export const ScreenDrawOverlay: React.FC<ScreenDrawOverlayProps> = ({
  isOpen,
  onClose,
  lang = 'en',
  currentTheme,
  registerTitle = 'LogiXGridOS Screen Record',
  activeTab = 'explorer',
  activeTabKey,
}) => {
  const currentTabId = activeTabKey || activeTab || 'default';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tab-specific strokes storage
  const [strokesByTab, setStrokesByTab] = useState<Record<string, Stroke[]>>(() => {
    try {
      const saved = idbGetItemSync<Record<string, Stroke[]> | string>(STORAGE_KEY_DRAW_STROKES);
      if (saved) return typeof saved === 'string' ? JSON.parse(saved) : saved;
    } catch {}
    return {};
  });

  const [redoStackByTab, setRedoStackByTab] = useState<Record<string, Stroke[][]>>({});

  // Current tab's strokes
  const strokes = useMemo(() => strokesByTab[currentTabId] || [], [strokesByTab, currentTabId]);
  const redoStack = useMemo(() => redoStackByTab[currentTabId] || [], [redoStackByTab, currentTabId]);

  const updateCurrentTabStrokes = useCallback(
    (updater: Stroke[] | ((prev: Stroke[]) => Stroke[])) => {
      setStrokesByTab((prev) => {
        const cur = prev[currentTabId] || [];
        const next = typeof updater === 'function' ? updater(cur) : updater;
        const updated = { ...prev, [currentTabId]: next };
        try {
          idbSetItem(STORAGE_KEY_DRAW_STROKES, updated);
        } catch {}
        return updated;
      });
    },
    [currentTabId]
  );

  const updateCurrentTabRedoStack = useCallback(
    (updater: Stroke[][] | ((prev: Stroke[][]) => Stroke[][])) => {
      setRedoStackByTab((prev) => {
        const cur = prev[currentTabId] || [];
        const next = typeof updater === 'function' ? updater(cur) : updater;
        return { ...prev, [currentTabId]: next };
      });
    },
    [currentTabId]
  );

  // Whiteboard mode toggle
  const [isWhiteboard, setIsWhiteboard] = useState(false);
  const [whiteboardStyle, setWhiteboardStyle] = useState<'plain' | 'dots' | 'ruled' | 'chalkboard'>('plain');
  const [showWhiteboardMenu, setShowWhiteboardMenu] = useState(false);

  // Tool settings
  const [activeTool, setActiveTool] = useState<DrawTool>('pen');
  const [activePenId, setActivePenId] = useState<string>('black-pen');
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [penOpacity, setPenOpacity] = useState<number>(1);

  // Drawing runtime state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  // Shapes & Menus
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [activeShape, setActiveShape] = useState<'arrow' | 'rect' | 'circle' | 'line'>('arrow');

  // Ribbon state & Draggable Toolbar offset
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [toolbarOffset, setToolbarOffset] = useState<{ x: number; y: number } | null>(null);

  // Dragging toolbar
  const isDraggingToolbarRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Text insertion state
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [textInputVal, setTextInputVal] = useState('');

  const isLight =
    currentTheme === 'light' ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'light');

  // Human-friendly tab title for display
  const currentTabDisplay = useMemo(() => {
    if (currentTabId.startsWith('register')) {
      return lang === 'te' ? 'టేబుల్ రిజిస్టర్' : 'Table Sheet';
    }
    switch (currentTabId) {
      case 'explorer':
        return lang === 'te' ? 'ఎక్స్‌ప్లోరర్' : 'Explorer';
      case 'form_builder':
        return lang === 'te' ? 'ఫారమ్ బిల్డర్' : 'Form Builder';
      case 'fill_form':
        return lang === 'te' ? 'ఫిల్ ఫారమ్' : 'Fill Form';
      case 'pivot':
        return lang === 'te' ? 'పివోట్ టేబుల్' : 'Pivot Table';
      case 'lookup_studio':
        return lang === 'te' ? 'లుకప్ స్టూడియో' : 'Lookup Studio';
      case 'about':
        return lang === 'te' ? 'అబౌట్' : 'About';
      case 'settings':
        return lang === 'te' ? 'సెట్టింగ్స్' : 'Settings';
      default:
        return currentTabId;
    }
  }, [currentTabId, lang]);

  // Pure function to render a list of strokes onto any 2D canvas context
  const renderStrokesListToContext = useCallback(
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

        // Special Vanishing Rainbow Ink or Galaxy Ink gradient
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

        // 1. Shapes Rendering
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
          // 2. Text Note
          const pt = stroke.points[0];
          ctx.font = `bold ${stroke.fontSize || 16}px -apple-system, BlinkMacSystemFont, sans-serif`;
          const textMetrics = ctx.measureText(stroke.text);
          ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(24, 24, 27, 0.9)';
          ctx.fillRect(pt.x - 4, pt.y - 18, textMetrics.width + 8, 24);
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(pt.x - 4, pt.y - 18, textMetrics.width + 8, 24);
          ctx.fillStyle = stroke.color;
          ctx.fillText(stroke.text, pt.x, pt.y);
        } else {
          // 3. Freehand Pen / Pencil / Highlighter Smooth Bézier Curves
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

  // Redraw strokes on the active canvas
  const renderStrokes = useCallback(
    (extraStroke?: Stroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const allToDraw = extraStroke ? [...strokes, extraStroke] : strokes;
      renderStrokesListToContext(ctx, allToDraw, dpr);
    },
    [strokes, renderStrokesListToContext]
  );

  // Scrollable Canvas Dimensions Sync: Covers the entire scrollable page height & width
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const fullWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      window.innerWidth
    );
    const fullHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight
    );

    if (canvas.width !== fullWidth * dpr || canvas.height !== fullHeight * dpr) {
      canvas.width = fullWidth * dpr;
      canvas.height = fullHeight * dpr;
      canvas.style.width = `${fullWidth}px`;
      canvas.style.height = `${fullHeight}px`;
    }

    renderStrokes();
  }, [renderStrokes]);

  // Update canvas on open, resize, scroll, tab change
  useEffect(() => {
    if (isOpen) {
      updateCanvasDimensions();
      window.addEventListener('resize', updateCanvasDimensions);

      // Observe body height changes (e.g. rows added, folders expanded)
      const observer = new ResizeObserver(() => {
        updateCanvasDimensions();
      });
      observer.observe(document.body);

      return () => {
        window.removeEventListener('resize', updateCanvasDimensions);
        observer.disconnect();
      };
    }
  }, [isOpen, updateCanvasDimensions]);

  // Tab switch synchronization: Immediately redraw strokes for the new tab!
  useEffect(() => {
    if (isOpen) {
      updateCanvasDimensions();
      renderStrokes();
    }
  }, [isOpen, currentTabId, strokes, updateCanvasDimensions, renderStrokes]);

  // Vanishing Pen Animation Loop: auto smooth fade-out and auto-remove after 5 seconds
  useEffect(() => {
    const hasVanishing = strokes.some((s) => s.tool === 'vanishing');
    if (!hasVanishing || !isOpen) return;

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
        updateCurrentTabStrokes(validStrokes);
      } else {
        renderStrokes();
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [strokes, isOpen, updateCurrentTabStrokes, renderStrokes]);

  // Undo / Redo
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    updateCurrentTabRedoStack((prev) => [...prev, [last]]);
    updateCurrentTabStrokes((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const toRestore = redoStack[redoStack.length - 1];
    updateCurrentTabStrokes((prev) => [...prev, ...toRestore]);
    updateCurrentTabRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    const confirmMsg =
      lang === 'te'
        ? `${currentTabDisplay} ట్యాబ్‌లోని అన్ని డ్రాయింగ్స్ తొలగించాలా?`
        : `Clear all drawings on ${currentTabDisplay} tab?`;
    if (window.confirm(confirmMsg)) {
      updateCurrentTabRedoStack((prev) => [...prev, [...strokes]]);
      updateCurrentTabStrokes([]);
    }
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (textInputPos) {
          setTextInputPos(null);
        } else {
          setActiveTool('select');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Calculate coordinates in Document Space so the drawing layer scrolls with the page
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
    const me = e as React.MouseEvent;
    return {
      x: me.clientX + (window.scrollX || 0),
      y: me.clientY + (window.scrollY || 0),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'select') return;

    const pt = getCoordinates(e);

    // Text tool click placement
    if (activeTool === 'text') {
      setTextInputPos(pt);
      setTextInputVal('');
      return;
    }

    // Eraser Tool
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
    updateCurrentTabStrokes((prev) =>
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

      updateCurrentTabStrokes((prev) => [...prev, newStroke]);
      updateCurrentTabRedoStack([]);
    }

    setCurrentPoints([]);
    setStartPoint(null);
  };

  // Submit Text Annotation
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
      updateCurrentTabStrokes((prev) => [...prev, newStroke]);
      updateCurrentTabRedoStack([]);
    }
    setTextInputPos(null);
    setTextInputVal('');
  };

  // Draggable toolbar handlers
  const handleToolbarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingToolbarRef.current = true;
    const currentX = toolbarOffset ? toolbarOffset.x : Math.max(10, (window.innerWidth - 820) / 2);
    const currentY = toolbarOffset ? toolbarOffset.y : 8;
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

  // Select Preset Pen
  const handleSelectPen = (preset: PresetPen) => {
    setActivePenId(preset.id);
    setActiveTool(preset.tool);
    setPenColor(preset.color);
    setPenWidth(preset.width);
    setPenOpacity(preset.opacity);
    setShowShapesMenu(false);
  };

  // Switch Shape
  const handleSelectShape = (shape: 'arrow' | 'rect' | 'circle' | 'line') => {
    setActiveShape(shape);
    setActiveTool(`shape_${shape}` as DrawTool);
    setShowShapesMenu(false);
  };

  // DOWNLOAD PDF: ONLY THE DATA FOR THE CURRENT PAGE IS SAVED
  const handleDownloadPDFCurrentPage = async () => {
    try {
      setIsCapturing(true);

      const currentScrollX = window.scrollX || window.pageXOffset || 0;
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dpr = 2; // High-res 2x output for crisp PDF

      // Output canvas representing precisely the current page
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = viewportWidth * dpr;
      exportCanvas.height = viewportHeight * dpr;
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) {
        throw new Error('Canvas context could not be created');
      }

      // Case 1: Whiteboard Mode
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

        // Draw ONLY strokes that exist on the current page (offset by current scroll)
        exportCtx.save();
        exportCtx.translate(-currentScrollX, -currentScrollY);
        renderStrokesListToContext(exportCtx, strokes, 1);
        exportCtx.restore();

        // Whiteboard Title Header
        exportCtx.fillStyle = whiteboardStyle === 'chalkboard' ? '#86efac' : '#2563eb';
        exportCtx.font = 'bold 12px sans-serif';
        exportCtx.fillText(
          `LogiXGridOS Whiteboard • ${currentTabDisplay} • Page Captured: ${new Date().toLocaleDateString()}`,
          16,
          22
        );
        exportCtx.restore();

        // Generate PDF
        const finalImgData = exportCanvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: viewportWidth > viewportHeight ? 'l' : 'p',
          unit: 'pt',
          format: [viewportWidth, viewportHeight],
        });
        pdf.addImage(finalImgData, 'PNG', 0, 0, viewportWidth, viewportHeight);
        const fileName = `Whiteboard_${currentTabId}_Page_${Date.now()}.pdf`;
        pdf.save(fileName);

        setDownloadToast(
          lang === 'te'
            ? `✓ ప్రస్తుత పేజీ వైట్‌బోర్డ్ పీడీఎఫ్ సేవ్ చేయబడింది: ${fileName}`
            : `✓ Current page Whiteboard saved as PDF: ${fileName}`
        );
        setTimeout(() => setDownloadToast(null), 4000);
        setIsCapturing(false);
        return;
      }

      // Case 2: Overlay Mode (Web App Current Page View + Ink Drawings)
      // Capture strictly the CURRENT VISIBLE VIEWPORT bounds: x=scrollX, y=scrollY, width=viewportWidth, height=viewportHeight
      let currentScreenCanvas: HTMLCanvasElement | null = null;
      try {
        currentScreenCanvas = await html2canvas(document.body, {
          x: currentScrollX,
          y: currentScrollY,
          width: viewportWidth,
          height: viewportHeight,
          windowWidth: viewportWidth,
          windowHeight: viewportHeight,
          scrollX: 0,
          scrollY: 0,
          scale: dpr,
          useCORS: true,
          allowTaint: true,
          logging: false,
          ignoreElements: (el) => {
            return (
              el.classList?.contains('draw-ribbon-no-capture') ||
              el.classList?.contains('draw-ribbon-container') ||
              el.classList?.contains('draw-canvas-layer')
            );
          },
        });
      } catch (errCapture) {
        console.warn('html2canvas current page capture fallback:', errCapture);
      }

      // Fill base background
      exportCtx.fillStyle = isLight ? '#f8fafc' : '#0c061a';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      if (currentScreenCanvas) {
        exportCtx.drawImage(currentScreenCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
      } else {
        // Fallback banner for current page data
        exportCtx.save();
        exportCtx.scale(dpr, dpr);
        exportCtx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        exportCtx.font = 'bold 16px sans-serif';
        exportCtx.fillText(`LogiXGridOS • ${currentTabDisplay}`, 20, 35);
        exportCtx.font = '11px sans-serif';
        exportCtx.fillStyle = isLight ? '#64748b' : '#94a3b8';
        exportCtx.fillText(
          `Current Page View • Tab: ${currentTabId} • Saved: ${new Date().toLocaleString()}`,
          20,
          55
        );
        exportCtx.restore();
      }

      // Render ONLY the drawing strokes that appear on the current visible page
      exportCtx.save();
      exportCtx.scale(dpr, dpr);
      exportCtx.translate(-currentScrollX, -currentScrollY);
      renderStrokesListToContext(exportCtx, strokes, 1);
      exportCtx.restore();

      // Generate and trigger direct PDF download
      const finalImgData = exportCanvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: viewportWidth > viewportHeight ? 'l' : 'p',
        unit: 'pt',
        format: [viewportWidth, viewportHeight],
      });
      pdf.addImage(finalImgData, 'PNG', 0, 0, viewportWidth, viewportHeight);

      const safeTitle = (registerTitle || currentTabDisplay || 'CurrentPage').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      const fileName = `${safeTitle}_CurrentPage_${Date.now()}.pdf`;
      pdf.save(fileName);

      setDownloadToast(
        lang === 'te'
          ? `✓ ప్రస్తుత పేజీ పీడీఎఫ్ సేవ్ చేయబడింది: ${fileName}`
          : `✓ Current page saved as PDF: ${fileName}`
      );
      setTimeout(() => setDownloadToast(null), 4000);
      setIsCapturing(false);
    } catch (err) {
      console.error('Download current page error:', err);
      // Failsafe direct export: Save current viewport drawing directly so user never loses work
      try {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const currentScrollX = window.scrollX || 0;
        const currentScrollY = window.scrollY || 0;

        const fbCanvas = document.createElement('canvas');
        fbCanvas.width = viewportWidth * 2;
        fbCanvas.height = viewportHeight * 2;
        const fbCtx = fbCanvas.getContext('2d');
        if (fbCtx) {
          fbCtx.fillStyle = isLight ? '#ffffff' : '#141416';
          fbCtx.fillRect(0, 0, fbCanvas.width, fbCanvas.height);
          fbCtx.scale(2, 2);
          fbCtx.translate(-currentScrollX, -currentScrollY);
          renderStrokesListToContext(fbCtx, strokes, 1);

          const pdf = new jsPDF({
            orientation: viewportWidth > viewportHeight ? 'l' : 'p',
            unit: 'pt',
            format: [viewportWidth, viewportHeight],
          });
          pdf.addImage(fbCanvas.toDataURL('image/png'), 'PNG', 0, 0, viewportWidth, viewportHeight);
          pdf.save(`Current_Page_Drawing_${Date.now()}.pdf`);

          setDownloadToast(
            lang === 'te'
              ? '✓ ప్రస్తుత పేజీ డ్రాయింగ్ పీడీఎఫ్‌గా సేవ్ చేయబడింది'
              : '✓ Current page drawing saved as PDF'
          );
          setTimeout(() => setDownloadToast(null), 4000);
        }
      } catch (eFinal) {
        console.error('Final fallback error:', eFinal);
      }
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Optional Whiteboard Layer (scrollable surface behind the canvas when Whiteboard is ON) */}
      {isWhiteboard && (
        <div
          className={`absolute top-0 left-0 w-full z-[44] transition-all duration-200 pointer-events-none ${
            whiteboardStyle === 'chalkboard'
              ? 'bg-[#18261e] text-emerald-200'
              : 'bg-[#ffffff] text-slate-900 shadow-inner'
          }`}
          style={{
            minHeight: '100%',
            height: canvasRef.current
              ? `${canvasRef.current.height / (window.devicePixelRatio || 1)}px`
              : '100vh',
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

      {/* 1. Full-Height Scrollable HTML5 Canvas Overlay Layer (scrolls along with the page) */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDrawing(false)}
        className={`absolute top-0 left-0 z-[45] draw-canvas-layer transition-opacity ${
          activeTool === 'select'
            ? 'pointer-events-none'
            : activeTool === 'eraser'
            ? 'cursor-cell pointer-events-auto'
            : activeTool.startsWith('shape_')
            ? 'cursor-crosshair pointer-events-auto'
            : 'cursor-crosshair pointer-events-auto touch-none'
        }`}
      />

      {/* Text Annotation Input Popover */}
      {textInputPos && (
        <div
          style={{ left: `${textInputPos.x}px`, top: `${textInputPos.y}px` }}
          className="absolute z-[70] -translate-y-full -translate-x-2 bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-2xl border border-blue-500 flex items-center gap-1.5 animate-in fade-in zoom-in-95"
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

      {/* 2. Draggable Ribbon Toolbar (Fixed in Viewport for instant access at any scroll position) */}
      <div
        className="fixed z-[70] w-[98vw] max-w-6xl draw-ribbon-no-capture animate-in slide-in-from-top-3 duration-200"
        style={
          toolbarOffset
            ? { left: `${toolbarOffset.x}px`, top: `${toolbarOffset.y}px`, transform: 'none' }
            : { left: '50%', top: '8px', transform: 'translateX(-50%)' }
        }
      >
        <div
          className={`rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
            isLight
              ? 'bg-[#f3f4f6]/95 border-slate-300/80 text-slate-800 shadow-slate-900/15'
              : 'bg-[#18181b]/95 border-white/20 text-white shadow-black/60'
          }`}
        >
          {/* Ribbon Header: Title, Active Tab indicator, Whiteboard badge, Drag Handle */}
          <div
            className={`px-4 py-1.5 border-b flex items-center justify-between text-xs select-none ${
              isLight ? 'bg-slate-200/70 border-slate-300' : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Drag Handle */}
              <div
                onPointerDown={handleToolbarPointerDown}
                onPointerMove={handleToolbarPointerMove}
                onPointerUp={handleToolbarPointerUp}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 cursor-grab active:cursor-grabbing font-bold text-[10px] uppercase tracking-wider select-none transition-colors"
                title={lang === 'te' ? 'టూల్‌బార్‌ను తరలించండి' : 'Drag toolbar anywhere'}
              >
                <GripHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'లాగండి' : 'Move'}</span>
              </div>

              {toolbarOffset && (
                <button
                  type="button"
                  onClick={() => setToolbarOffset(null)}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors cursor-pointer"
                  title="Reset toolbar position"
                >
                  Reset
                </button>
              )}

              {/* Title & Active Tab Badge */}
              <span className="font-extrabold tracking-wide uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'డ్రా టూల్' : 'Draw'}</span>
              </span>

              {/* Tab indicator badge */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                {lang === 'te' ? 'ట్యాబ్:' : 'Tab:'} {currentTabDisplay}
              </span>

              {/* Whiteboard status badge */}
              {isWhiteboard && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Presentation className="w-3 h-3" />
                  <span>{lang === 'te' ? 'వైట్‌బోర్డ్ ఆన్' : 'Whiteboard ON'}</span>
                </span>
              )}

              <span className={`text-[11px] font-medium hidden md:inline ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {activeTool === 'select'
                  ? lang === 'te'
                    ? '• సెలెక్ట్ మోడ్ (స్క్రోల్ / క్లిక్ చేయవచ్చు)'
                    : '• Select Mode: click & scroll freely'
                  : lang === 'te'
                  ? '• పేజీతో పాటు స్క్రోల్ అవుతుంది'
                  : '• Scrolls with page'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {strokes.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {strokes.length} {lang === 'te' ? 'గీతలు' : 'strokes'}
                </span>
              )}

              {/* Minimize / Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsRibbonCollapsed((prev) => !prev)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-slate-300 text-slate-600' : 'hover:bg-white/10 text-zinc-300'
                }`}
                title={isRibbonCollapsed ? 'Expand Ribbon' : 'Minimize Ribbon'}
              >
                {isRibbonCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close Draw Ribbon */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-rose-600 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close Draw Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ribbon Controls Body */}
          {!isRibbonCollapsed && (
            <div className="p-2 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-3 overflow-x-auto scrollbar-thin">
              {/* GROUP 1: TOOLS (Select, Draw Touch, Eraser) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  {/* Select Tool */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('select')}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool === 'select'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Select Mode: Click, select text, and scroll freely"
                  >
                    <MousePointer2 className="w-4 h-4" />
                    <span className="text-[10px] font-semibold mt-0.5">Select</span>
                  </button>

                  {/* Draw Tool */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTool === 'select' || activeTool === 'eraser') {
                        setActiveTool('pen');
                      }
                    }}
                    className={`flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool !== 'select' &&
                      activeTool !== 'eraser' &&
                      !activeTool.startsWith('shape_') &&
                      activeTool !== 'text'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Draw with Pen (Scrolls along with page)"
                  >
                    <PenTool className="w-4 h-4" />
                    <span className="text-[9px] font-semibold mt-0.5 whitespace-nowrap">Draw Ink</span>
                  </button>

                  {/* Eraser */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('eraser')}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool === 'eraser'
                        ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Eraser: Drag over any ink stroke to erase"
                  >
                    <Eraser className="w-4 h-4" />
                    <span className="text-[10px] font-semibold mt-0.5">Eraser</span>
                  </button>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Tools
                </span>
              </div>

              {/* Vertical Divider */}
              <div className={`w-[1px] h-12 shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />

              {/* GROUP 2: WHITEBOARD TOGGLE OPTION */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  {/* Whiteboard On/Off Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsWhiteboard((prev) => !prev);
                      if (!isWhiteboard) {
                        // When enabling whiteboard, if active pen was white, change to dark pen for contrast
                        if (penColor === '#ffffff' || penColor === '#f8fafc') {
                          setPenColor('#000000');
                        }
                      }
                    }}
                    className={`flex flex-col items-center justify-center px-3 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      isWhiteboard
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title={
                      isWhiteboard
                        ? 'Whiteboard Mode ON: Click to switch back to transparent screen overlay'
                        : 'Turn on Whiteboard: Clean board for drawing, math, notes & teaching'
                    }
                  >
                    <Presentation className="w-4 h-4" />
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] font-bold">
                        {lang === 'te' ? 'వైట్‌బోర్డ్' : 'Whiteboard'}
                      </span>
                      <span
                        className={`text-[8px] px-1 py-0.2 rounded font-extrabold ${
                          isWhiteboard ? 'bg-white text-emerald-800' : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {isWhiteboard ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </button>

                  {/* Whiteboard Background Pattern Dropdown */}
                  {isWhiteboard && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowWhiteboardMenu((prev) => !prev)}
                        className={`flex items-center gap-1 px-2 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                            : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        }`}
                        title="Whiteboard surface style (Plain, Grid, Ruled, Chalkboard)"
                      >
                        <Grid className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-semibold capitalize hidden sm:inline">
                          {whiteboardStyle}
                        </span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>

                      {showWhiteboardMenu && (
                        <div
                          className={`absolute top-full mt-2 left-0 p-1.5 rounded-2xl border shadow-2xl z-50 w-36 space-y-1 animate-in fade-in zoom-in-95 ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-[#1c1c1f] border-white/20 text-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setWhiteboardStyle('plain');
                              setShowWhiteboardMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer text-left ${
                              whiteboardStyle === 'plain' ? 'font-bold bg-emerald-500/20' : ''
                            }`}
                          >
                            <span>Plain White</span>
                            {whiteboardStyle === 'plain' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWhiteboardStyle('dots');
                              setShowWhiteboardMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer text-left ${
                              whiteboardStyle === 'dots' ? 'font-bold bg-emerald-500/20' : ''
                            }`}
                          >
                            <span>Grid Dots</span>
                            {whiteboardStyle === 'dots' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWhiteboardStyle('ruled');
                              setShowWhiteboardMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer text-left ${
                              whiteboardStyle === 'ruled' ? 'font-bold bg-emerald-500/20' : ''
                            }`}
                          >
                            <span>Ruled Lines</span>
                            {whiteboardStyle === 'ruled' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWhiteboardStyle('chalkboard');
                              setShowWhiteboardMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer text-left ${
                              whiteboardStyle === 'chalkboard' ? 'font-bold bg-emerald-500/20' : ''
                            }`}
                          >
                            <span>Chalkboard</span>
                            {whiteboardStyle === 'chalkboard' && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {lang === 'te' ? 'వైట్‌బోర్డ్' : 'Whiteboard'}
                </span>
              </div>

              {/* Vertical Divider */}
              <div className={`w-[1px] h-12 shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />

              {/* GROUP 3: UNDO / REDO */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={strokes.length === 0}
                    className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      strokes.length > 0
                        ? isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        : 'opacity-30 cursor-not-allowed border-transparent'
                    }`}
                    title="Undo stroke (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      redoStack.length > 0
                        ? isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        : 'opacity-30 cursor-not-allowed border-transparent'
                    }`}
                    title="Redo stroke (Ctrl+Y)"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-2 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Undo
                </span>
              </div>

              {/* Vertical Divider */}
              <div className={`w-[1px] h-12 shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />

              {/* GROUP 4: MS EXCEL PENS COLLECTION */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
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
                        onClick={() => handleSelectPen(pen)}
                        className={`group relative flex flex-col items-center justify-between h-14 w-8 sm:w-9 px-0.5 pt-1 pb-0.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                          isSelected
                            ? 'bg-blue-500/25 ring-2 ring-blue-500 shadow-md shadow-blue-500/30 -translate-y-1'
                            : isLight
                            ? 'hover:bg-slate-200/80 hover:-translate-y-0.5'
                            : 'hover:bg-white/10 hover:-translate-y-0.5'
                        }`}
                        title={pen.name}
                      >
                        <div
                          className="w-5 h-8 rounded-t-sm flex flex-col items-center justify-between relative shadow-xs border border-black/20"
                          style={{
                            background: pen.bodyColor,
                          }}
                        >
                          {pen.letter && (
                            <span className="text-[10px] font-black text-black select-none mt-0.5">
                              {pen.letter}
                            </span>
                          )}
                          {pen.type === 'galaxy' && (
                            <Sparkles className="w-3 h-3 text-white animate-pulse" />
                          )}
                          <div
                            className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] absolute -bottom-2"
                            style={{
                              borderTopColor: pen.tipColor,
                            }}
                          />
                        </div>

                        <span
                          className="w-2 h-2 rounded-full mt-2"
                          style={{ backgroundColor: pen.color }}
                        />
                      </button>
                    );
                  })}

                  {/* Color Palette / Thickness */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColorPalette((prev) => !prev)}
                      className={`flex flex-col items-center justify-center w-8 sm:w-9 h-14 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                        showColorPalette
                          ? 'bg-emerald-500/30 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-400'
                          : isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Custom Ink Color & Thickness"
                    >
                      <Plus className="w-4 h-4 text-emerald-500" />
                      <span className="text-[9px] font-bold">Add</span>
                    </button>

                    {showColorPalette && (
                      <div
                        className={`absolute top-full mt-2 left-0 p-3 rounded-2xl border shadow-2xl z-50 w-52 space-y-3 animate-in fade-in zoom-in-95 ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-[#1c1c1f] border-white/20 text-white'
                        }`}
                      >
                        <div className="text-[11px] font-bold">Custom Ink Color:</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            '#000000',
                            '#ffffff',
                            '#ef4444',
                            '#f97316',
                            '#facc15',
                            '#22c55e',
                            '#06b6d4',
                            '#3b82f6',
                            '#8b5cf6',
                            '#ec4899',
                          ].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setPenColor(c);
                                setActiveTool('pen');
                                setShowColorPalette(false);
                              }}
                              className="w-6 h-6 rounded-full border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>

                        <div className="text-[11px] font-bold pt-1 border-t border-white/10">
                          Thickness ({penWidth}px):
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[1.5, 2.5, 4, 8, 16, 24].map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => {
                                setPenWidth(w);
                                setShowColorPalette(false);
                              }}
                              className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                penWidth === w
                                  ? 'bg-blue-600 text-white border-blue-500'
                                  : isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300'
                                  : 'bg-white/10 hover:bg-white/15 border-white/10'
                              }`}
                            >
                              {w}p
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Pens
                </span>
              </div>

              {/* Vertical Divider */}
              <div className={`w-[1px] h-12 shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />

              {/* GROUP 5: SHAPES & TEXT NOTE */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShapesMenu((prev) => !prev)}
                      className={`flex items-center gap-1 px-2.5 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                        activeTool.startsWith('shape_')
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30'
                          : isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Shapes: Arrow, Rectangle, Circle, Line"
                    >
                      {activeShape === 'arrow' && <ArrowRight className="w-4 h-4" />}
                      {activeShape === 'rect' && <Square className="w-4 h-4" />}
                      {activeShape === 'circle' && <Circle className="w-4 h-4" />}
                      {activeShape === 'line' && <Minus className="w-4 h-4" />}
                      <span className="text-[10px] font-semibold hidden sm:inline">Shape</span>
                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                    </button>

                    {showShapesMenu && (
                      <div
                        className={`absolute top-full mt-2 left-0 p-1.5 rounded-2xl border shadow-2xl z-50 w-36 space-y-1 animate-in fade-in zoom-in-95 ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-[#1c1c1f] border-white/20 text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectShape('arrow')}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-purple-600 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>Arrow (బాణం)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectShape('rect')}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-purple-600 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <Square className="w-4 h-4" />
                          <span>Box / Rect</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectShape('circle')}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-purple-600 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <Circle className="w-4 h-4" />
                          <span>Circle / Oval</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectShape('line')}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-purple-600 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <Minus className="w-4 h-4" />
                          <span>Straight Line</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Text Note Tool */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('text')}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      activeTool === 'text'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                    title="Click anywhere to type a Text Note annotation"
                  >
                    <Type className="w-4 h-4" />
                    <span className="text-[10px] font-semibold mt-0.5">Note</span>
                  </button>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Convert
                </span>
              </div>

              {/* Vertical Divider */}
              <div className={`w-[1px] h-12 shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />

              {/* GROUP 6: CLEAR & DOWNLOAD CURRENT PAGE PDF */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1.5">
                  {/* Clear All for Current Tab */}
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={strokes.length === 0}
                    className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      strokes.length > 0
                        ? isLight
                          ? 'bg-white hover:bg-red-50 border-red-200 text-red-600'
                          : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
                        : 'opacity-30 cursor-not-allowed border-transparent'
                    }`}
                    title={`Clear drawings on ${currentTabDisplay}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[9px] font-semibold mt-0.5">Clear</span>
                  </button>

                  {/* DOWNLOAD PDF: ONLY CURRENT PAGE DATA */}
                  <button
                    type="button"
                    onClick={handleDownloadPDFCurrentPage}
                    disabled={isCapturing}
                    className="flex flex-col items-center justify-center px-4 h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95 border border-white/20 whitespace-nowrap disabled:opacity-50"
                    title={
                      lang === 'te'
                        ? 'ప్రస్తుత పేజీని మాత్రమే పీడీఎఫ్‌గా డౌన్‌లోడ్ చేయండి'
                        : 'Download PDF of current page only with drawn annotations'
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold mt-0.5">
                      {isCapturing
                        ? lang === 'te'
                          ? 'సేవ్ అవుతోంది...'
                          : 'Saving Page...'
                        : lang === 'te'
                        ? 'పీడీఎఫ్ డౌన్‌లోడ్'
                        : 'Download PDF'}
                    </span>
                  </button>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {lang === 'te' ? 'ప్రస్తుత పేజీ పీడీఎఫ్' : 'Current Page PDF'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download Success Floating Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}
    </>
  );
};
