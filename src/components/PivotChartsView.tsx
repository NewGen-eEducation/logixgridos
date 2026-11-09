import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GoogleSheetsPivotConfig, 
  ColumnDef 
} from '../types/register';
import { PivotGridMatrix, PivotCalculatedCell } from '../utils/googleSheetsPivot';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Download, 
  Layers, 
  Check, 
  Eye, 
  EyeOff,
  Filter,
  Search,
  RotateCcw,
  ChevronDown,
  Award,
  CheckSquare,
  Square
} from 'lucide-react';

export type ChartType = 
  | 'vertical_bar' 
  | 'horizontal_bar' 
  | 'stacked_bar' 
  | 'grouped_bar'
  | 'line' 
  | 'multi_line' 
  | 'area'
  | 'pie' 
  | 'donut';

interface PivotChartsViewProps {
  pivotResult: PivotGridMatrix;
  pivotConfig: GoogleSheetsPivotConfig;
  columns: ColumnDef[];
  pivotName?: string;
  formatMode?: 'default' | 'currency' | 'percent';
}

// Vibrant high-contrast chart palette
const CHART_COLORS = [
  '#0a84ff', // Electric Blue
  '#30d158', // Vivid Emerald Green
  '#bf5af2', // Royal Purple
  '#ff9f0a', // Warm Amber
  '#ff453a', // Coral Red
  '#64d2ff', // Sky Cyan
  '#ffd60a', // Bright Yellow
  '#ff375f', // Deep Rose
  '#5e5ce6', // Indigo
  '#ac8e68', // Bronze
  '#00c7be', // Teal
  '#da8fff', // Lavender
];

