import React, { useState } from 'react';
import { ColumnDef, ColumnType, Register, RowData } from '../types/register';
import { Language, translations } from '../utils/translations';
import { parseExcelFile, parseAllExcelSheets, ParsedSpreadsheet } from '../utils/excelImport';
import { 
  FileSpreadsheet, 
  Upload, 
  Check, 
  AlertCircle, 
  Layers, 
  Table2, 
  Plus, 
  Sparkles,
  FileType,
  ArrowRight
} from 'lucide-react';

interface ExcelImportModalProps {
  currentRegisterTitle: string;
  onOpenAsNewRegister: (newRegister: Register) => void;
  onOpenMultipleRegisters?: (newRegisters: Register[]) => void;
  onAppendToCurrent: (newColumns: ColumnDef[], rows: RowData[]) => void;
  onClose: () => void;
  lang: Language;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  currentRegisterTitle,
  onOpenAsNewRegister,
  onOpenMultipleRegisters,
  onAppendToCurrent,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Parsed spreadsheet result
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);

  // User import mode: 'new_register' (like File -> Open in Excel/Sheets) or 'append'
  const [importMode, setImportMode] = useState<'new_register' | 'append'>('new_register');

  // Configurable register title
  const [customTitle, setCustomTitle] = useState('');

  // Editable columns
  const [editableColumns, setEditableColumns] = useState<ColumnDef[]>([]);

  // Handle file processing
  const handleProcessFile = async (file: File, sheetName?: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await parseExcelFile(file, sheetName);
      setParsedData(result);
      setRawFile(file);
      setCustomTitle(result.fileName);
      setEditableColumns(result.columns);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read spreadsheet file. Please check format.');
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleSheetSwitch = (sheetName: string) => {
    if (rawFile) {
      handleProcessFile(rawFile, sheetName);
    }
  };

  const handleColumnTypeChange = (idx: number, newType: ColumnType) => {
    const updated = [...editableColumns];
    updated[idx] = { ...updated[idx], type: newType };
    setEditableColumns(updated);
  };

  const handleColumnNameChange = (idx: number, newName: string) => {
    const updated = [...editableColumns];
    updated[idx] = { ...updated[idx], name: newName };
    setEditableColumns(updated);
  };

  // Execute import of selected sheet
  const handleConfirmImport = () => {
    if (!parsedData) return;

    if (importMode === 'new_register') {
      const sheetSuffix = parsedData.sheetNames.length > 1 ? ` - ${parsedData.activeSheetName}` : '';
      const finalTitle = customTitle.trim() || `${parsedData.fileName}${sheetSuffix}`;
      const newRegister: Register = {
        id: `reg-${Date.now()}`,
        title: finalTitle,
        description: `Imported from ${rawFile?.name || 'spreadsheet file'} (Sheet: ${parsedData.activeSheetName}) with ${parsedData.rows.length} records.`,
        category: 'custom',
        columns: editableColumns,
        rows: parsedData.rows,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        themeColor: '#0f9d58', // Google Sheets emerald green
        sourceFileName: rawFile?.name || `${parsedData.fileName}.xlsx`,
        sheetName: parsedData.activeSheetName,
        isExcelUpload: true,
      };
      onOpenAsNewRegister(newRegister);
    } else {
      onAppendToCurrent(editableColumns, parsedData.rows);
    }

    onClose();
  };

  // Import all sheets in workbook as distinct registers
  const handleImportAllSheets = async () => {
    if (!rawFile) return;
    setIsLoading(true);
    try {
      const allSheets = await parseAllExcelSheets(rawFile);
      const newRegisters: Register[] = allSheets.map((sheet, idx) => ({
        id: `reg-excel-${Date.now()}-${idx}`,
        title: `${sheet.fileName} - ${sheet.activeSheetName}`,
        description: `Imported from ${rawFile.name} (Sheet: ${sheet.activeSheetName}) with ${sheet.rows.length} records.`,
        category: 'custom',
        columns: sheet.columns,
        rows: sheet.rows,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        themeColor: '#0f9d58',
        sourceFileName: rawFile.name,
        sheetName: sheet.activeSheetName,
        isExcelUpload: true,
      }));

      if (onOpenMultipleRegisters) {
        onOpenMultipleRegisters(newRegisters);
      } else {
        newRegisters.forEach((reg) => onOpenAsNewRegister(reg));
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import all sheets');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl shadow-2xl max-w-3xl w-full border border-white/15 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Import Spreadsheet
              </h3>
              <p className="text-[11px] text-zinc-400">
                Excel (.xlsx, .xls) and Google Sheets (.csv)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-semibold p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Upload Area */}
          {!parsedData ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer relative ${
                  isDragging
                    ? 'border-[#30d158] bg-[#30d158]/10 scale-[1.01]'
                    : 'border-white/15 hover:border-[#30d158]/60 bg-[#242426] hover:bg-[#2c2c2e]'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFileInput}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />

                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#30d158]/15 text-[#30d158] mx-auto flex items-center justify-center border border-[#30d158]/20">
                    <Upload className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Drop spreadsheet file here
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Supports Excel (<span className="font-mono text-zinc-300">.xlsx, .xls</span>) and Sheets CSV (<span className="font-mono text-zinc-300">.csv</span>)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#30d158] hover:bg-[#28b84d] rounded-xl shadow-md pointer-events-none"
                  >
                    Browse Files
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="p-4 bg-[#242426] border border-white/10 rounded-xl text-center text-xs text-zinc-300 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#30d158] border-t-transparent rounded-full animate-spin" />
                  <span>Parsing spreadsheet & auto-detecting columns...</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-[#ff453a]/15 border border-[#ff453a]/30 text-[#ff453a] text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 stroke-[2]" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* File Analyzed & Pre-Import Options */
            <div className="space-y-4">
              {/* File Summary Banner */}
              <div className="p-3 bg-[#30d158]/10 border border-[#30d158]/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-[#30d158] shrink-0 stroke-[2.2]" />
                  <div>
                    <span className="font-semibold text-white text-sm">
                      {rawFile?.name}
                    </span>
                    <div className="text-[11px] text-[#30d158] font-mono mt-0.5">
                      {parsedData.totalRowCount} records · {editableColumns.length} dynamic columns
                    </div>
                  </div>
                </div>

                {/* Change file button */}
                <button
                  type="button"
                  onClick={() => {
                    setParsedData(null);
                    setRawFile(null);
                  }}
                  className="px-2.5 py-1 bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 text-zinc-300 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Multi-Sheet Selector (if Excel file has multiple sheets) */}
              {parsedData.sheetNames.length > 1 && (
                <div className="flex items-center gap-2 text-xs bg-[#242426] p-2.5 rounded-xl border border-white/10">
                  <span className="font-semibold text-zinc-300">Sheet:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {parsedData.sheetNames.map((sheet) => (
                      <button
                        key={sheet}
                        type="button"
                        onClick={() => handleSheetSwitch(sheet)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          parsedData.activeSheetName === sheet
                            ? 'bg-[#30d158] text-black border-[#30d158] font-bold'
                            : 'bg-[#2c2c2e] text-zinc-300 border-white/10 hover:bg-[#3a3a3c]'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Mode Chooser */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Import Destination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Mode 1: New Register */}
                  <label
                    onClick={() => setImportMode('new_register')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importMode === 'new_register'
                        ? 'border-[#30d158] bg-[#30d158]/10'
                        : 'border-white/10 hover:border-white/20 bg-[#242426]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'new_register'}
                      onChange={() => setImportMode('new_register')}
                      className="mt-0.5 accent-[#30d158]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-[#30d158] stroke-[2.2]" />
                        <span>New Register & Form</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                        Creates a new register with detected columns & analytics.
                      </p>
                    </div>
                  </label>

                  {/* Mode 2: Append to Current */}
                  <label
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importMode === 'append'
                        ? 'border-[#30d158] bg-[#30d158]/10'
                        : 'border-white/10 hover:border-white/20 bg-[#242426]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 accent-[#30d158]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-[#30d158] stroke-[2.2]" />
                        <span>Append to Current</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                        Appends data to "{currentRegisterTitle}".
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Title input when opening as new */}
              {importMode === 'new_register' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Register Title
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter sheet title"
                    className="w-full text-xs font-medium px-3 py-2 bg-[#242426] border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#30d158] focus:border-[#30d158]"
                  />
                </div>
              )}

              {/* Dynamic Columns Configuration & Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Columns ({editableColumns.length})</span>
                  </span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    Auto-detected
                  </span>
                </div>

                <div className="border border-white/10 rounded-xl max-h-48 overflow-y-auto divide-y divide-white/5 text-xs bg-[#242426]">
                  {editableColumns.map((col, idx) => (
                    <div key={col.id} className="p-2.5 flex items-center justify-between gap-3 bg-[#1c1c1e]">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono text-[10px] text-zinc-500 w-5">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => handleColumnNameChange(idx, e.target.value)}
                          className="font-semibold text-white border-b border-transparent hover:border-white/20 focus:border-emerald-500 focus:outline-none px-1 py-0.5 text-xs flex-1 bg-transparent"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={col.type}
                          onChange={(e) => handleColumnTypeChange(idx, e.target.value as ColumnType)}
                          className="text-[11px] font-medium bg-[#2c2c2e] text-white border border-white/10 rounded-lg px-2 py-1 cursor-pointer"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency (₹)</option>
                          <option value="date">Date</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Checkbox (Yes/No)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Sample Preview (First 4 rows) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Sample Preview (First {Math.min(4, parsedData.rows.length)} of {parsedData.rows.length} rows)
                </span>
                <div className="border border-white/10 rounded-xl overflow-x-auto text-xs bg-[#161618] max-h-36">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#242426] text-[10px] uppercase font-bold text-zinc-400 sticky top-0">
                      <tr>
                        <th className="py-1 px-2 border-r border-white/10 w-8 text-center">#</th>
                        {editableColumns.slice(0, 6).map((c) => (
                          <th key={c.id} className="py-1 px-2 border-r border-white/10 whitespace-nowrap">
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px] text-zinc-300">
                      {parsedData.rows.slice(0, 4).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/[0.04]">
                          <td className="py-1 px-2 text-center text-zinc-500 border-r border-white/10">
                            {rIdx + 1}
                          </td>
                          {editableColumns.slice(0, 6).map((c) => (
                            <td key={c.id} className="py-1 px-2 text-zinc-200 truncate max-w-[140px] border-r border-white/10">
                              {String(row[c.id] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#161618] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          {parsedData && parsedData.sheetNames.length > 1 && importMode === 'new_register' && (
            <button
              type="button"
              onClick={handleImportAllSheets}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              title="Import all sheets from this workbook"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Import All {parsedData.sheetNames.length} Sheets</span>
            </button>
          )}
          {parsedData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {importMode === 'new_register'
                  ? `Import (${parsedData.rows.length})`
                  : `Append (${parsedData.rows.length})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
