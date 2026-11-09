import React, { useState } from 'react';
import { Register, ColumnDef, RowData } from '../types/register';
import { Language, translations } from '../utils/translations';
import { getRowCellValue, parseNumeric } from '../utils/calculations';
import { 
  BarChart3, 
  TrendingUp, 
  Hash, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Layers,
  PieChart,
  ShieldCheck,
  ListFilter
} from 'lucide-react';
import { PivotSummaryListModal } from './PivotSummaryListModal';

interface ExecutiveSummaryBannerProps {
  register: Register;
  filteredRows: RowData[];
  lang: Language;
  onOpenFullSummary: () => void;
  onOpenHealthInspector: () => void;
}

export const ExecutiveSummaryBanner: React.FC<ExecutiveSummaryBannerProps> = ({
  register,
  filteredRows,
  lang,
  onOpenFullSummary,
  onOpenHealthInspector,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [summaryListModal, setSummaryListModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    summaryValueDisplay?: string;
    summaryMethod?: string;
    rows: RowData[];
  } | null>(null);

  const t = translations[lang];

  const totalCount = register.rows.length;
  const activeCount = filteredRows.length;

  // Identify numeric, currency, and formula columns
  const numericCols = register.columns.filter(
    (c) => c.type === 'number' || c.type === 'currency' || c.type === 'formula'
  );

  // Compute column sums & averages for the active view
  const columnStats = numericCols.map((col) => {
    let sum = 0;
    let validCount = 0;
    let min = Infinity;
    let max = -Infinity;

    filteredRows.forEach((row) => {
      const raw = getRowCellValue(row, col, register.columns);
      const num = parseNumeric(raw);
      if (raw !== null && raw !== undefined && raw !== '') {
        sum += num;
        validCount += 1;
        if (num < min) min = num;
        if (num > max) max = num;
      }
    });

    const avg = validCount > 0 ? sum / validCount : 0;

    return {
      col,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 10) / 10,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      validCount,
    };
  });

  // Calculate categorical distribution for select or multiple_choice columns
  const categoryCol = register.columns.find(
    (c) => c.type === 'select' || c.type === 'multiple_choice'
  );
  
  const categoryCounts: Record<string, number> = {};
  if (categoryCol) {
    filteredRows.forEach((r) => {
      const val = r[categoryCol.id];
      if (val) {
        categoryCounts[val] = (categoryCounts[val] || 0) + 1;
      }
    });
  }

  // Quick Data Health Check (missing required cells or duplicates)
  const requiredCols = register.columns.filter((c) => c.required && c.type !== 'formula');
  let missingCount = 0;
  filteredRows.forEach((row) => {
    requiredCols.forEach((col) => {
      const val = row[col.id];
      if (val === undefined || val === null || val === '') {
        missingCount += 1;
      }
    });
  });

  return (
    <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-lg overflow-hidden transition-all duration-200">
      {/* Banner Header Bar */}
      <div className="px-3 sm:px-4 py-2 bg-[#222226] border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-white truncate">
              KPI Summary
            </span>
            {/* Pulsing live dot on mobile, full badge on tablet/desktop */}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse sm:hidden shrink-0" title="Live Real-Time" />
            <span className="hidden sm:inline-flex text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-medium whitespace-nowrap shrink-0">
              Live Real-Time
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Health Inspector Quick Trigger */}
          <button
            onClick={onOpenHealthInspector}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
              missingCount === 0
                ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            }`}
            title={missingCount === 0 ? '100% Clean Data' : `${missingCount} Data Anomalies`}
          >
            {missingCount === 0 ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Clean</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[10px]">{missingCount}</span>
                <span className="hidden md:inline">Alert{missingCount > 1 ? 's' : ''}</span>
              </>
            )}
          </button>

          {/* Full Analytics Dialog Trigger */}
          <button
            onClick={onOpenFullSummary}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-blue-600/80 hover:bg-blue-600 active:scale-95 rounded-lg transition-all cursor-pointer"
            title="Open Deep Analytics Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Analytics</span>
          </button>

          {/* Expand / Collapse Button */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse summary' : 'Expand summary'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-3.5 animate-in fade-in duration-150">
          
          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Total Active Entries Card */}
            <div className="bg-[#161618] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Records</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-white font-mono">{activeCount}</span>
                {activeCount !== totalCount && (
                  <span className="text-[10px] text-amber-400 font-mono">of {totalCount}</span>
                )}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500 truncate">
                {register.columns.length} columns active
              </div>
            </div>

            {/* Render First 4 Numeric/Formula Metric Cards */}
            {columnStats.slice(0, 4).map(({ col, sum, avg, max }) => {
              const isCurrency = col.type === 'currency' || col.unit === '₹' || col.unit === '$';
              return (
                <div key={col.id} className="bg-[#161618] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate" title={col.name}>
                      {col.name}
                    </span>
                    {col.type === 'formula' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                        fx
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 truncate">
                      {col.unit ? `${col.unit} ` : ''}
                      {sum.toLocaleString()}
                    </div>
                    {/* Pivot Table Summary List Button beside summary value like in Excel */}
                    <button
                      type="button"
                      onClick={() => setSummaryListModal({
                        isOpen: true,
                        title: `${col.name} Summary List`,
                        subtitle: `${filteredRows.length} records contributing to total ${col.unit ? `${col.unit} ` : ''}${sum.toLocaleString()}`,
                        summaryValueDisplay: `${col.unit ? `${col.unit} ` : ''}${sum.toLocaleString()}`,
                        summaryMethod: 'SUM',
                        rows: filteredRows,
                      })}
                      className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0"
                      title="Excel Summary List · View underlying records"
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Avg: {avg.toLocaleString()}</span>
                    <span>Max: {max.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Categorical Distribution Chips (if categorical column exists) */}
          {categoryCol && Object.keys(categoryCounts).length > 0 && (
            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mr-1">
                <PieChart className="w-3.5 h-3.5 text-blue-400" />
                <span>{categoryCol.name}:</span>
              </span>
              {Object.entries(categoryCounts).map(([catName, count]) => {
                const pct = activeCount > 0 ? Math.round((count / activeCount) * 100) : 0;
                return (
                  <div
                    key={catName}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-200 text-[11px]"
                  >
                    <span className="font-semibold">{catName}</span>
                    <span className="font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Drilldown Summary List Modal */}
      {summaryListModal && summaryListModal.isOpen && (
        <PivotSummaryListModal
          title={summaryListModal.title}
          subtitle={summaryListModal.subtitle}
          summaryValueDisplay={summaryListModal.summaryValueDisplay}
          summaryMethod={summaryListModal.summaryMethod}
          rows={summaryListModal.rows}
          columns={register.columns}
          onClose={() => setSummaryListModal(null)}
        />
      )}
    </div>
  );
};