export const PivotChartsView: React.FC<PivotChartsViewProps> = ({
  pivotResult,
  pivotConfig,
  columns,
  pivotName = 'Pivot Analysis',
  formatMode = 'default',
}) => {
  // Chart Type State
  const [chartType, setChartType] = useState<ChartType>('vertical_bar');
  const [selectedValIdx, setSelectedValIdx] = useState<number>(0);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(true);
  const [barLabelPosition, setBarLabelPosition] = useState<'outside' | 'inside'>('outside');
  const [hoveredIndex, setHoveredIndex] = useState<{ seriesIdx?: number; itemIdx?: number } | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<number>>(new Set());

  const isBarChart = chartType === 'vertical_bar' || chartType === 'horizontal_bar' || chartType === 'grouped_bar' || chartType === 'stacked_bar';

  // Category and Column-wise filter state
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(() => new Set(pivotResult.rowKeys));
  const [selectedColKeys, setSelectedColKeys] = useState<Set<string>>(() => new Set(pivotResult.colKeys));
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'rows' | 'cols'>('rows');

  const svgRef = useRef<SVGSVGElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamically calculate whether the filter dropdown should align left or right to avoid clipping
  const updateDropdownAlignment = () => {
    if (filterDropdownRef.current) {
      const btnRect = filterDropdownRef.current.getBoundingClientRect();
      const parentEl = filterDropdownRef.current.closest('.pivot-chart-root') || filterDropdownRef.current.parentElement;
      const parentRect = parentEl ? parentEl.getBoundingClientRect() : { left: 0, right: window.innerWidth };
      
      const spaceToRight = parentRect.right - btnRect.left;
      const spaceToLeft = btnRect.right - parentRect.left;

      // If opening to the right would overflow the container boundary (< 320px) AND opening left has plenty of space, use right-0
      if (spaceToRight < 320 && spaceToLeft >= 300) {
        setDropdownAlign('right');
      } else {
        // Otherwise default to left-0 so it expands inside the container and never gets clipped on the left
        setDropdownAlign('left');
      }
    }
  };

  // Sync filter selections when pivotResult changes
  useEffect(() => {
    setSelectedRowKeys(new Set(pivotResult.rowKeys));
  }, [pivotResult.rowKeys]);

  useEffect(() => {
    setSelectedColKeys(new Set(pivotResult.colKeys));
  }, [pivotResult.colKeys]);

  // Recalculate alignment on open and on window resize
  useEffect(() => {
    if (isFilterDropdownOpen) {
      updateDropdownAlignment();
      window.addEventListener('resize', updateDropdownAlignment);
      return () => window.removeEventListener('resize', updateDropdownAlignment);
    }
  }, [isFilterDropdownOpen]);

  // Close filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Active Value Config
  const activeValueConfigs = pivotConfig.values.filter((v) => v.id);
  const currentValConfig = activeValueConfigs[selectedValIdx] || activeValueConfigs[0];
  const valueCol = columns.find((c) => c.id === currentValConfig?.id);
  const valLabel = valueCol ? `${currentValConfig?.summarizeBy || 'SUM'} of ${valueCol.name}` : 'Calculated Metric';

  // Row dimension label (supports single or multiple rows)
  const rowCols = (pivotConfig.rows || []).map((r) => columns.find((c) => c.id === r.id)).filter(Boolean);
  const rowDimensionName = rowCols.length > 0 ? rowCols.map((c) => c!.name).join(' › ') : 'Category';

  // Col dimension label (supports single or multiple columns)
  const colCols = (pivotConfig.columns || []).map((c) => columns.find((col) => col.id === c.id)).filter(Boolean);
  const hasColDimension = pivotConfig.columns.length > 0 && pivotResult.colKeys.length > 0 && pivotResult.colKeys[0] !== 'Total';
  const colDimensionName = colCols.length > 0 ? colCols.map((c) => c!.name).join(' › ') : 'Column Series';

  // Number format helper
  const formatVal = (num: number) => {
    if (formatMode === 'currency') return `₹ ${num.toLocaleString()}`;
    if (formatMode === 'percent') return `${num.toFixed(1)}%`;
    return num.toLocaleString();
  };

  // 1. Data series preparation with robust cell value retrieval
  const chartData = useMemo(() => {
    const valId = currentValConfig?.id || '';

    // Safe cell accessor that checks metric ID, string index, and first available object entry
    const getCell = (rec: Record<string, PivotCalculatedCell> | undefined): PivotCalculatedCell => {
      if (!rec) return { raw: 0, formatted: '0', count: 0 };
      if (valId && rec[valId] !== undefined) return rec[valId];
      if (rec[String(selectedValIdx)] !== undefined) return rec[String(selectedValIdx)];
      const vals = Object.values(rec);
      if (vals[selectedValIdx]) return vals[selectedValIdx];
      if (vals[0]) return vals[0];
      return { raw: 0, formatted: '0', count: 0 };
    };

    // Filter items based on user's category/row filters
    const activeRowKeys = pivotResult.rowKeys.filter((k) => selectedRowKeys.has(k));
    const activeColKeys = pivotResult.colKeys.filter((k) => selectedColKeys.has(k));

    // Primary items: along activeRowKeys
    const items = activeRowKeys.map((rKey, rIdx) => {
      // Row total cell
      const totalCell = getCell(pivotResult.rowTotals[rKey]);
      
      // Values per column dimension if present
      const colValues = activeColKeys.map((cKey) => {
        const cell = getCell(pivotResult.matrix[rKey]?.[cKey]);
        return {
          colKey: cKey,
          raw: cell.raw || 0,
          formatted: cell.formatted || String(cell.raw || 0),
          count: cell.count || 0,
        };
      });

      const rawVal = totalCell.raw || 0;

      return {
        id: rKey,
        label: rKey || '(Blank)',
        totalRaw: rawVal,
        formattedTotal: totalCell.formatted || formatVal(rawVal),
        count: totalCell.count || 0,
        colValues,
        color: CHART_COLORS[rIdx % CHART_COLORS.length],
      };
    });

    // Grand total calculation:
    // If a subset of rows is filtered, re-sum the active items; otherwise use pivotResult.grandTotals
    const grandTotalCell = getCell(pivotResult.grandTotals);
    const isSubset = activeRowKeys.length < pivotResult.rowKeys.length;
    const computedSum = items.reduce((acc, it) => acc + it.totalRaw, 0);
    const grandTotal = isSubset ? computedSum : (grandTotalCell.raw || computedSum);
    const grandTotalFormatted = isSubset ? formatVal(grandTotal) : (grandTotalCell.formatted || formatVal(grandTotal));

    const maxVal = Math.max(...items.map((it) => it.totalRaw), 1);
    const minVal = Math.min(...items.map((it) => it.totalRaw), 0);

    return {
      items,
      grandTotal,
      grandTotalFormatted,
      maxVal,
      minVal,
      activeColKeys,
    };
  }, [pivotResult, selectedValIdx, currentValConfig, selectedRowKeys, selectedColKeys, formatMode]);

  // KPI Statistics
  const kpiStats = useMemo(() => {
    if (chartData.items.length === 0) return null;
    let maxItem = chartData.items[0];
    let minItem = chartData.items[0];

    chartData.items.forEach((it) => {
      if (it.totalRaw > maxItem.totalRaw) maxItem = it;
      if (it.totalRaw < minItem.totalRaw) minItem = it;
    });

    const avg = chartData.grandTotal / (chartData.items.length || 1);

    return {
      total: chartData.grandTotalFormatted,
      avg: Number(avg.toFixed(2)).toLocaleString(),
      count: chartData.items.length,
      maxLabel: maxItem.label,
      maxVal: maxItem.formattedTotal,
      maxPct: chartData.grandTotal > 0 ? ((maxItem.totalRaw / chartData.grandTotal) * 100).toFixed(1) : '0',
      minLabel: minItem.label,
      minVal: minItem.formattedTotal,
    };
  }, [chartData]);

  // Toggle row category filter
  const toggleRowKey = (key: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle column dimension filter
  const toggleColKey = (key: string) => {
    setSelectedColKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle series visibility in legend
  const toggleSeries = (sIdx: number) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(sIdx)) next.delete(sIdx);
      else next.add(sIdx);
      return next;
    });
  };

  // Select all or clear all
  const selectAllRows = () => setSelectedRowKeys(new Set(pivotResult.rowKeys));
  const deselectAllRows = () => {
    if (pivotResult.rowKeys.length > 0) {
      setSelectedRowKeys(new Set([pivotResult.rowKeys[0]]));
    }
  };

  const selectAllCols = () => setSelectedColKeys(new Set(pivotResult.colKeys));
  const deselectAllCols = () => {
    if (pivotResult.colKeys.length > 0) {
      setSelectedColKeys(new Set([pivotResult.colKeys[0]]));
    }
  };

  // Download Chart SVG
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${pivotName.replace(/\s+/g, '_')}_${chartType}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // Filtered lists for the popover search
  const filteredRowKeysForPopover = useMemo(() => {
    if (!filterSearchQuery) return pivotResult.rowKeys;
    const q = filterSearchQuery.toLowerCase();
    return pivotResult.rowKeys.filter((k) => k.toLowerCase().includes(q));
  }, [pivotResult.rowKeys, filterSearchQuery]);

  const filteredColKeysForPopover = useMemo(() => {
    if (!filterSearchQuery) return pivotResult.colKeys;
    const q = filterSearchQuery.toLowerCase();
    return pivotResult.colKeys.filter((k) => k.toLowerCase().includes(q));
  }, [pivotResult.colKeys, filterSearchQuery]);

  // Dimensions for SVG canvas
  const svgWidth = 840;
  const svgHeight = 440;
  const padding = { top: 40, right: 40, bottom: 65, left: 75 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  // 1. VERTICAL BAR CHART (Column)
  const renderVerticalBarChart = () => {
    const { items, maxVal } = chartData;
    if (items.length === 0) return null;

    const barWidth = Math.max(16, Math.min(54, (innerWidth / items.length) * 0.65));
    const step = innerWidth / items.length;

    return (
      <g>
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + innerHeight - pct * innerHeight;
          const val = maxVal * pct;
          return (
            <g key={idx} className="transition-opacity">
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#ffffff"
                strokeOpacity={idx === 0 ? 0.2 : 0.08}
                strokeDasharray={idx === 0 ? undefined : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-400 font-mono"
              >
                {formatVal(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {items.map((item, idx) => {
          const barHeight = maxVal > 0 ? (item.totalRaw / maxVal) * innerHeight : 0;
          const x = padding.left + idx * step + (step - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;
          const isHovered = hoveredIndex?.itemIdx === idx;

          return (
            <g 
              key={item.id} 
              onMouseEnter={() => setHoveredIndex({ itemIdx: idx })}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer group"
            >
              {/* Bar Rect */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 3)}
                rx="6"
                ry="6"
                fill={item.color}
                opacity={hoveredIndex === null || isHovered ? 0.95 : 0.4}
                className="transition-all duration-200"
                style={{
                  filter: isHovered ? 'drop-shadow(0 0 10px rgba(10, 132, 255, 0.5))' : undefined,
                }}
              />

              {/* Data Value Label */}
              {showDataLabels && (
                <g className="pointer-events-none select-none">
                  {(() => {
                    const isInside = barLabelPosition === 'inside';
                    const canFitInside = barHeight >= 22;
                    const labelY = (isInside && canFitInside)
                      ? y + 14
                      : Math.max(padding.top + 10, y - 6);
                    const labelFill = (isInside && canFitInside)
                      ? '#ffffff'
                      : (isHovered ? '#ffffff' : '#e4e4e7');

                    return (
                      <>
                        <text
                          x={x + barWidth / 2}
                          y={labelY}
                          textAnchor="middle"
                          stroke="#161618"
                          strokeWidth="3.5"
                          strokeLinejoin="round"
                          className="text-[10px] font-semibold font-mono"
                        >
                          {item.formattedTotal}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={labelY}
                          textAnchor="middle"
                          fill={labelFill}
                          className="text-[10px] font-semibold font-mono"
                        >
                          {item.formattedTotal}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Category X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + innerHeight + 18}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400 truncate font-medium select-none"
                style={{ maxWidth: step }}
              >
                {item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // 2. HORIZONTAL BAR CHART
  const renderHorizontalBarChart = () => {
    const { items, maxVal } = chartData;
    if (items.length === 0) return null;

    const rowHeight = innerHeight / items.length;
    const barThick = Math.max(14, Math.min(32, rowHeight * 0.65));

    return (
      <g>
        {/* Vertical Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const x = padding.left + pct * innerWidth;
          const val = maxVal * pct;
          return (
            <g key={idx}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + innerHeight}
                stroke="#ffffff"
                strokeOpacity={idx === 0 ? 0.2 : 0.08}
                strokeDasharray={idx === 0 ? undefined : '4 4'}
              />
              <text
                x={x}
                y={padding.top + innerHeight + 18}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400 font-mono"
              >
                {formatVal(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* Horizontal Bars */}
        {items.map((item, idx) => {
          const barWidth = maxVal > 0 ? (item.totalRaw / maxVal) * innerWidth : 0;
          const y = padding.top + idx * rowHeight + (rowHeight - barThick) / 2;
          const isHovered = hoveredIndex?.itemIdx === idx;

          return (
            <g 
              key={item.id}
              onMouseEnter={() => setHoveredIndex({ itemIdx: idx })}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer group"
            >
              {/* Row Label */}
              <text
                x={padding.left - 10}
                y={y + barThick / 2 + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-300 font-medium truncate"
              >
                {item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label}
              </text>

              {/* Bar */}
              <rect
                x={padding.left}
                y={y}
                width={Math.max(barWidth, 3)}
                height={barThick}
                rx="5"
                ry="5"
                fill={item.color}
                opacity={hoveredIndex === null || isHovered ? 0.95 : 0.4}
                className="transition-all duration-200"
              />

              {/* Value Label beside or inside bar */}
              {showDataLabels && (
                <g className="pointer-events-none select-none">
                  {(() => {
                    const isInside = barLabelPosition === 'inside';
                    const canFitInside = barWidth >= 44;
                    const labelX = (isInside && canFitInside)
                      ? padding.left + barWidth - 8
                      : padding.left + Math.max(barWidth, 3) + 8;
                    const textAnchor = (isInside && canFitInside) ? 'end' : 'start';
                    const labelFill = (isInside && canFitInside) ? '#ffffff' : (isHovered ? '#ffffff' : '#e4e4e7');

                    return (
                      <>
                        <text
                          x={labelX}
                          y={y + barThick / 2 + 4}
                          textAnchor={textAnchor}
                          stroke="#161618"
                          strokeWidth="3.5"
                          strokeLinejoin="round"
                          className="text-[10px] fill-zinc-200 font-mono font-semibold"
                        >
                          {item.formattedTotal}
                        </text>
                        <text
                          x={labelX}
                          y={y + barThick / 2 + 4}
                          textAnchor={textAnchor}
                          fill={labelFill}
                          className="text-[10px] font-mono font-semibold"
                        >
                          {item.formattedTotal}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // 3. GROUPED / MULTI-SERIES BAR CHART
  const renderGroupedBarChart = () => {
    const { items, activeColKeys } = chartData;
    if (items.length === 0) return null;

    const seriesCount = hasColDimension ? activeColKeys.length : 1;
    let maxSubVal = 1;

    items.forEach((it) => {
      if (hasColDimension) {
        it.colValues.forEach((c) => {
          if (c.raw > maxSubVal) maxSubVal = c.raw;
        });
      } else {
        if (it.totalRaw > maxSubVal) maxSubVal = it.totalRaw;
      }
    });

    const groupStep = innerWidth / items.length;
    const barWidth = Math.max(8, Math.min(26, (groupStep * 0.8) / seriesCount));

    return (
      <g>
        {/* Y-Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + innerHeight - pct * innerHeight;
          const val = maxSubVal * pct;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#ffffff"
                strokeOpacity={idx === 0 ? 0.2 : 0.08}
                strokeDasharray={idx === 0 ? undefined : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-400 font-mono"
              >
                {formatVal(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* Bar Groups */}
        {items.map((item, rIdx) => {
          const groupX = padding.left + rIdx * groupStep + (groupStep - barWidth * seriesCount) / 2;

          return (
            <g key={item.id}>
              {hasColDimension ? (
                item.colValues.map((cVal, cIdx) => {
                  if (hiddenSeries.has(cIdx)) return null;
                  const bHeight = maxSubVal > 0 ? (cVal.raw / maxSubVal) * innerHeight : 0;
                  const bx = groupX + cIdx * barWidth;
                  const by = padding.top + innerHeight - bHeight;
                  const isHover = hoveredIndex?.itemIdx === rIdx && hoveredIndex?.seriesIdx === cIdx;
                  const color = CHART_COLORS[cIdx % CHART_COLORS.length];
                  const rawVal = cVal.raw ?? 0;
                  const formattedVal = cVal.formatted ?? String(rawVal);

                  const isInside = barLabelPosition === 'inside';
                  const canFitInside = bHeight >= 18;
                  const labelY = (isInside && canFitInside)
                    ? by + 12
                    : Math.max(padding.top + 8, by - 5);
                  const labelFill = (isInside && canFitInside)
                    ? '#ffffff'
                    : (isHover ? '#ffffff' : '#e4e4e7');

                  return (
                    <g 
                      key={cVal.colKey}
                      onMouseEnter={() => setHoveredIndex({ itemIdx: rIdx, seriesIdx: cIdx })}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={bx}
                        y={by}
                        width={Math.max(barWidth - 2, 2)}
                        height={Math.max(bHeight, 2)}
                        rx="4"
                        ry="4"
                        fill={color}
                        opacity={hoveredIndex === null || isHover ? 0.95 : 0.4}
                      />
                      {showDataLabels && (
                        <g className="pointer-events-none select-none">
                          <text
                            x={bx + (barWidth - 2) / 2}
                            y={labelY}
                            textAnchor="middle"
                            stroke="#161618"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            className={`font-mono font-bold ${barWidth < 14 ? 'text-[8px]' : 'text-[9.5px]'}`}
                          >
                            {formattedVal}
                          </text>
                          <text
                            x={bx + (barWidth - 2) / 2}
                            y={labelY}
                            textAnchor="middle"
                            fill={labelFill}
                            className={`font-mono font-bold ${barWidth < 14 ? 'text-[8px]' : 'text-[9.5px]'}`}
                          >
                            {formattedVal}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })
              ) : (
                (() => {
                  const bHeight = maxSubVal > 0 ? (item.totalRaw / maxSubVal) * innerHeight : 0;
                  const by = padding.top + innerHeight - bHeight;
                  const isHover = hoveredIndex?.itemIdx === rIdx;
                  const isInside = barLabelPosition === 'inside';
                  const canFitInside = bHeight >= 18;
                  const labelY = (isInside && canFitInside)
                    ? by + 12
                    : Math.max(padding.top + 8, by - 5);
                  const labelFill = (isInside && canFitInside)
                    ? '#ffffff'
                    : (isHover ? '#ffffff' : '#e4e4e7');

                  return (
                    <g
                      onMouseEnter={() => setHoveredIndex({ itemIdx: rIdx })}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={groupX}
                        y={by}
                        width={barWidth}
                        height={Math.max(bHeight, 2)}
                        rx="4"
                        ry="4"
                        fill={item.color}
                        opacity={hoveredIndex === null || isHover ? 0.95 : 0.4}
                      />
                      {showDataLabels && (
                        <g className="pointer-events-none select-none">
                          <text
                            x={groupX + barWidth / 2}
                            y={labelY}
                            textAnchor="middle"
                            stroke="#161618"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            className="text-[9.5px] font-mono font-bold"
                          >
                            {item.formattedTotal}
                          </text>
                          <text
                            x={groupX + barWidth / 2}
                            y={labelY}
                            textAnchor="middle"
                            fill={labelFill}
                            className="text-[9.5px] font-mono font-bold"
                          >
                            {item.formattedTotal}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })()
              )}

              {/* Group X Axis Label */}
              <text
                x={padding.left + rIdx * groupStep + groupStep / 2}
                y={padding.top + innerHeight + 18}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400 font-medium"
              >
                {item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // 4. STACKED BAR CHART
  const renderStackedBarChart = () => {
    const { items } = chartData;
    if (items.length === 0) return null;

    let maxStacked = 1;
    items.forEach((it) => {
      const sum = it.colValues.reduce((acc, c, idx) => hiddenSeries.has(idx) ? acc : acc + c.raw, 0);
      if (sum > maxStacked) maxStacked = sum;
    });

    const step = innerWidth / items.length;
    const barWidth = Math.max(16, Math.min(50, step * 0.65));

    return (
      <g>
        {/* Y Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + innerHeight - pct * innerHeight;
          const val = maxStacked * pct;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#ffffff"
                strokeOpacity={idx === 0 ? 0.2 : 0.08}
                strokeDasharray={idx === 0 ? undefined : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-400 font-mono"
              >
                {formatVal(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* Stacked Bars */}
        {items.map((item, rIdx) => {
          const x = padding.left + rIdx * step + (step - barWidth) / 2;
          let currentY = padding.top + innerHeight;
          const stackTotal = item.colValues.reduce(
            (acc, c, idx) => (hiddenSeries.has(idx) ? acc : acc + c.raw),
            0
          );

          return (
            <g key={item.id}>
              {item.colValues.map((cVal, cIdx) => {
                if (hiddenSeries.has(cIdx)) return null;
                const segHeight = maxStacked > 0 ? (cVal.raw / maxStacked) * innerHeight : 0;
                currentY -= segHeight;
                const segY = currentY;
                const isHover = hoveredIndex?.itemIdx === rIdx && hoveredIndex?.seriesIdx === cIdx;
                const color = CHART_COLORS[cIdx % CHART_COLORS.length];

                return (
                  <g key={cVal.colKey}>
                    <rect
                      x={x}
                      y={segY}
                      width={barWidth}
                      height={Math.max(segHeight, 0)}
                      fill={color}
                      opacity={hoveredIndex === null || isHover ? 0.95 : 0.4}
                      onMouseEnter={() => setHoveredIndex({ itemIdx: rIdx, seriesIdx: cIdx })}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer transition-opacity"
                    />

                    {/* Segment Value Label if inside or on hover */}
                    {showDataLabels && (barLabelPosition === 'inside' || isHover) && segHeight >= 14 && (
                      <g className="pointer-events-none select-none">
                        <text
                          x={x + barWidth / 2}
                          y={segY + segHeight / 2 + 4}
                          textAnchor="middle"
                          stroke="#161618"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          className="text-[9px] font-mono font-bold"
                        >
                          {cVal.formatted}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={segY + segHeight / 2 + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          className="text-[9px] font-mono font-bold"
                        >
                          {cVal.formatted}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Outside Grand Total for Stacked Column */}
              {showDataLabels && barLabelPosition === 'outside' && (
                <g className="pointer-events-none select-none">
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(padding.top + 8, currentY - 6)}
                    textAnchor="middle"
                    stroke="#161618"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    className="text-[9.5px] font-mono font-bold"
                  >
                    {formatVal(stackTotal)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(padding.top + 8, currentY - 6)}
                    textAnchor="middle"
                    fill="#e4e4e7"
                    className="text-[9.5px] font-mono font-bold"
                  >
                    {formatVal(stackTotal)}
                  </text>
                </g>
              )}

              {/* Group X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + innerHeight + 18}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400 font-medium"
              >
                {item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // 5. LINE & AREA CHARTS
  const renderLineOrAreaChart = (isArea: boolean) => {
    const { items, maxVal } = chartData;
    if (items.length === 0) return null;

    const step = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth;

    const points = items.map((it, idx) => ({
      x: padding.left + (items.length > 1 ? idx * step : innerWidth / 2),
      y: padding.top + innerHeight - (maxVal > 0 ? (it.totalRaw / maxVal) * innerHeight : 0),
      raw: it.totalRaw,
      formatted: it.formattedTotal,
      label: it.label,
    }));

    const linePathD = points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '');
    const areaPathD = `${linePathD} L ${points[points.length - 1].x},${padding.top + innerHeight} L ${points[0].x},${padding.top + innerHeight} Z`;

    return (
      <g>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0a84ff" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + innerHeight - pct * innerHeight;
          const val = maxVal * pct;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#ffffff"
                strokeOpacity={idx === 0 ? 0.2 : 0.08}
                strokeDasharray={idx === 0 ? undefined : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-400 font-mono"
              >
                {formatVal(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {isArea && (
          <path d={areaPathD} fill="url(#areaGradient)" />
        )}

        {/* Line Stroke */}
        <path
          d={linePathD}
          fill="none"
          stroke="#0a84ff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {points.map((p, idx) => {
          const isHover = hoveredIndex?.itemIdx === idx;
          return (
            <g 
              key={idx}
              onMouseEnter={() => setHoveredIndex({ itemIdx: idx })}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isHover ? 6.5 : 4.5}
                fill="#ffffff"
                stroke="#0a84ff"
                strokeWidth="2.5"
                className="transition-all"
              />

              {showDataLabels && (
                <g className="pointer-events-none select-none">
                  <text
                    x={p.x}
                    y={Math.max(padding.top + 8, p.y - 10)}
                    textAnchor="middle"
                    stroke="#161618"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    className="text-[10px] font-mono font-bold"
                  >
                    {p.formatted || String(p.raw)}
                  </text>
                  <text
                    x={p.x}
                    y={Math.max(padding.top + 8, p.y - 10)}
                    textAnchor="middle"
                    fill={isHover ? '#ffffff' : '#64d2ff'}
                    className="text-[10px] font-mono font-bold"
                  >
                    {p.formatted || String(p.raw)}
                  </text>
                </g>
              )}

              <text
                x={p.x}
                y={padding.top + innerHeight + 18}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400 font-medium"
              >
                {p.label.length > 10 ? `${p.label.slice(0, 9)}…` : p.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // 6. MULTI-SERIES LINE CHART
  const renderMultiSeriesLineChart = () => {
    if (!hasColDimension) return renderLineOrAreaChart(false);
    const { items, activeColKeys } = chartData;
    if (items.length === 0) return null;

    let maxSubVal = 1;
    items.forEach((it) => {
      it.colValues.forEach((c) => {
        if (c.raw > maxSubVal) maxSubVal = c.raw;
      });
    });

    const step = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth;

    return (
      <g>
        {/* Y Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + innerHeight - pct * innerHeight;
          const val = maxSubVal * pct;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#ffffff"
                strokeOpacity={idx === 0 ? 0.2 : 0.08}
                strokeDasharray={idx === 0 ? undefined : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-400 font-mono"
              >
                {formatVal(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* Multi Lines per Column Dimension */}
        {activeColKeys.map((cKey, cIdx) => {
          if (hiddenSeries.has(cIdx)) return null;
          const color = CHART_COLORS[cIdx % CHART_COLORS.length];
          const seriesPoints = items.map((it, rIdx) => {
            const rawVal = it.colValues[cIdx]?.raw ?? 0;
            return {
              x: padding.left + (items.length > 1 ? rIdx * step : innerWidth / 2),
              y: padding.top + innerHeight - (maxSubVal > 0 ? (rawVal / maxSubVal) * innerHeight : 0),
              raw: rawVal,
              formatted: it.colValues[cIdx]?.formatted ?? String(rawVal),
            };
          });

          const pathD = seriesPoints.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '');

          return (
            <g key={cKey}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {seriesPoints.map((p, rIdx) => {
                const isHover = hoveredIndex?.itemIdx === rIdx && hoveredIndex?.seriesIdx === cIdx;
                return (
                  <circle
                    key={rIdx}
                    cx={p.x}
                    cy={p.y}
                    r={isHover ? 6 : 4}
                    fill="#ffffff"
                    stroke={color}
                    strokeWidth={isHover ? 3 : 2}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredIndex({ itemIdx: rIdx, seriesIdx: cIdx })}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Data Value Labels on Points for Multi-Line Chart */}
        {showDataLabels && activeColKeys.map((cKey, cIdx) => {
          if (hiddenSeries.has(cIdx)) return null;
          const color = CHART_COLORS[cIdx % CHART_COLORS.length];

          return items.map((it, rIdx) => {
            const rawVal = it.colValues[cIdx]?.raw ?? 0;
            const formattedVal = it.colValues[cIdx]?.formatted ?? String(rawVal);
            const x = padding.left + (items.length > 1 ? rIdx * step : innerWidth / 2);
            const y = padding.top + innerHeight - (maxSubVal > 0 ? (rawVal / maxSubVal) * innerHeight : 0);
            const isHover = hoveredIndex?.itemIdx === rIdx && hoveredIndex?.seriesIdx === cIdx;

            // Stagger labels if multiple visible series meet at the same raw value at this x coordinate
            const coincidentSeries = activeColKeys
              .map((_, idx) => (!hiddenSeries.has(idx) && (items[rIdx]?.colValues[idx]?.raw ?? 0) === rawVal ? idx : -1))
              .filter((idx) => idx !== -1);
            
            const rank = coincidentSeries.indexOf(cIdx);
            const totalCoincident = coincidentSeries.length;

            let labelY = y - 9;
            if (totalCoincident > 1) {
              if (y >= padding.top + innerHeight - 14) {
                // At baseline (e.g. 0 values), stack upward
                labelY = y - 9 - rank * 13;
              } else {
                // At higher points, alternate stagger
                labelY = y - 9 - (rank % 2 === 0 ? rank * 8 : -rank * 10);
              }
            }

            return (
              <g 
                key={`lbl-${cKey}-${it.id}`}
                className="pointer-events-none select-none transition-opacity"
              >
                {/* Background Halo for optimal contrast and readability */}
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  stroke="#161618"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  className="text-[9.5px] font-mono font-bold"
                >
                  {formattedVal}
                </text>
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  fill={isHover ? '#ffffff' : color}
                  className="text-[9.5px] font-mono font-bold"
                >
                  {formattedVal}
                </text>
              </g>
            );
          });
        })}

        {/* X Axis Labels */}
        {items.map((it, idx) => {
          const x = padding.left + (items.length > 1 ? idx * step : innerWidth / 2);
          return (
            <text
              key={it.id}
              x={x}
              y={padding.top + innerHeight + 18}
              textAnchor="middle"
              className="text-[10px] fill-zinc-400 font-medium"
            >
              {it.label.length > 10 ? `${it.label.slice(0, 9)}…` : it.label}
            </text>
          );
        })}
      </g>
    );
  };

  // 7. PIE & DONUT CHARTS
  const renderPieOrDonutChart = (isDonut: boolean) => {
    const { items, grandTotal } = chartData;
    if (items.length === 0 || grandTotal <= 0) return null;

    const centerX = svgWidth / 2 - 80;
    const centerY = svgHeight / 2;
    const radius = 135;
    const innerRadius = isDonut ? 75 : 0;

    let cumulativeAngle = 0;

    return (
      <g>
        {items.map((item, idx) => {
          const sliceAngle = (item.totalRaw / grandTotal) * 2 * Math.PI;
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + sliceAngle;
          cumulativeAngle = endAngle;

          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);

          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          let pathD = '';
          if (isDonut) {
            const ix1 = centerX + innerRadius * Math.cos(endAngle);
            const iy1 = centerY + innerRadius * Math.sin(endAngle);
            const ix2 = centerX + innerRadius * Math.cos(startAngle);
            const iy2 = centerY + innerRadius * Math.sin(startAngle);

            pathD = `
              M ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
              L ${ix1} ${iy1}
              A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}
              Z
            `;
          } else {
            pathD = `
              M ${centerX} ${centerY}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
              Z
            `;
          }

          const isHover = hoveredIndex?.itemIdx === idx;
          const midAngle = startAngle + sliceAngle / 2;
          const labelDist = radius * 0.7;
          const lx = centerX + labelDist * Math.cos(midAngle);
          const ly = centerY + labelDist * Math.sin(midAngle);
          const pct = ((item.totalRaw / grandTotal) * 100).toFixed(1);

          return (
            <g
              key={item.id}
              onMouseEnter={() => setHoveredIndex({ itemIdx: idx })}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <path
                d={pathD}
                fill={item.color}
                opacity={hoveredIndex === null || isHover ? 0.92 : 0.45}
                stroke="#161618"
                strokeWidth="2.5"
                className="transition-all duration-200"
                style={{
                  transform: isHover ? `scale(1.03)` : undefined,
                  transformOrigin: `${centerX}px ${centerY}px`,
                }}
              />

              {showDataLabels && sliceAngle > 0.35 && (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-bold fill-white select-none pointer-events-none drop-shadow-md"
                >
                  {pct}%
                </text>
              )}
            </g>
          );
        })}

        {/* Center Donut Ring Summary */}
        {isDonut && (
          <g>
            <text
              x={centerX}
              y={centerY - 10}
              textAnchor="middle"
              className="text-[11px] fill-zinc-400 font-medium"
            >
              Grand Total
            </text>
            <text
              x={centerX}
              y={centerY + 12}
              textAnchor="middle"
              className="text-sm sm:text-base fill-white font-bold font-mono"
            >
              {chartData.grandTotalFormatted}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderCurrentChart = () => {
    switch (chartType) {
      case 'vertical_bar':
        return renderVerticalBarChart();
      case 'horizontal_bar':
        return renderHorizontalBarChart();
      case 'stacked_bar':
        return renderStackedBarChart();
      case 'grouped_bar':
        return renderGroupedBarChart();
      case 'line':
        return renderLineOrAreaChart(false);
      case 'multi_line':
        return renderMultiSeriesLineChart();
      case 'area':
        return renderLineOrAreaChart(true);
      case 'pie':
        return renderPieOrDonutChart(false);
      case 'donut':
        return renderPieOrDonutChart(true);
      default:
        return renderVerticalBarChart();
    }
  };

  return (
    <div className="pivot-chart-root flex-1 flex flex-col bg-[#161618] text-white p-3 sm:p-5 overflow-y-auto">
      {/* 1. Header Toolbar: Chart Types Pills, Metric Options, and Column-wise Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        
        {/* Left: Chart Type Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <div className="flex items-center p-1 bg-[#1c1c1e] border border-white/10 rounded-xl gap-1">
            {/* Bar Charts */}
            <button
              type="button"
              onClick={() => setChartType('vertical_bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'vertical_bar' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Column Chart (Vertical Bars)"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Column</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('horizontal_bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'horizontal_bar' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Horizontal Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5 rotate-90" />
              <span>Bar</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('stacked_bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'stacked_bar' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Stacked Bar Chart"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stacked</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('grouped_bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'grouped_bar' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Grouped Multi-Series Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grouped</span>
            </button>
          </div>

          {/* Line Charts */}
          <div className="flex items-center p-1 bg-[#1c1c1e] border border-white/10 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'line' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Smooth Line Chart"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'area' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Filled Area Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('multi_line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'multi_line' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Multi-Line Comparison Chart"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Multi-Line</span>
            </button>
          </div>

          {/* Pie & Donut Charts */}
          <div className="flex items-center p-1 bg-[#1c1c1e] border border-white/10 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setChartType('pie')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'pie' ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Standard Pie Chart"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Pie</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'donut' ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Donut Chart with Center Total"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Donut</span>
            </button>
          </div>
        </div>

        {/* Right: Column-Wise & Category Filter, Metric Selector & Visual Controls */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Column-Wise and Category Filters Dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!isFilterDropdownOpen) {
                  updateDropdownAlignment();
                }
                setIsFilterDropdownOpen(!isFilterDropdownOpen);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 shadow-xs ${
                selectedRowKeys.size < pivotResult.rowKeys.length || (hasColDimension && selectedColKeys.size < pivotResult.colKeys.length)
                  ? 'bg-blue-600/25 border-blue-500/50 text-blue-300'
                  : 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-zinc-200 border-white/10'
              }`}
              title="Filter categories and column series shown in chart"
            >
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Chart Filters ({selectedRowKeys.size}/{pivotResult.rowKeys.length})
              </span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Popover Menu */}
            {isFilterDropdownOpen && (
              <div className={`absolute ${dropdownAlign === 'left' ? 'left-0' : 'right-0'} mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-[#1c1c1e] border border-white/15 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95`}>
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Filter Chart Data</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      selectAllRows();
                      selectAllCols();
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
                  >
                    Reset All
                  </button>
                </div>

                {/* Sub-tabs if Column Dimension is present */}
                {hasColDimension && (
                  <div className="flex items-center gap-1 p-0.5 bg-[#2c2c2e] rounded-lg my-2 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setFilterTab('rows')}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                        filterTab === 'rows' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {rowDimensionName} ({selectedRowKeys.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('cols')}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                        filterTab === 'cols' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {colDimensionName} ({selectedColKeys.size})
                    </button>
                  </div>
                )}

                {/* Search Bar inside popover */}
                <div className="relative my-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                    className="w-full bg-[#242426] text-xs text-white pl-8 pr-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 placeholder:text-zinc-500"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center justify-between pb-2 text-[11px] text-zinc-400">
                  <span>Toggle items to show/hide:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={filterTab === 'rows' ? selectAllRows : selectAllCols}
                      className="hover:text-blue-400 cursor-pointer font-medium"
                    >
                      All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={filterTab === 'rows' ? deselectAllRows : deselectAllCols}
                      className="hover:text-blue-400 cursor-pointer font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
                  {(filterTab === 'rows' ? filteredRowKeysForPopover : filteredColKeysForPopover).map((key, idx) => {
                    const isSelected = filterTab === 'rows' ? selectedRowKeys.has(key) : selectedColKeys.has(key);
                    const color = CHART_COLORS[idx % CHART_COLORS.length];

                    return (
                      <div
                        key={key}
                        onClick={() => filterTab === 'rows' ? toggleRowKey(key) : toggleColKey(key)}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                          isSelected ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                          )}
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{key || '(Blank)'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Metric Selector if multiple values configured */}
          {activeValueConfigs.length > 1 && (
            <select
              value={selectedValIdx}
              onChange={(e) => setSelectedValIdx(Number(e.target.value))}
              className="bg-[#2c2c2e] text-xs font-medium border border-white/10 text-white px-2.5 py-1.5 rounded-xl cursor-pointer"
            >
              {activeValueConfigs.map((vc, idx) => {
                const c = columns.find((col) => col.id === vc.id);
                return (
                  <option key={idx} value={idx}>
                    {vc.summarizeBy} of {c?.name || vc.id}
                  </option>
                );
              })}
            </select>
          )}

          {/* Toggle Data Labels */}
          <button
            type="button"
            onClick={() => setShowDataLabels(!showDataLabels)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              showDataLabels
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-[#2c2c2e] text-zinc-400 border-white/10'
            }`}
            title="Toggle Value Labels on Chart"
          >
            {showDataLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Values</span>
          </button>

          {/* Bar Chart Value Placement (Inside vs Outside) */}
          {showDataLabels && isBarChart && (
            <div className="flex items-center p-0.5 bg-[#242426] border border-white/10 rounded-xl text-xs">
              <span className="text-[10px] text-zinc-400 px-1.5 font-medium hidden sm:inline">Position:</span>
              <button
                type="button"
                onClick={() => setBarLabelPosition('outside')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  barLabelPosition === 'outside'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Display values outside the bars"
              >
                Outside
              </button>
              <button
                type="button"
                onClick={() => setBarLabelPosition('inside')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  barLabelPosition === 'inside'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Display values inside the bars"
              >
                Inside
              </button>
            </div>
          )}

          {/* Export SVG */}
          <button
            type="button"
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#2c2c2e] hover:bg-[#3a3a3c] text-zinc-200 border border-white/10 transition-all cursor-pointer active:scale-95"
            title="Download Vector SVG Chart"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {kpiStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3">
          <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-zinc-400 block font-medium">Grand Total</span>
            <span className="text-sm sm:text-base font-bold text-white font-mono mt-0.5 block truncate">
              {kpiStats.total}
            </span>
          </div>

          <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[10px] text-emerald-400 font-medium">
              <span>Top Performer</span>
              <Award className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white mt-0.5 block truncate">
              {kpiStats.maxLabel}: {kpiStats.maxVal} ({kpiStats.maxPct}%)
            </span>
          </div>

          <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-zinc-400 block font-medium">Average / Category</span>
            <span className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 block truncate">
              {kpiStats.avg}
            </span>
          </div>

          <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-zinc-400 block font-medium">Categories Plotted</span>
            <span className="text-xs sm:text-sm font-bold text-blue-400 font-mono mt-0.5 block truncate">
              {kpiStats.count} {rowDimensionName}s
            </span>
          </div>
        </div>
      )}

      {/* 3. Main Chart Canvas Area */}
      <div className="flex-1 bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col justify-between min-h-[380px] relative overflow-hidden">
        {/* Chart Title & Subtitle */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>{valLabel}</span>
              <span className="text-zinc-500 font-normal">by</span>
              <span className="text-blue-400">{rowDimensionName}</span>
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Interactive vector visualization for {pivotName}
            </p>
          </div>

          {/* Hover tooltip readout */}
          {hoveredIndex?.itemIdx !== undefined && chartData.items[hoveredIndex.itemIdx] && (
            <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/40 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <span className="font-bold text-white">
                {chartData.items[hoveredIndex.itemIdx].label}
              </span>
              <span className="text-blue-300 font-mono font-semibold">
                {chartData.items[hoveredIndex.itemIdx].formattedTotal}
              </span>
              <span className="text-[10px] text-zinc-400">
                ({((chartData.items[hoveredIndex.itemIdx].totalRaw / chartData.grandTotal) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {/* SVG Drawing Canvas */}
        <div className="flex-1 flex items-center justify-center w-full overflow-x-auto py-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full max-w-[840px] h-auto max-h-[440px] select-none"
          >
            {renderCurrentChart()}
          </svg>
        </div>

        {/* 4. Chart Legend with Clickable Toggles */}
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-2.5 max-h-24 overflow-y-auto">
          {hasColDimension && (chartType === 'grouped_bar' || chartType === 'stacked_bar' || chartType === 'multi_line') ? (
            chartData.activeColKeys.map((cKey, cIdx) => {
              const isHidden = hiddenSeries.has(cIdx);
              const color = CHART_COLORS[cIdx % CHART_COLORS.length];
              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => toggleSeries(cIdx)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs transition-all cursor-pointer border ${
                    isHidden
                      ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500 line-through'
                      : 'bg-[#28282c] border-white/10 text-zinc-200 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate max-w-[120px]">{cKey}</span>
                </button>
              );
            })
          ) : (
            chartData.items.map((item, idx) => (
              <div 
                key={item.id} 
                className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                onMouseEnter={() => setHoveredIndex({ itemIdx: idx })}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[100px]">{item.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
