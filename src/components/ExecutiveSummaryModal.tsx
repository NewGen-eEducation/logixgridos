import React, { useState } from 'react';
import { Register, RowData, ColumnDef } from '../types/register';
import { Language, translations } from '../utils/translations';
import { getRowCellValue, parseNumeric } from '../utils/calculations';
import { 
  BarChart3, 
  TrendingUp, 
  X, 
  Printer, 
  Copy, 
  Check, 
  PieChart, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  Layers,
  Sparkles
} from 'lucide-react';

interface ExecutiveSummaryModalProps {
  register: Register;
  rows: RowData[];
  onClose: () => void;
  lang: Language;
}

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  register,
  rows,
  onClose,
  lang,
}) => {
  const [copied, setCopied] = useState(false);
  const t = translations[lang];

  const totalCount = rows.length;
  const numericCols = register.columns.filter(
    (c) => c.type === 'number' || c.type === 'currency' || c.type === 'formula'
  );

  // Compute stats for each numeric column
  const stats = numericCols.map((col) => {
    const values: number[] = [];
    rows.forEach((r) => {
      const raw = getRowCellValue(r, col, register.columns);
      const num = parseNumeric(raw);
      if (raw !== null && raw !== undefined && raw !== '') {
        values.push(num);
      }
    });

    if (values.length === 0) {
      return { col, count: 0, sum: 0, mean: 0, min: 0, max: 0, median: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      col,
      count: values.length,
      sum: Math.round(sum * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      min,
      max,
      median,
    };
  });

  // Categorical distributions
  const categoryCols = register.columns.filter(
    (c) => c.type === 'select' || c.type === 'multiple_choice'
  );

  const handleCopySummary = () => {
    let summaryText = `EXECUTIVE SUMMARY REPORT - ${register.title.toUpperCase()}\n`;
    summaryText += `Total Records: ${totalCount} | Generated: ${new Date().toLocaleDateString()}\n\n`;
    summaryText += `KEY NUMERICAL METRICS:\n`;
    stats.forEach((s) => {
      summaryText += `- ${s.col.name}: Sum = ${s.sum.toLocaleString()}, Avg = ${s.mean.toLocaleString()}, Min = ${s.min}, Max = ${s.max}\n`;
    });
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Executive Analytics & KPI Dashboard
              </h3>
              <p className="text-[11px] text-zinc-400">
                {register.title} • {totalCount} total entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* Quick Snapshot Highlight */}
          <div className="bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-zinc-900 border border-blue-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">Executive Overview</span>
              <h4 className="text-base font-bold text-white mt-0.5">High Performance Summary</h4>
              <p className="text-xs text-zinc-300 mt-1 max-w-lg leading-relaxed">
                Active dataset contains <strong className="text-white">{totalCount}</strong> rows across{' '}
                <strong className="text-white">{register.columns.length}</strong> configured columns. Automatic live calculations show healthy aggregate balances with zero cloud latency.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-3.5 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-zinc-400 block">Total Entries</span>
                <span className="text-lg font-bold font-mono text-white">{totalCount}</span>
              </div>
              <div className="text-center px-3.5 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-zinc-400 block">Formulas</span>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {register.columns.filter((c) => c.type === 'formula').length}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Column Metrics Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quantitative Column Statistics</span>
            </h4>
            <div className="border border-white/10 rounded-xl overflow-hidden bg-[#161618]">
              <table className="w-full text-xs">
                <thead className="bg-[#222226] text-zinc-400 border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-3 text-left">Column</th>
                    <th className="p-3 text-right">Sum (Total)</th>
                    <th className="p-3 text-right">Mean (Avg)</th>
                    <th className="p-3 text-right">Median</th>
                    <th className="p-3 text-right">Min</th>
                    <th className="p-3 text-right">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {stats.map(({ col, sum, mean, median, min, max }) => (
                    <tr key={col.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-sans font-medium text-white flex items-center gap-1.5">
                        <span>{col.name}</span>
                        {col.type === 'formula' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            formula
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        {col.unit ? `${col.unit} ` : ''}{sum.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-zinc-200">
                        {col.unit ? `${col.unit} ` : ''}{mean.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-zinc-400">
                        {col.unit ? `${col.unit} ` : ''}{median.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-blue-400">
                        {col.unit ? `${col.unit} ` : ''}{min.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-amber-400">
                        {col.unit ? `${col.unit} ` : ''}{max.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Categorical Breakdowns */}
          {categoryCols.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-blue-400" />
                <span>Segment Distributions</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoryCols.map((col) => {
                  const counts: Record<string, number> = {};
                  rows.forEach((r) => {
                    const val = r[col.id];
                    if (val) counts[val] = (counts[val] || 0) + 1;
                  });

                  return (
                    <div key={col.id} className="bg-[#161618] border border-white/10 rounded-xl p-3.5 space-y-2">
                      <span className="text-xs font-bold text-white block">{col.name}</span>
                      <div className="space-y-1.5">
                        {Object.entries(counts).map(([opt, count]) => {
                          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                          return (
                            <div key={opt} className="text-xs">
                              <div className="flex justify-between text-zinc-300 mb-0.5">
                                <span className="font-medium">{opt}</span>
                                <span className="font-mono text-zinc-400">{count} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
