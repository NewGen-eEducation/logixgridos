import React, { useState } from 'react';
import { Register, ColumnDef, ColumnType, ResponseValidation, ValidationCategory, ValidationOperator, RowData } from '../types/register';
import { Language, translations } from '../utils/translations';
import { ConfirmModal } from './ConfirmModal';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  CheckSquare, 
  SlidersHorizontal, 
  CheckCircle2, 
  FileText, 
  ExternalLink,
  Table2,
  Palette,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { ExportDropdown } from './ExportDropdown';
import { exportFormBuilderToExcelOrCSV, exportResponsesToExcelOrCSV } from '../utils/exportUtils';

interface FormBuilderProps {
  register: Register;
  onUpdateRegister: (updater: (prev: Register) => Register) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onClearAllRows?: () => void;
  onDeleteRegister?: (id: string) => void;
  onNavigateToFillForm: () => void;
  onNavigateToTable: () => void;
  lang: Language;
}

const THEME_COLORS = [
  { name: 'Purple', hex: '#673ab7' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Teal', hex: '#00796b' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Slate', hex: '#475569' },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({
  register,
  onUpdateRegister,
  onDeleteRow,
  onClearAllRows,
  onDeleteRegister,
  onNavigateToFillForm,
  onNavigateToTable,
  lang,
}) => {
  const t = translations[lang];
  // Form Builder Mode: Questions or Responses
  const [activeTab, setActiveTab] = useState<'questions' | 'responses'>('questions');
  const [responseSubTab, setResponseSubTab] = useState<'summary' | 'individual'>('summary');
  const [individualIndex, setIndividualIndex] = useState(0);
  const [acceptingResponses, setAcceptingResponses] = useState(true);

  // Confirm Modals
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showDeleteIndividualConfirm, setShowDeleteIndividualConfirm] = useState(false);
  const [showDeleteFormConfirm, setShowDeleteFormConfirm] = useState(false);

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    register.columns[0]?.id || null
  );

  const themeHex = register.themeColor || '#673ab7';

  // Update Form Metadata (Title, Description, Theme)
  const handleTitleChange = (val: string) => {
    onUpdateRegister((prev) => ({ ...prev, title: val }));
  };

  const handleDescriptionChange = (val: string) => {
    onUpdateRegister((prev) => ({ ...prev, description: val }));
  };

  const handleThemeChange = (hex: string) => {
    onUpdateRegister((prev) => ({ ...prev, themeColor: hex }));
  };

  // Question CRUD
  const handleAddQuestion = () => {
    const newId = `q_${Date.now()}`;
    const newQuestion: ColumnDef = {
      id: newId,
      name: 'Untitled Question',
      type: 'text',
      required: false,
      validation: {
        enabled: false,
        category: 'text',
        operator: 'contains',
        customErrorMessage: '',
      },
      width: 160,
    };

    onUpdateRegister((prev) => ({
      ...prev,
      columns: [...prev.columns, newQuestion],
    }));
    setActiveQuestionId(newId);
  };

  const handleDuplicateQuestion = (col: ColumnDef, index: number) => {
    const copyId = `q_${Date.now()}`;
    const copy: ColumnDef = {
      ...col,
      id: copyId,
      name: `${col.name} (Copy)`,
      options: col.options ? [...col.options] : undefined,
      validation: col.validation ? { ...col.validation } : undefined,
    };

    onUpdateRegister((prev) => {
      const updated = [...prev.columns];
      updated.splice(index + 1, 0, copy);
      return { ...prev, columns: updated };
    });
    setActiveQuestionId(copyId);
  };

  const handleDeleteQuestion = (index: number) => {
    if (register.columns.length <= 1) {
      return;
    }
    onUpdateRegister((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, idx) => idx !== index),
    }));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= register.columns.length) return;

    onUpdateRegister((prev) => {
      const updated = [...prev.columns];
      const [item] = updated.splice(index, 1);
      updated.splice(target, 0, item);
      return { ...prev, columns: updated };
    });
  };

  const handleUpdateQuestion = (index: number, partial: Partial<ColumnDef>) => {
    onUpdateRegister((prev) => {
      const updated = [...prev.columns];
      updated[index] = { ...updated[index], ...partial };
      return { ...prev, columns: updated };
    });
  };

  // Option managers for choice questions
  const handleAddOption = (colIndex: number) => {
    const col = register.columns[colIndex];
    const currentOptions = col.options || ['Option 1'];
    const newOption = `Option ${currentOptions.length + 1}`;
    handleUpdateQuestion(colIndex, { options: [...currentOptions, newOption] });
  };

  const handleUpdateOption = (colIndex: number, optIndex: number, val: string) => {
    const col = register.columns[colIndex];
    if (!col.options) return;
    const updatedOptions = [...col.options];
    updatedOptions[optIndex] = val;
    handleUpdateQuestion(colIndex, { options: updatedOptions });
  };

  const handleDeleteOption = (colIndex: number, optIndex: number) => {
    const col = register.columns[colIndex];
    if (!col.options || col.options.length <= 1) return;
    const updatedOptions = col.options.filter((_, idx) => idx !== optIndex);
    handleUpdateQuestion(colIndex, { options: updatedOptions });
  };

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-16 transition-all">
      {/* iOS Dark Top Action Bar */}
      <div className="bg-[#1c1c1e] p-3 sm:p-4 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white leading-tight">Builder</h2>
            <span className="text-[11px] text-zinc-400 font-mono">
              {register.columns.length} items
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Palette */}
          <div className="hidden sm:flex items-center gap-1 bg-[#2c2c2e] px-2 py-1 rounded-xl border border-white/10 mr-1">
            <Palette className="w-3 h-3 text-zinc-400 mr-0.5" />
            {THEME_COLORS.map((tc) => (
              <button
                key={tc.hex}
                onClick={() => handleThemeChange(tc.hex)}
                title={tc.name}
                style={{ backgroundColor: tc.hex }}
                className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                  themeHex === tc.hex ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110 opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          <button
            onClick={onNavigateToTable}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl border border-white/10 transition-all cursor-pointer"
          >
            <Table2 className="w-3.5 h-3.5 text-[#0a84ff]" />
            <span>Table</span>
          </button>

          {/* Export Form & Responses to Excel / CSV */}
          <ExportDropdown
            label="Excel / CSV"
            variant="emerald"
            title="Export form questions and responses to Excel or CSV"
            onExportXLSX={() => exportFormBuilderToExcelOrCSV({ register, format: 'xlsx' })}
            onExportCSV={() => exportFormBuilderToExcelOrCSV({ register, format: 'csv' })}
          />

          <button
            onClick={onNavigateToFillForm}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          {onDeleteRegister && (
            <button
              onClick={() => setShowDeleteFormConfirm(true)}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
              title="Delete Form"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* iOS Segmented Control: Questions | Responses */}
      <div className="flex items-center p-1 bg-[#1c1c1e] rounded-2xl border border-white/10 shadow-sm max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-[#2c2c2e] text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Questions
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('responses');
            if (individualIndex >= register.rows.length) {
              setIndividualIndex(Math.max(0, register.rows.length - 1));
            }
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'responses'
              ? 'bg-[#2c2c2e] text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Responses</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[#0a84ff] text-white font-bold">
            {register.rows.length}
          </span>
        </button>
      </div>

      {/* ----------------- TAB 1: QUESTIONS BUILDER ----------------- */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* iOS Form Header Card */}
          <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 shadow-lg overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: themeHex }} />
            <div className="p-4 sm:p-6 space-y-3">
              <input
                type="text"
                value={register.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t.formTitle}
                className="w-full text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#0a84ff] focus:outline-none py-1 transition-colors"
              />

              <textarea
                rows={2}
                value={register.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder={t.formDescription}
                className="w-full text-xs text-zinc-400 bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#0a84ff] focus:outline-none py-1 transition-colors resize-none"
              />
            </div>
          </div>

      {/* Questions Stack */}
      <div className="space-y-3">
        {register.columns.map((col, index) => {
          const isActive = activeQuestionId === col.id;
          const isFormula = col.type === 'formula';

          return (
            <div
              key={col.id}
              onClick={() => setActiveQuestionId(col.id)}
              className={`bg-[#1c1c1e] text-white rounded-2xl border transition-all ${
                isActive
                  ? 'border-[#0a84ff]/60 shadow-lg ring-1 ring-[#0a84ff]/30'
                  : 'border-white/10 hover:border-white/20 shadow-md'
              }`}
            >
              {/* Question Card Content */}
              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Question Title & Type Selection */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-500">
                        Q{index + 1}.
                      </span>
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => handleUpdateQuestion(index, { name: e.target.value })}
                        placeholder={t.questionTitle}
                        className="w-full text-xs sm:text-sm font-semibold text-white bg-[#2c2c2e] hover:bg-[#323235] focus:bg-[#2c2c2e] border border-white/10 focus:border-[#0a84ff] focus:outline-none px-3 py-2 rounded-xl transition-colors"
                      />
                    </div>
                  </div>

                  {/* Question Type Selector */}
                  <div className="shrink-0 w-full sm:w-auto">
                    <select
                      value={col.type}
                      onChange={(e) => {
                        const newType = e.target.value as ColumnType;
                        let defaultOpts = col.options;
                        if ((newType === 'multiple_choice' || newType === 'checkboxes' || newType === 'select') && (!defaultOpts || defaultOpts.length === 0)) {
                          defaultOpts = ['Option 1', 'Option 2', 'Option 3'];
                        }
                        handleUpdateQuestion(index, { type: newType, options: defaultOpts });
                      }}
                      className="w-full sm:w-44 text-xs font-medium bg-[#2c2c2e] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0a84ff]"
                    >
                      <option value="text">{t.qShortAnswer}</option>
                      <option value="paragraph">{t.qParagraph}</option>
                      <option value="multiple_choice">{t.qMultipleChoice}</option>
                      <option value="checkboxes">{t.qCheckboxes}</option>
                      <option value="select">{t.qDropdown}</option>
                      <option value="linear_scale">{t.qLinearScale}</option>
                      <option value="number">{t.qNumber}</option>
                      <option value="date">{t.qDate}</option>
                      <option value="rating">{t.qRating}</option>
                      <option value="formula">{t.qFormula}</option>
                    </select>
                  </div>
                </div>

                {/* Helper / Question Description */}
                <div>
                  <input
                    type="text"
                    value={col.description || ''}
                    onChange={(e) => handleUpdateQuestion(index, { description: e.target.value })}
                    placeholder="Description / hint (optional)"
                    className="w-full text-xs text-zinc-400 bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/20 focus:outline-none px-1 py-0.5"
                  />
                </div>

                {/* Question Type Specific Previews / Configs */}
                <div className="pt-1">
                  {col.type === 'text' && (
                    <div className="text-xs text-zinc-500 border-b border-dashed border-white/15 py-1 max-w-xs">
                      Short text answer
                    </div>
                  )}

                  {col.type === 'paragraph' && (
                    <div className="text-xs text-zinc-500 border-b border-dashed border-white/15 py-1.5 max-w-md">
                      Long text answer
                    </div>
                  )}

                  {/* Multiple Choice & Checkboxes & Dropdown Options */}
                  {(col.type === 'multiple_choice' || col.type === 'checkboxes' || col.type === 'select') && (
                    <div className="space-y-2">
                      {(col.options || ['Option 1']).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          {col.type === 'multiple_choice' ? (
                            <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 shrink-0" />
                          ) : col.type === 'checkboxes' ? (
                            <span className="w-3.5 h-3.5 rounded-xs border border-zinc-500 shrink-0" />
                          ) : (
                            <span className="text-xs text-zinc-500 font-mono shrink-0">{optIdx + 1}.</span>
                          )}

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(index, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 text-xs text-zinc-200 bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#0a84ff] focus:outline-none px-1 py-0.5"
                          />

                          {(col.options?.length || 0) > 1 && (
                            <button
                              onClick={() => handleDeleteOption(index, optIdx)}
                              className="text-zinc-500 hover:text-red-400 text-xs px-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddOption(index)}
                        className="text-xs text-[#0a84ff] hover:text-blue-400 font-semibold flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  )}

                  {/* Linear Scale */}
                  {col.type === 'linear_scale' && (
                    <div className="space-y-2.5 bg-[#242426] p-3 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3 text-xs text-zinc-300">
                        <span className="font-semibold">Scale:</span>
                        <span>1 to</span>
                        <select
                          value={col.scaleMax || 5}
                          onChange={(e) => handleUpdateQuestion(index, { scaleMax: Number(e.target.value) })}
                          className="bg-[#2c2c2e] border border-white/10 text-white rounded-lg px-2 py-0.5"
                        >
                          <option value="5">5</option>
                          <option value="7">7</option>
                          <option value="10">10</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-0.5">Low label (1)</label>
                          <input
                            type="text"
                            value={col.scaleMinLabel || ''}
                            onChange={(e) => handleUpdateQuestion(index, { scaleMinLabel: e.target.value })}
                            placeholder="e.g. Poor"
                            className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-0.5">
                            High label ({col.scaleMax || 5})
                          </label>
                          <input
                            type="text"
                            value={col.scaleMaxLabel || ''}
                            onChange={(e) => handleUpdateQuestion(index, { scaleMaxLabel: e.target.value })}
                            placeholder="e.g. Excellent"
                            className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formula expression */}
                  {col.type === 'formula' && (
                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 space-y-1.5">
                      <label className="block text-xs font-semibold text-blue-300">
                        Formula Expression (Auto-Calculated in Table)
                      </label>
                      <input
                        type="text"
                        value={col.formula || ''}
                        onChange={(e) => handleUpdateQuestion(index, { formula: e.target.value })}
                        placeholder="[col1] + [col2] or [price] * [qty]"
                        className="w-full text-xs font-mono bg-[#1c1c1e] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-blue-300 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Response Validation Panel */}
                {!isFormula && (
                  <ResponseValidationEditor
                    validation={col.validation}
                    columnType={col.type}
                    onChange={(updatedVal) => handleUpdateQuestion(index, { validation: updatedVal })}
                    lang={lang}
                  />
                )}

                {/* Question Bottom Toolbar */}
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveQuestion(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(index, 'down')}
                      disabled={index === register.columns.length - 1}
                      className="p-1 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                      onClick={() => handleDuplicateQuestion(col, index)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy</span>
                    </button>

                    <button
                      onClick={() => handleDeleteQuestion(index)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Delete</span>
                    </button>

                    <div className="h-3.5 w-[1px] bg-white/10" />

                    {/* Required Toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-zinc-300">
                      <span className="text-[11px]">Req</span>
                      <input
                        type="checkbox"
                        checked={!!col.required}
                        onChange={(e) => handleUpdateQuestion(index, { required: e.target.checked })}
                        className="rounded accent-[#0a84ff] cursor-pointer w-3.5 h-3.5"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

        {/* Floating Add Question Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleAddQuestion}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-full shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Question</span>
          </button>
        </div>
      </div>
    )}

    {/* ----------------- TAB 2: RESPONSES VIEW ----------------- */}
    {activeTab === 'responses' && (
      <div className="space-y-4">
        {/* Top Responses Header Card */}
        <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 shadow-lg p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {register.rows.length} {register.rows.length === 1 ? 'Response' : 'Responses'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">
                {register.title}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Accepting responses toggle */}
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 bg-[#2c2c2e] px-2.5 py-1.5 rounded-xl border border-white/10">
                <span className="text-[11px]">Accepting</span>
                <button
                  type="button"
                  onClick={() => setAcceptingResponses(!acceptingResponses)}
                  className={`w-8 h-4.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    acceptingResponses ? 'bg-[#30d158]' : 'bg-zinc-600'
                  }`}
                >
                  <div
                    className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                      acceptingResponses ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* View in Table */}
              <button
                type="button"
                onClick={onNavigateToTable}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#38383c] border border-white/10 rounded-xl transition-all cursor-pointer"
                title="View in Table"
              >
                <Table2 className="w-3.5 h-3.5 text-[#0a84ff]" />
                <span>Table</span>
              </button>

              {/* Export Responses to Excel or CSV */}
              <ExportDropdown
                label="Export Responses"
                variant="emerald"
                title="Export all submitted responses to Excel or CSV"
                disabled={register.rows.length === 0}
                onExportXLSX={() => exportResponsesToExcelOrCSV({ register, format: 'xlsx' })}
                onExportCSV={() => exportResponsesToExcelOrCSV({ register, format: 'csv' })}
              />

              {/* Clear all responses */}
              {onClearAllRows && register.rows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(true)}
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Clear All Responses"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Subtabs: Summary | Individual */}
          {register.rows.length > 0 && (
            <div className="flex items-center gap-1.5 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setResponseSubTab('summary')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  responseSubTab === 'summary'
                    ? 'bg-[#0a84ff] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white bg-[#2c2c2e]'
                }`}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setResponseSubTab('individual')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  responseSubTab === 'individual'
                    ? 'bg-[#0a84ff] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white bg-[#2c2c2e]'
                }`}
              >
                Individual
              </button>
            </div>
          )}
        </div>

        {/* Empty state */}
        {register.rows.length === 0 ? (
          <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 shadow-lg p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="text-sm font-bold text-white">No responses yet</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Fill out your form to see submitted answers here in real time.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToFillForm}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Fill Form
            </button>
          </div>
        ) : responseSubTab === 'individual' ? (
          /* Individual Response View */
          <div className="space-y-3">
            {/* Pagination & Delete Record Card */}
            <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 shadow-md p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={individualIndex <= 0}
                  onClick={() => setIndividualIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-20 cursor-pointer text-zinc-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-xs font-bold font-mono text-zinc-200">
                  {individualIndex + 1} / {register.rows.length}
                </div>

                <button
                  type="button"
                  disabled={individualIndex >= register.rows.length - 1}
                  onClick={() => setIndividualIndex((prev) => Math.min(register.rows.length - 1, prev + 1))}
                  className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-20 cursor-pointer text-zinc-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {register.rows[individualIndex]?.timestamp && (
                  <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline ml-1">
                    · {String(register.rows[individualIndex]?.timestamp)}
                  </span>
                )}
              </div>

              {/* Delete this response */}
              {onDeleteRow && (
                <button
                  type="button"
                  onClick={() => setShowDeleteIndividualConfirm(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Individual Responses Card */}
            <div className="space-y-2.5">
              {register.columns.map((col) => {
                const row = register.rows[individualIndex] || {};
                const val = row[col.id];
                const displayVal = val === null || val === undefined || val === ''
                  ? '—'
                  : Array.isArray(val)
                  ? val.join(', ')
                  : typeof val === 'boolean'
                  ? val ? 'Yes' : 'No'
                  : String(val);

                return (
                  <div key={col.id} className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 p-4 shadow-md space-y-1">
                    <span className="text-xs font-medium text-zinc-400 block">
                      {col.name}
                    </span>
                    <div className="text-xs sm:text-sm font-semibold text-white bg-[#2c2c2e] p-2.5 rounded-xl border border-white/5 font-mono">
                      {displayVal}
                      {col.unit && displayVal !== '—' ? ` ${col.unit}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Summary View */
          <div className="space-y-3">
            {register.columns.map((col) => {
              const values = register.rows.map((r) => r[col.id]).filter((v) => v !== null && v !== undefined && v !== '');
              const isNum = col.type === 'number' || col.type === 'currency' || col.type === 'linear_scale';
              const isChoice = col.type === 'select' || col.type === 'multiple_choice' || col.type === 'checkboxes' || col.type === 'checkbox';

              const counts: Record<string, number> = {};
              values.forEach((v) => {
                if (Array.isArray(v)) {
                  v.forEach((item) => {
                    const k = String(item);
                    counts[k] = (counts[k] || 0) + 1;
                  });
                } else {
                  const k = String(v);
                  counts[k] = (counts[k] || 0) + 1;
                }
              });

              return (
                <div key={col.id} className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 p-4 sm:p-5 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{col.name}</h4>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {values.length} {values.length === 1 ? 'response' : 'responses'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2c2c2e] px-2 py-0.5 rounded-lg text-zinc-400 border border-white/5">
                      {col.type}
                    </span>
                  </div>

                  {/* Summary Visuals */}
                  {isChoice && Object.keys(counts).length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {Object.entries(counts).map(([opt, count]) => {
                        const pct = Math.round((count / Math.max(1, values.length)) * 100);
                        return (
                          <div key={opt} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-zinc-300">{opt}</span>
                              <span className="font-mono text-zinc-400">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#2c2c2e] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-[#0a84ff]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : isNum && values.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="p-2.5 bg-[#2c2c2e] rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-400 block uppercase">Avg</span>
                        <span className="text-sm sm:text-base font-bold text-white">
                          {(values.reduce((a, b) => Number(a) + Number(b), 0) / values.length).toFixed(1)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#2c2c2e] rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-400 block uppercase">Min</span>
                        <span className="text-sm sm:text-base font-bold text-white">
                          {Math.min(...values.map(Number))}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#2c2c2e] rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-400 block uppercase">Max</span>
                        <span className="text-sm sm:text-base font-bold text-white">
                          {Math.max(...values.map(Number))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-xl text-xs font-mono bg-[#242426]">
                      {values.slice(0, 10).map((v, idx) => (
                        <div key={idx} className="p-2 text-zinc-200">
                          {String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

    {/* In-app Confirm Modal for Delete Individual Response */}
    <ConfirmModal
      isOpen={showDeleteIndividualConfirm}
      title="Delete Response"
      message={`Are you sure you want to delete response #${individualIndex + 1}? This action cannot be undone.`}
      confirmLabel="Delete Response"
      cancelLabel="Cancel"
      isDestructive={true}
      onConfirm={() => {
        if (onDeleteRow) {
          onDeleteRow(individualIndex);
          if (individualIndex >= register.rows.length - 1) {
            setIndividualIndex(Math.max(0, register.rows.length - 2));
          }
        }
        setShowDeleteIndividualConfirm(false);
      }}
      onClose={() => setShowDeleteIndividualConfirm(false)}
    />

    {/* In-app Confirm Modal for Delete All Responses */}
    <ConfirmModal
      isOpen={showClearAllConfirm}
      title="Delete All Responses"
      message={`Are you sure you want to permanently delete all ${register.rows.length} responses in "${register.title}"? This action cannot be undone.`}
      confirmLabel="Delete All Responses"
      cancelLabel="Cancel"
      isDestructive={true}
      onConfirm={() => {
        onClearAllRows?.();
        setIndividualIndex(0);
        setShowClearAllConfirm(false);
      }}
      onClose={() => setShowClearAllConfirm(false)}
    />

    {/* In-app Confirm Modal for Delete Entire Form */}
    <ConfirmModal
      isOpen={showDeleteFormConfirm}
      title="Delete Form"
      message={`Are you sure you want to delete the form "${register.title}" and all its questions and responses? This action cannot be undone.`}
      confirmLabel="Delete Form"
      cancelLabel="Cancel"
      isDestructive={true}
      onConfirm={() => {
        onDeleteRegister?.(register.id);
        setShowDeleteFormConfirm(false);
      }}
      onClose={() => setShowDeleteFormConfirm(false)}
    />
  </div>
);
};

/* =========================================================================
   Google Forms Response Validation Editor Component
========================================================================= */
interface ResponseValidationEditorProps {
  validation?: ResponseValidation;
  columnType: ColumnType;
  onChange: (val: ResponseValidation) => void;
  lang: Language;
}

function ResponseValidationEditor({
  validation,
  columnType,
  onChange,
  lang,
}: ResponseValidationEditorProps) {
  const t = translations[lang];
  const isEnabled = validation?.enabled ?? false;

  // Derive default category based on column type
  const defaultCategory: ValidationCategory =
    columnType === 'number' || columnType === 'currency'
      ? 'number'
      : columnType === 'checkboxes'
      ? 'checkbox'
      : 'text';

  const category = validation?.category || defaultCategory;
  const operator = validation?.operator || 'greater_than';
  const val1 = validation?.value ?? '';
  const val2 = validation?.secondValue ?? '';
  const customError = validation?.customErrorMessage || '';

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      category,
      operator,
      value: val1,
      secondValue: val2,
      customErrorMessage: customError,
    });
  };

  const handleCategoryChange = (newCat: ValidationCategory) => {
    let defOp: ValidationOperator = 'greater_than';
    if (newCat === 'text') defOp = 'contains';
    if (newCat === 'length') defOp = 'max_char_count';
    if (newCat === 'checkbox') defOp = 'select_at_least';
    if (newCat === 'regex') defOp = 'contains';

    onChange({
      enabled: true,
      category: newCat,
      operator: defOp,
      value: val1,
      secondValue: val2,
      customErrorMessage: customError,
    });
  };

  const handleOperatorChange = (newOp: ValidationOperator) => {
    onChange({
      ...validation!,
      operator: newOp,
    });
  };

  const handleValChange = (field: 'value' | 'secondValue' | 'customErrorMessage', v: any) => {
    onChange({
      ...validation!,
      [field]: v,
    });
  };

  return (
    <div className="bg-[#242426] p-3 rounded-xl border border-white/10 space-y-2">
      {/* Toggle header */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-200">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="rounded accent-[#0a84ff] cursor-pointer w-3.5 h-3.5"
          />
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0a84ff]" />
          <span>{t.responseValidation}</span>
        </label>
        {isEnabled && (
          <span className="text-[10px] text-emerald-400 font-medium">Active</span>
        )}
      </div>

      {/* Validation controls (when enabled) */}
      {isEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              {t.validationCategory}
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as ValidationCategory)}
              className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="number">{t.valNumber}</option>
              <option value="text">{t.valText}</option>
              <option value="length">{t.valLength}</option>
              <option value="checkbox">{t.valCheckbox}</option>
              <option value="regex">{t.valRegex}</option>
            </select>
          </div>

          {/* Operator / Condition */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              {t.validationOperator}
            </label>
            <select
              value={operator}
              onChange={(e) => handleOperatorChange(e.target.value as ValidationOperator)}
              className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              {category === 'number' && (
                <>
                  <option value="greater_than">{t.opGreaterThan}</option>
                  <option value="greater_than_or_equal">{t.opGreaterThanOrEqual}</option>
                  <option value="less_than">{t.opLessThan}</option>
                  <option value="less_than_or_equal">{t.opLessThanOrEqual}</option>
                  <option value="equal_to">{t.opEqualTo}</option>
                  <option value="not_equal_to">{t.opNotEqualTo}</option>
                  <option value="between">{t.opBetween}</option>
                  <option value="not_between">{t.opNotBetween}</option>
                  <option value="is_number">{t.opIsNumber}</option>
                  <option value="whole_number">{t.opWholeNumber}</option>
                </>
              )}

              {category === 'text' && (
                <>
                  <option value="contains">{t.opContains}</option>
                  <option value="does_not_contain">{t.opDoesNotContain}</option>
                  <option value="email">{t.opEmail}</option>
                  <option value="url">{t.opUrl}</option>
                </>
              )}

              {category === 'length' && (
                <>
                  <option value="max_char_count">{t.opMaxChar}</option>
                  <option value="min_char_count">{t.opMinChar}</option>
                </>
              )}

              {category === 'checkbox' && (
                <>
                  <option value="select_at_least">{t.opSelectAtLeast}</option>
                  <option value="select_at_most">{t.opSelectAtMost}</option>
                  <option value="select_exactly">{t.opSelectExactly}</option>
                </>
              )}

              {category === 'regex' && (
                <>
                  <option value="contains">{t.opContains}</option>
                  <option value="does_not_contain">{t.opDoesNotContain}</option>
                  <option value="matches">{t.opMatches}</option>
                  <option value="does_not_match">{t.opDoesNotMatch}</option>
                </>
              )}
            </select>
          </div>

          {/* Value input (if needed by operator) */}
          {operator !== 'email' && operator !== 'url' && operator !== 'is_number' && operator !== 'whole_number' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                {t.validationValue}
              </label>
              <input
                type={category === 'number' || category === 'length' || category === 'checkbox' ? 'number' : 'text'}
                value={val1}
                onChange={(e) => handleValChange('value', e.target.value)}
                placeholder="Limit"
                className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          {/* Second Value for between / not_between */}
          {(operator === 'between' || operator === 'not_between') && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                {t.validationSecondValue}
              </label>
              <input
                type="number"
                value={val2}
                onChange={(e) => handleValChange('secondValue', e.target.value)}
                placeholder="Max"
                className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          {/* Custom Error Message */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              {t.customErrorMessage}
            </label>
            <input
              type="text"
              value={customError}
              onChange={(e) => handleValChange('customErrorMessage', e.target.value)}
              placeholder={t.customErrorPlaceholder}
              className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
