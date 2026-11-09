import React, { useMemo } from 'react';
import { Register, RowData, ColumnDef } from '../types/register';
import { Language, translations } from '../utils/translations';
import { getRowCellValue, parseNumeric } from '../utils/calculations';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  FileEdit,
  Sparkles,
  Search
} from 'lucide-react';

interface AnomalyIssue {
  type: 'missing_required' | 'duplicate_id' | 'numeric_outlier';
  severity: 'high' | 'medium' | 'low';
  rowIndex: number;
  columnId: string;
  columnName: string;
  message: string;
  currentValue?: any;
}

interface DataHealthModalProps {
  register: Register;
  onEditRow: (row: RowData, rowIndex: number) => void;
  onClose: () => void;
  lang: Language;
}

export const DataHealthModal: React.FC<DataHealthModalProps> = ({
  register,
  onEditRow,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  // Scan dataset for all anomalies
  const anomalies = useMemo(() => {
    const issues: AnomalyIssue[] = [];
    const rows = register.rows;
    const columns = register.columns;

    // 1. Check Missing Required Fields
    const requiredCols = columns.filter((c) => c.required && c.type !== 'formula');
    rows.forEach((row, rowIndex) => {
      requiredCols.forEach((col) => {
        const val = row[col.id];
        if (val === undefined || val === null || val === '') {
          issues.push({
            type: 'missing_required',
            severity: 'high',
            rowIndex,
            columnId: col.id,
            columnName: col.name,
            message: `Required field "${col.name}" is blank or missing.`,
          });
        }
      });
    });

    // 2. Check Duplicate Values in ID/Roll/Email columns
    const idCols = columns.filter(
      (c) =>
        c.type === 'text' &&
        (c.name.toLowerCase().includes('id') ||
          c.name.toLowerCase().includes('roll') ||
          c.name.toLowerCase().includes('email') ||
          c.name.toLowerCase().includes('code'))
    );

    idCols.forEach((col) => {
      const seen = new Map<string, number>();
      rows.forEach((row, rowIndex) => {
        const raw = row[col.id];
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
          const key = String(raw).trim().toLowerCase();
          if (seen.has(key)) {
            const firstRowIndex = seen.get(key)!;
            issues.push({
              type: 'duplicate_id',
              severity: 'high',
              rowIndex,
              columnId: col.id,
              columnName: col.name,
              message: `Duplicate "${raw}" found (also present in row #${firstRowIndex + 1}).`,
              currentValue: raw,
            });
          } else {
            seen.set(key, rowIndex);
          }
        }
      });
    });

    // 3. Check for Numeric Negative / Extreme values
    const numericCols = columns.filter((c) => c.type === 'number' || c.type === 'currency');
    numericCols.forEach((col) => {
      rows.forEach((row, rowIndex) => {
        const num = parseNumeric(row[col.id]);
        if (num < 0) {
          issues.push({
            type: 'numeric_outlier',
            severity: 'medium',
            rowIndex,
            columnId: col.id,
            columnName: col.name,
            message: `Negative value (${num}) detected in "${col.name}".`,
            currentValue: num,
          });
        }
      });
    });

    return issues;
  }, [register]);

  const totalCells = register.rows.length * register.columns.length;
  const healthScore = totalCells > 0 ? Math.max(0, Math.round(((totalCells - anomalies.length) / totalCells) * 100)) : 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              healthScore >= 90 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Data Health & Quality Inspector</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  healthScore >= 90 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {healthScore}% Score
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Automatic audit of missing required fields, duplicates, and outliers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Health Score Summary Banner */}
        <div className="px-5 py-3.5 bg-[#222226] border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-300">{register.rows.length} total rows scanned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${anomalies.length === 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-zinc-300">{anomalies.length} issue(s) detected</span>
            </div>
          </div>

          <span className="text-[11px] text-zinc-400 font-mono">
            Audit status: Complete
          </span>
        </div>

        {/* Issues List */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {anomalies.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Your Data is 100% Clean!</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No missing required fields, no duplicate identifiers, and no negative outliers were detected.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {anomalies.map((issue, idx) => (
                <div
                  key={idx}
                  className="bg-[#161618] border border-white/5 hover:border-white/15 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">
                          Row #{issue.rowIndex + 1}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-medium">
                          {issue.columnName}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{issue.message}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onEditRow(register.rows[issue.rowIndex], issue.rowIndex);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-xl transition-all shrink-0 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Fix Row</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#161618] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/10 rounded-xl"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
