import React, { useState } from 'react';
import { ColumnDef, RowData } from '../types/register';
import { Language, translations } from '../utils/translations';
import { parseCSV, exportToCSV } from '../utils/calculations';
import { Upload, Download, FileText, Check, AlertCircle } from 'lucide-react';

interface ImportExportModalProps {
  columns: ColumnDef[];
  rows: RowData[];
  registerTitle: string;
  onImportRows: (newRows: RowData[]) => void;
  onClose: () => void;
  lang: Language;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  columns,
  rows,
  registerTitle,
  onImportRows,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'export'>('import');
  const [csvText, setCsvText] = useState('');
  const [previewRows, setPreviewRows] = useState<RowData[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle file select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parsePreview(content);
    };
    reader.readAsText(file);
  };

  // Parse CSV text and preview
  const parsePreview = (text: string) => {
    setErrorMsg('');
    try {
      const { headers, rows: parsed } = parseCSV(text);
      if (headers.length === 0 || parsed.length === 0) {
        setErrorMsg('No valid rows or headers found in CSV.');
        setPreviewRows([]);
        return;
      }

      // Map parsed keys to column ids
      const mappedRows: RowData[] = parsed.map((item) => {
        const rowObj: RowData = {};
        columns.forEach((col) => {
          // Check matching header by name or id
          const matchingKey = Object.keys(item).find(
            (k) => k.toLowerCase() === col.name.toLowerCase() || k.toLowerCase() === col.id.toLowerCase()
          );
          if (matchingKey && item[matchingKey] !== undefined) {
            rowObj[col.id] = item[matchingKey];
          } else {
            rowObj[col.id] = '';
          }
        });
        return rowObj;
      });

      setPreviewRows(mappedRows);
    } catch {
      setErrorMsg(t.invalidCsv);
      setPreviewRows([]);
    }
  };

  const handleConfirmImport = () => {
    if (previewRows.length === 0) return;
    onImportRows(previewRows);
    setSuccessMsg(t.successImport);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const backupData = {
      title: registerTitle,
      columns,
      rows,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${registerTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl shadow-2xl max-w-xl w-full border border-white/15 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-1.5 p-1 bg-[#2c2c2e] rounded-xl border border-white/10">
            <button
              onClick={() => setActiveSubTab('import')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'import' ? 'bg-[#0a84ff] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              CSV Import
            </button>
            <button
              onClick={() => setActiveSubTab('export')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'export' ? 'bg-[#0a84ff] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Export
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-semibold p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeSubTab === 'import' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Upload CSV File or Paste Text
                </label>
                <div className="border border-dashed border-white/20 hover:border-blue-400/60 rounded-2xl p-4 text-center cursor-pointer bg-[#242426] hover:bg-[#2c2c2e] transition-all relative">
                  <div className="w-9 h-9 mx-auto mb-2 rounded-xl bg-blue-500/15 flex items-center justify-center text-[#0a84ff]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-200 font-semibold">Select CSV file</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Supports UTF-8 CSV with column headers</p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Or Paste Raw CSV Data
                </label>
                <textarea
                  rows={3}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parsePreview(e.target.value);
                  }}
                  placeholder={`"Name","Section","Marks"\n"John Doe","A",85\n"Jane Smith","B",92`}
                  className="w-full font-mono text-xs p-3 bg-[#242426] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/15 text-red-300 text-xs rounded-xl flex items-center gap-2 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/15 text-emerald-300 text-xs rounded-xl flex items-center gap-2 border border-emerald-500/20">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Preview of rows to append */}
              {previewRows.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span>Parsed Records ({previewRows.length})</span>
                    <span className="text-emerald-400 font-mono text-[11px]">Ready</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-white/10 rounded-xl text-xs bg-[#242426]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#2c2c2e] text-[10px] text-zinc-400 uppercase font-semibold sticky top-0">
                        <tr>
                          {columns.slice(0, 4).map((c) => (
                            <th key={c.id} className="py-1.5 px-2.5 border-r border-white/10">
                              {c.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {previewRows.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            {columns.slice(0, 4).map((c) => (
                              <td key={c.id} className="py-1.5 px-2.5 text-zinc-300 truncate max-w-[120px]">
                                {r[c.id] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-[#242426] rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-[#0a84ff] flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">CSV Spreadsheet</h4>
                    <p className="text-[11px] text-zinc-400">For Excel & Google Sheets</p>
                  </div>
                </div>
                <button
                  onClick={() => exportToCSV({ columns, rows, title: registerTitle })}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="p-4 bg-[#242426] rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">JSON Backup</h4>
                    <p className="text-[11px] text-zinc-400">Full schema & records backup</p>
                  </div>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-zinc-200 bg-[#2c2c2e] border border-white/10 hover:bg-[#3a3a3c] active:scale-95 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#161618] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          {activeSubTab === 'import' && previewRows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Import ({previewRows.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
