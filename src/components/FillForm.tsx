import React, { useState } from 'react';
import { Register, RowData, DepartmentProfile } from '../types/register';
import { Language, translations } from '../utils/translations';
import { validateFormField, validateFormResponse } from '../utils/formValidation';
import { evaluateFormula } from '../utils/calculations';
import { RowSlipModal } from './RowSlipModal';
import { SignaturePadModal } from './SignaturePadModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  ArrowLeft, 
  Table2, 
  RotateCcw,
  Send,
  Sparkles,
  Sliders,
  Calculator,
  QrCode,
  PenTool,
  Printer,
  Camera,
  Hash
} from 'lucide-react';
import { ExportDropdown } from './ExportDropdown';
import { exportResponsesToExcelOrCSV } from '../utils/exportUtils';

interface FillFormProps {
  register: Register;
  onSubmitResponse: (row: RowData) => void;
  onNavigateToBuilder: () => void;
  onNavigateToTable: () => void;
  lang: Language;
  deptProfile?: DepartmentProfile;
}

export const FillForm: React.FC<FillFormProps> = ({
  register,
  onSubmitResponse,
  onNavigateToBuilder,
  onNavigateToTable,
  lang,
  deptProfile,
}) => {
  const t = translations[lang];
  const themeHex = register.themeColor || '#0a84ff';

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmittedRow, setLastSubmittedRow] = useState<RowData | null>(null);

  // Modals inside FillForm
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeSignatureColId, setActiveSignatureColId] = useState<string | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [activeBarcodeColId, setActiveBarcodeColId] = useState<string | null>(null);

  const inputColumns = register.columns.filter((c) => c.type !== 'formula');
  const formulaColumns = register.columns.filter((c) => c.type === 'formula');

  // Compute all formula columns in real time as respondent types
  const liveFormulas = formulaColumns.map((col) => {
    const computedVal = evaluateFormula(col.formula || '', formData, register.columns);
    return {
      col,
      value: computedVal,
    };
  });

  const handleChange = (columnId: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      [columnId]: val,
    }));

    if (touched[columnId]) {
      const col = register.columns.find((c) => c.id === columnId);
      if (col) {
        const res = validateFormField(val, col);
        setErrors((prev) => {
          const next = { ...prev };
          if (res.isValid) delete next[columnId];
          else next[columnId] = res.error || 'Invalid response';
          return next;
        });
      }
    }
  };

  const handleBlur = (columnId: string) => {
    setTouched((prev) => ({ ...prev, [columnId]: true }));
    const col = register.columns.find((c) => c.id === columnId);
    if (col) {
      const res = validateFormField(formData[columnId], col);
      setErrors((prev) => {
        const next = { ...prev };
        if (res.isValid) delete next[columnId];
        else next[columnId] = res.error || 'Invalid response';
        return next;
      });
    }
  };

  const handleCheckboxToggle = (columnId: string, option: string) => {
    const current: string[] = Array.isArray(formData[columnId]) ? formData[columnId] : [];
    const updated = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];

    handleChange(columnId, updated);
  };

  const handleClearForm = () => {
    setFormData({});
    setErrors({});
    setTouched({});
  };

  // Real-time duplicate detection warning
  const getDuplicateWarning = (columnId: string, val: any) => {
    if (!val || typeof val !== 'string' || val.trim().length < 2) return null;
    const col = register.columns.find((c) => c.id === columnId);
    if (!col) return null;

    // Check identifier-like columns
    const isIdCol =
      col.name.toLowerCase().includes('id') ||
      col.name.toLowerCase().includes('roll') ||
      col.name.toLowerCase().includes('email') ||
      col.name.toLowerCase().includes('code');

    if (!isIdCol) return null;

    const matchIndex = register.rows.findIndex((r) => {
      const existingVal = r[columnId];
      return (
        existingVal &&
        String(existingVal).trim().toLowerCase() === String(val).trim().toLowerCase()
      );
    });

    if (matchIndex >= 0) {
      return `Duplicate Warning: "${val}" is already recorded in row #${matchIndex + 1}!`;
    }
    return null;
  };

  // 1-Click Auto Sequence ID Generator
  const handleGenerateAutoId = (columnId: string) => {
    const col = register.columns.find((c) => c.id === columnId);
    let prefix = 'REG-';
    if (col?.name.toLowerCase().includes('roll')) prefix = '2026-CS-';
    else if (col?.name.toLowerCase().includes('inv')) prefix = 'INV-';
    else if (col?.name.toLowerCase().includes('stu')) prefix = 'STU-';

    const nextNum = register.rows.length + 1;
    const generated = `${prefix}${String(nextNum).padStart(3, '0')}`;
    handleChange(columnId, generated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {};
    inputColumns.forEach((c) => (allTouched[c.id] = true));
    setTouched(allTouched);

    const validation = validateFormResponse(formData, register.columns);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErrId = Object.keys(validation.errors)[0];
      const el = document.getElementById(`q_card_${firstErrId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const rowToSubmit: RowData = {
      ...formData,
      timestamp: new Date().toISOString().split('T')[0],
    };

    onSubmitResponse(rowToSubmit);
    setLastSubmittedRow(rowToSubmit);
    setIsSubmitted(true);
  };

  const handleResetForAnother = () => {
    setFormData({});
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
    setLastSubmittedRow(null);
  };

  // Signature Modal Handlers
  const handleOpenSignature = (columnId: string) => {
    setActiveSignatureColId(columnId);
    setShowSignatureModal(true);
  };

  const handleSaveSignature = (dataUrl: string) => {
    if (activeSignatureColId) {
      handleChange(activeSignatureColId, dataUrl);
    }
  };

  // Barcode Scanner Modal Handlers
  const handleOpenBarcodeScanner = (columnId: string) => {
    setActiveBarcodeColId(columnId);
    setShowBarcodeModal(true);
  };

  const handleBarcodeResult = (code: string) => {
    if (activeBarcodeColId) {
      handleChange(activeBarcodeColId, code);
      handleBlur(activeBarcodeColId);
    }
  };

  // Submitted Screen
  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl lg:max-w-3xl mx-auto py-6 px-3">
        <div className="bg-[#1c1c1e] text-white rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="h-2 w-full" style={{ backgroundColor: themeHex }} />
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  {(lang === 'te' && register.titleTe) ? register.titleTe : register.title}
                </h2>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">{t.responseRecordedTitle}</p>
              </div>
            </div>

            {/* Quick Record Preview */}
            {lastSubmittedRow && (
              <div className="bg-[#161618] border border-white/10 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-zinc-400 border-b border-white/5 pb-2">
                  <span className="font-semibold text-zinc-300">Submitted Record Summary</span>
                  <span className="font-mono text-[11px]">{lastSubmittedRow.timestamp}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  {register.columns.slice(0, 4).map((c) => (
                    <div key={c.id}>
                      <span className="text-zinc-500 block truncate">{c.name}:</span>
                      <span className="text-white font-medium truncate block">
                        {String(lastSubmittedRow[c.id] ?? 'N/A')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-white/10">
              <button
                onClick={handleResetForAnother}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20"
              >
                + New Response
              </button>

              {/* 1-Click Printable Slip / Receipt for submitted response */}
              {lastSubmittedRow && (
                <button
                  onClick={() => setShowSlipModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600 active:scale-95 border border-emerald-500/30 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip / Receipt</span>
                </button>
              )}

              <button
                onClick={onNavigateToTable}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>

              <ExportDropdown
                label="Excel / CSV"
                variant="emerald"
                title="Export all form responses to Excel or CSV"
                disabled={register.rows.length === 0}
                onExportXLSX={() => exportResponsesToExcelOrCSV({ register, format: 'xlsx' })}
                onExportCSV={() => exportResponsesToExcelOrCSV({ register, format: 'csv' })}
              />

              <button
                onClick={onNavigateToBuilder}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
              >
                Builder
              </button>
            </div>
          </div>
        </div>

        {/* Modal for Slip */}
        {showSlipModal && lastSubmittedRow && (
          <RowSlipModal
            register={register}
            row={lastSubmittedRow}
            rowIndex={register.rows.length - 1 >= 0 ? register.rows.length - 1 : 0}
            onClose={() => setShowSlipModal(false)}
            lang={lang}
            deptProfile={deptProfile}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-20 transition-all">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between text-xs py-1">
        <button
          onClick={onNavigateToBuilder}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1c1c1e] border border-white/10 text-zinc-300 hover:text-white active:scale-95 transition-all font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
          <span>Builder</span>
        </button>

        <div className="flex items-center gap-2">
          <ExportDropdown
            label="Excel / CSV"
            variant="emerald"
            title="Export all form responses to Excel or CSV"
            disabled={register.rows.length === 0}
            onExportXLSX={() => exportResponsesToExcelOrCSV({ register, format: 'xlsx' })}
            onExportCSV={() => exportResponsesToExcelOrCSV({ register, format: 'csv' })}
          />

          <button
            onClick={onNavigateToTable}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1c1c1e] border border-white/10 text-zinc-300 hover:text-white active:scale-95 transition-all font-medium cursor-pointer"
          >
            <Table2 className="w-3.5 h-3.5 text-[#0a84ff]" />
            <span>Table ({register.rows.length})</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Form Header Card */}
        <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 shadow-lg overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: themeHex }} />
          <div className="p-4 sm:p-6 space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {(lang === 'te' && register.titleTe) ? register.titleTe : register.title}
            </h1>
            {register.description && (
              <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {(lang === 'te' && register.descriptionTe) ? register.descriptionTe : register.description}
              </p>
            )}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-red-400 font-medium">
              <span>* Required</span>
              <span className="text-zinc-500">{inputColumns.length} questions</span>
            </div>
          </div>
        </div>

        {/* ⚡ LIVE REAL-TIME FORMULA CALCULATIONS BANNER (Google Forms can't do this!) */}
        {liveFormulas.length > 0 && (
          <div className="bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-[#1c1c1e] border border-blue-500/30 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-Time Live Formula Calculation
                </span>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                Updates as you type
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {liveFormulas.map(({ col, value }) => (
                <div
                  key={col.id}
                  className="bg-black/30 border border-white/10 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">{col.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono block truncate">fx: {col.formula}</span>
                  </div>
                  <div className="text-base font-black font-mono text-emerald-400 tabular-nums shrink-0">
                    {col.unit ? `${col.unit} ` : ''}{value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Cards Stack */}
        {inputColumns.map((col, idx) => {
          const colLabel = (lang === 'te' && col.nameTe) ? col.nameTe : col.name;
          const error = errors[col.id];
          const hasError = !!error;
          const val = formData[col.id];
          const duplicateWarn = getDuplicateWarning(col.id, val);

          // Check if column is eligible for Auto ID or Barcode
          const isIdField =
            col.type === 'text' &&
            (col.name.toLowerCase().includes('id') ||
              col.name.toLowerCase().includes('roll') ||
              col.name.toLowerCase().includes('code'));

          return (
            <div
              key={col.id}
              id={`q_card_${col.id}`}
              className={`bg-[#1c1c1e] text-white rounded-2xl border p-4 sm:p-5 transition-all ${
                hasError
                  ? 'border-red-500/50 bg-red-500/[0.03] shadow-md shadow-red-500/10'
                  : 'border-white/10 shadow-md hover:border-white/20'
              }`}
            >
              {/* Question Title & Description */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold flex items-baseline gap-1.5 text-zinc-100">
                    <span className="text-[11px] font-mono text-zinc-500 font-normal">#{idx + 1}</span>
                    <span>{colLabel}</span>
                    {col.required && <span className="text-red-400 font-bold">*</span>}
                  </div>
                  {col.description && (
                    <p className="text-xs text-zinc-400">{col.description}</p>
                  )}
                </div>

                {/* Smart Form Field Utilities: Auto-ID & Camera Barcode Scan */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isIdField && (
                    <button
                      type="button"
                      onClick={() => handleGenerateAutoId(col.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-600 rounded-lg transition-all cursor-pointer"
                      title="Generate next sequential ID"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto ID</span>
                    </button>
                  )}

                  {(col.type === 'text' || col.type === 'number') && (
                    <button
                      type="button"
                      onClick={() => handleOpenBarcodeScanner(col.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-600 rounded-lg transition-all cursor-pointer"
                      title="Scan barcode or QR code with camera"
                    >
                      <QrCode className="w-3 h-3" />
                      <span className="hidden sm:inline">Scan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Question Interactive Inputs */}
              <div>
                {/* 1. Short Answer */}
                {col.type === 'text' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={val ?? ''}
                      onChange={(e) => handleChange(col.id, e.target.value)}
                      onBlur={() => handleBlur(col.id)}
                      placeholder="Type your answer"
                      className="w-full text-xs py-2 px-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-[#0a84ff] focus:outline-none transition-all"
                    />

                    {/* Quick Digital Signature / Photo Attach Option if signature or photo in name */}
                    {(col.name.toLowerCase().includes('sign') || col.name.toLowerCase().includes('photo')) && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenSignature(col.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 cursor-pointer"
                        >
                          <PenTool className="w-3 h-3 text-blue-400" />
                          <span>Draw Digital Signature</span>
                        </button>
                        {val && typeof val === 'string' && val.startsWith('data:image') && (
                          <div className="flex items-center gap-2">
                            <img src={val} alt="Signature Preview" className="h-8 max-w-28 object-contain bg-white rounded border" />
                            <span className="text-[10px] text-emerald-400 font-medium">Signed ✓</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Paragraph */}
                {col.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    value={val ?? ''}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    onBlur={() => handleBlur(col.id)}
                    placeholder="Type long answer"
                    className="w-full text-xs py-2 px-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-[#0a84ff] focus:outline-none transition-all"
                  />
                )}

                {/* 3. Number or Currency */}
                {(col.type === 'number' || col.type === 'currency') && (
                  <div className="relative">
                    <input
                      type="number"
                      value={val ?? ''}
                      onChange={(e) => handleChange(col.id, e.target.value)}
                      onBlur={() => handleBlur(col.id)}
                      placeholder={col.unit ? `0.00 (${col.unit})` : '0'}
                      className="w-full text-xs py-2 px-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-[#0a84ff] focus:outline-none transition-all font-mono"
                    />
                    {col.unit && (
                      <span className="absolute right-3 top-2 text-xs font-mono text-zinc-400">
                        {col.unit}
                      </span>
                    )}
                  </div>
                )}

                {/* 4. Multiple Choice (Radio Buttons) */}
                {col.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    {col.options?.map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          val === opt
                            ? 'bg-blue-500/10 border-blue-500/40 text-white'
                            : 'bg-[#222226] border-white/5 text-zinc-300 hover:border-white/15'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`radio_${col.id}`}
                          value={opt}
                          checked={val === opt}
                          onChange={() => {
                            handleChange(col.id, opt);
                            handleBlur(col.id);
                          }}
                          className="w-4 h-4 accent-[#0a84ff] cursor-pointer"
                        />
                        <span className="text-xs font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 5. Checkboxes (Multi-select) */}
                {col.type === 'checkboxes' && (
                  <div className="space-y-2 pt-1">
                    {col.options?.map((opt) => {
                      const isChecked = Array.isArray(val) && val.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-500/10 border-blue-500/40 text-white'
                              : 'bg-[#222226] border-white/5 text-zinc-300 hover:border-white/15'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxToggle(col.id, opt)}
                            className="w-4 h-4 rounded accent-[#0a84ff] cursor-pointer"
                          />
                          <span className="text-xs font-medium">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 6. Dropdown Select */}
                {col.type === 'select' && (
                  <select
                    value={val ?? ''}
                    onChange={(e) => {
                      handleChange(col.id, e.target.value);
                      handleBlur(col.id);
                    }}
                    className="w-full text-xs py-2 px-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-white focus:border-[#0a84ff] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Choose option --</option>
                    {col.options?.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#2c2c2e]">
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* 7. Boolean Checkbox */}
                {col.type === 'checkbox' && (
                  <label className="inline-flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => handleChange(col.id, e.target.checked)}
                      className="w-4 h-4 rounded accent-[#0a84ff] cursor-pointer"
                    />
                    <span className="text-xs text-zinc-200">Yes / Confirmed</span>
                  </label>
                )}

                {/* 8. Linear Scale */}
                {col.type === 'linear_scale' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                      {col.scaleMinLabel && (
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {col.scaleMinLabel}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {Array.from(
                          { length: (col.scaleMax || 5) - (col.scaleMin || 1) + 1 },
                          (_, i) => (col.scaleMin || 1) + i
                        ).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              handleChange(col.id, num);
                              handleBlur(col.id);
                            }}
                            className={`w-9 h-9 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                              val === num
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-[#2c2c2e] text-zinc-300 hover:bg-[#3a3a3c]'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      {col.scaleMaxLabel && (
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {col.scaleMaxLabel}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 9. Date */}
                {col.type === 'date' && (
                  <input
                    type="date"
                    value={val ?? ''}
                    onChange={(e) => {
                      handleChange(col.id, e.target.value);
                      handleBlur(col.id);
                    }}
                    className="w-full sm:max-w-xs text-xs p-2.5 bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-[#0a84ff] focus:outline-none"
                  />
                )}

                {/* 10. Star Rating */}
                {col.type === 'rating' && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          handleChange(col.id, star);
                          handleBlur(col.id);
                        }}
                        className={`text-2xl transition-transform hover:scale-115 cursor-pointer ${
                          (val || 0) >= star ? 'text-amber-400' : 'text-zinc-600'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {val > 0 && (
                      <span className="text-xs font-mono text-zinc-400 ml-2">({val}/5)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Duplicate Warning Callout */}
              {duplicateWarn && !hasError && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{duplicateWarn}</span>
                </div>
              )}

              {/* Validation Error Message */}
              {hasError && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Response</span>
          </button>

          <button
            type="button"
            onClick={handleClearForm}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </form>

      {/* Signature Pad Modal */}
      {showSignatureModal && (
        <SignaturePadModal
          onSave={handleSaveSignature}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeModal && (
        <BarcodeScannerModal
          onScanResult={handleBarcodeResult}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}
    </div>
  );
};
