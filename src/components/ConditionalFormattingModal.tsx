import React, { useState } from 'react';
import { 
  ColumnDef, 
  ConditionalFormattingRule, 
  ConditionalRuleType, 
  CellValueCondition, 
  ConditionalFormatStyle 
} from '../types/register';
import { createPresetRule } from '../utils/conditionalFormatting';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Paintbrush, 
  Layers, 
  BarChart2, 
  Sliders, 
  AlertTriangle,
  ArrowUpDown,
  Palette,
  Eye,
  EyeOff
} from 'lucide-react';

interface ConditionalFormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  rules: ConditionalFormattingRule[];
  onSaveRules: (rules: ConditionalFormattingRule[]) => void;
}

const PRESET_BG_COLORS = [
  { name: 'Soft Green', bg: '#14532d', text: '#86efac' },
  { name: 'Soft Red', bg: '#7f1d1d', text: '#fca5a5' },
  { name: 'Soft Yellow', bg: '#713f12', text: '#fde047' },
  { name: 'Soft Blue', bg: '#1e3a8a', text: '#93c5fd' },
  { name: 'Soft Purple', bg: '#581c87', text: '#d8b4fe' },
  { name: 'Soft Orange', bg: '#7c2d12', text: '#fdba74' },
];

export const ConditionalFormattingModal: React.FC<ConditionalFormattingModalProps> = ({
  isOpen,
  onClose,
  columns,
  rules,
  onSaveRules,
}) => {
  const [activeRules, setActiveRules] = useState<ConditionalFormattingRule[]>(rules);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State for Editing/Adding Rule
  const [columnId, setColumnId] = useState<string>(columns[0]?.id || 'ALL_COLUMNS');
  const [applyToRow, setApplyToRow] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<ConditionalRuleType>('cell_value');
  const [condition, setCondition] = useState<CellValueCondition>('greater_than');
  const [val1, setVal1] = useState<string>('35');
  const [val2, setVal2] = useState<string>('');
  const [style, setStyle] = useState<ConditionalFormatStyle>({
    backgroundColor: '#14532d',
    textColor: '#86efac',
    bold: true,
  });

  // Color Scale State
  const [minColor, setMinColor] = useState('#ef4444');
  const [midColor, setMidColor] = useState('#eab308');
  const [maxColor, setMaxColor] = useState('#22c55e');
  const [hasMidpoint, setHasMidpoint] = useState(true);

  // Data Bar State
  const [barColor, setBarColor] = useState('#3b82f6');

  // Icon Set State
  const [iconType, setIconType] = useState<'traffic_lights' | 'arrows' | 'symbols' | 'flags'>('traffic_lights');
  const [reverseIcons, setReverseIcons] = useState(false);

  if (!isOpen) return null;

  const handleStartEdit = (rule: ConditionalFormattingRule) => {
    setEditingRuleId(rule.id);
    setColumnId(rule.columnId);
    setApplyToRow(rule.applyToRow || false);
    setRuleType(rule.ruleType);
    if (rule.condition) setCondition(rule.condition);
    if (rule.value !== undefined) setVal1(String(rule.value));
    if (rule.secondValue !== undefined) setVal2(String(rule.secondValue));
    if (rule.style) setStyle(rule.style);
    if (rule.colorScale) {
      setMinColor(rule.colorScale.minColor);
      setMaxColor(rule.colorScale.maxColor);
      if (rule.colorScale.midColor) setMidColor(rule.colorScale.midColor);
      setHasMidpoint(rule.colorScale.hasMidpoint);
    }
    if (rule.dataBar) {
      setBarColor(rule.dataBar.barColor);
    }
    if (rule.iconSet) {
      setIconType(rule.iconSet.iconType);
      setReverseIcons(rule.iconSet.reverseOrder || false);
    }
  };

  const handleAddNewRule = () => {
    const newId = `rule_${Date.now()}`;
    setEditingRuleId(newId);
    setColumnId(columns[0]?.id || 'ALL_COLUMNS');
    setApplyToRow(false);
    setRuleType('cell_value');
    setCondition('greater_than');
    setVal1('50');
    setVal2('');
    setStyle({
      backgroundColor: '#14532d',
      textColor: '#86efac',
      bold: true,
    });
  };

  const handleSaveCurrentRule = () => {
    if (!editingRuleId) return;

    const targetCol = columns.find((c) => c.id === columnId);
    const colName = columnId === 'ALL_COLUMNS' ? 'All Columns' : targetCol?.name || columnId;

    let ruleName = `${colName}: ${condition.replace(/_/g, ' ')}`;
    if (ruleType === 'color_scale') ruleName = `${colName}: Color Scale`;
    if (ruleType === 'data_bar') ruleName = `${colName}: Data Bars`;
    if (ruleType === 'icon_set') ruleName = `${colName}: Icon Set`;

    const updatedRule: ConditionalFormattingRule = {
      id: editingRuleId,
      name: ruleName,
      enabled: true,
      columnId,
      applyToRow,
      ruleType,
      condition,
      value: val1,
      secondValue: val2,
      style,
      colorScale: ruleType === 'color_scale' ? { minColor, midColor, maxColor, hasMidpoint } : undefined,
      dataBar: ruleType === 'data_bar' ? { barColor, showValue: true } : undefined,
      iconSet: ruleType === 'icon_set' ? { iconType, reverseOrder: reverseIcons } : undefined,
    };

    const exists = activeRules.some((r) => r.id === editingRuleId);
    let nextList: ConditionalFormattingRule[];
    if (exists) {
      nextList = activeRules.map((r) => (r.id === editingRuleId ? updatedRule : r));
    } else {
      nextList = [...activeRules, updatedRule];
    }

    setActiveRules(nextList);
    onSaveRules(nextList);
    setEditingRuleId(null);
  };

  const handleDeleteRule = (id: string) => {
    const nextList = activeRules.filter((r) => r.id !== id);
    setActiveRules(nextList);
    onSaveRules(nextList);
    if (editingRuleId === id) setEditingRuleId(null);
  };

  const handleToggleRule = (id: string) => {
    const nextList = activeRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setActiveRules(nextList);
    onSaveRules(nextList);
  };

  const handleApplyPreset = (type: 'pass' | 'fail' | 'top10' | 'duplicates' | 'color_scale' | 'data_bar' | 'above_avg') => {
    const targetCol = columns.find((c) => c.type === 'number' || c.type === 'currency') || columns[0];
    if (!targetCol) return;
    const newRule = createPresetRule(type, targetCol.id, targetCol.name);
    const nextList = [...activeRules, newRule];
    setActiveRules(nextList);
    onSaveRules(nextList);
  };

  const handleClearAll = () => {
    setActiveRules([]);
    onSaveRules([]);
    setEditingRuleId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-[#1c1c1e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-xs">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Conditional Formatting Rules</span>
                <span className="text-xs font-normal text-zinc-400 font-['Noto_Sans_Telugu']">
                  (షరతులతో కూడిన ఫార్మాటింగ్)
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Format table cells, color scales, and data bars automatically based on conditions (Google Sheets & Excel style)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Ribbon */}
        <div className="px-5 py-2.5 bg-[#141416] border-b border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>1-Click Presets:</span>
          </span>

          <button
            type="button"
            onClick={() => handleApplyPreset('pass')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            &gt;= 35 (Pass) Green
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('fail')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            &lt; 35 (Fail) Red
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('color_scale')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            Traffic Light Scale (Red-Yellow-Green)
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('data_bar')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            Excel Data Bars
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('top10')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            Top 5 Items
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('duplicates')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            Highlight Duplicates
          </button>
        </div>

        {/* Modal Body: Split view (Rules list on left, Editor on right) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Left Column: Active Rules List */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Configured Rules ({activeRules.length})
              </span>
              <button
                type="button"
                onClick={handleAddNewRule}
                className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {activeRules.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-zinc-500 space-y-2">
                  <Paintbrush className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-xs">No conditional rules yet.</p>
                  <button
                    type="button"
                    onClick={handleAddNewRule}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    + Create First Rule
                  </button>
                </div>
              ) : (
                activeRules.map((r, idx) => {
                  const targetCol = columns.find((c) => c.id === r.columnId);
                  const isSelected = editingRuleId === r.id;

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleStartEdit(r)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected 
                          ? 'bg-blue-600/20 border-blue-500 shadow-md ring-1 ring-blue-500/50' 
                          : 'bg-[#242426] hover:bg-[#2c2c2e] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Toggle active button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRule(r.id);
                          }}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            r.enabled ? 'text-emerald-400 bg-emerald-500/20' : 'text-zinc-600 bg-white/5'
                          }`}
                          title={r.enabled ? 'Rule is active' : 'Rule is disabled'}
                        >
                          {r.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {r.columnId === 'ALL_COLUMNS' ? 'All Columns' : targetCol?.name || r.columnId}
                            </span>
                            {r.applyToRow && (
                              <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/20 px-1 py-0.2 rounded">
                                Row
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {r.name || r.ruleType}
                          </span>
                        </div>
                      </div>

                      {/* Style Preview Swatch */}
                      <div className="flex items-center gap-2 shrink-0">
                        {r.style?.backgroundColor && (
                          <div
                            className="w-5 h-5 rounded-md border border-white/20 shadow-xs flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: r.style.backgroundColor,
                              color: r.style.textColor || '#fff',
                            }}
                          >
                            Aa
                          </div>
                        )}
                        {r.ruleType === 'color_scale' && (
                          <div className="w-7 h-4 rounded-md bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 border border-white/20" />
                        )}
                        {r.ruleType === 'data_bar' && (
                          <div className="w-7 h-4 rounded-md bg-blue-500/50 border border-blue-400/50 flex items-center px-0.5">
                            <div className="w-4 h-2 bg-blue-500 rounded-xs" />
                          </div>
                        )}
                        {r.ruleType === 'icon_set' && (
                          <span className="text-xs">🟢</span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRule(r.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {activeRules.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-rose-400 hover:text-rose-300 pt-2 transition-colors cursor-pointer self-start"
              >
                Clear all rules
              </button>
            )}
          </div>

          {/* Right Column: Rule Editor */}
          <div className="md:col-span-7 bg-[#242426] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            {editingRuleId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Configure Rule
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingRuleId(null)}
                    className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* 1. Target Column & Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      Apply to Column
                    </label>
                    <select
                      value={columnId}
                      onChange={(e) => setColumnId(e.target.value)}
                      className="w-full bg-[#1c1c1e] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ALL_COLUMNS">All Columns</option>
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyToRow}
                        onChange={(e) => setApplyToRow(e.target.checked)}
                        className="rounded accent-blue-500 cursor-pointer w-4 h-4"
                      />
                      <span>Format entire row if matched</span>
                    </label>
                  </div>
                </div>

                {/* 2. Rule Type Category Tabs */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Rule Type
                  </label>
                  <div className="flex items-center gap-1 p-1 bg-[#1c1c1e] rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setRuleType('cell_value')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ruleType === 'cell_value' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Single Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('color_scale')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ruleType === 'color_scale' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Color Scale
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('data_bar')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ruleType === 'data_bar' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Data Bars
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('icon_set')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ruleType === 'icon_set' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Icon Sets
                    </button>
                  </div>
                </div>

                {/* 3. Conditional Options based on Rule Type */}
                {ruleType === 'cell_value' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                        Format cells if...
                      </label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as CellValueCondition)}
                        className="w-full bg-[#1c1c1e] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <optgroup label="Empty / Not Empty">
                          <option value="empty">Is empty</option>
                          <option value="not_empty">Is not empty</option>
                        </optgroup>
                        <optgroup label="Text Rules">
                          <option value="text_contains">Text contains</option>
                          <option value="text_not_contains">Text does not contain</option>
                          <option value="text_starts_with">Text starts with</option>
                          <option value="text_ends_with">Text ends with</option>
                          <option value="text_exact">Text is exactly</option>
                        </optgroup>
                        <optgroup label="Numeric Comparison">
                          <option value="greater_than">Greater than (&gt;)</option>
                          <option value="greater_than_or_equal">Greater than or equal to (&gt;=)</option>
                          <option value="less_than">Less than (&lt;)</option>
                          <option value="less_than_or_equal">Less than or equal to (&lt;=)</option>
                          <option value="equal_to">Is equal to (=)</option>
                          <option value="not_equal_to">Is not equal to (!=)</option>
                          <option value="between">Is between</option>
                          <option value="not_between">Is not between</option>
                        </optgroup>
                        <optgroup label="Excel / Sheets Ranking & Stats">
                          <option value="top_n">Top N values</option>
                          <option value="bottom_n">Bottom N values</option>
                          <option value="above_average">Above average</option>
                          <option value="below_average">Below average</option>
                          <option value="duplicate">Duplicate values</option>
                          <option value="unique">Unique values</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Value Inputs if required */}
                    {!['empty', 'not_empty', 'above_average', 'below_average', 'duplicate', 'unique'].includes(condition) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                            {condition === 'between' || condition === 'not_between' ? 'Min Value' : 'Value / Text'}
                          </label>
                          <input
                            type="text"
                            value={val1}
                            onChange={(e) => setVal1(e.target.value)}
                            placeholder="e.g. 35, Pass, etc."
                            className="w-full bg-[#1c1c1e] text-xs text-white px-3 py-1.5 rounded-xl border border-white/15 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {(condition === 'between' || condition === 'not_between') && (
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                              Max Value
                            </label>
                            <input
                              type="text"
                              value={val2}
                              onChange={(e) => setVal2(e.target.value)}
                              placeholder="e.g. 100"
                              className="w-full bg-[#1c1c1e] text-xs text-white px-3 py-1.5 rounded-xl border border-white/15 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Formatting Style: Presets & Colors */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                        Formatting Style
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                        {PRESET_BG_COLORS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setStyle({ ...style, backgroundColor: preset.bg, textColor: preset.text })}
                            className="h-7 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
                            style={{ backgroundColor: preset.bg, color: preset.text }}
                          >
                            Aa
                          </button>
                        ))}
                      </div>

                      {/* Custom Color Pickers & Font Formats */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-[#1c1c1e] px-2 py-1 rounded-xl border border-white/10 text-xs">
                          <span className="text-[10px] text-zinc-400">BG:</span>
                          <input
                            type="color"
                            value={style.backgroundColor || '#14532d'}
                            onChange={(e) => setStyle({ ...style, backgroundColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#1c1c1e] px-2 py-1 rounded-xl border border-white/10 text-xs">
                          <span className="text-[10px] text-zinc-400">Text:</span>
                          <input
                            type="color"
                            value={style.textColor || '#86efac'}
                            onChange={(e) => setStyle({ ...style, textColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setStyle({ ...style, bold: !style.bold })}
                          className={`w-7 h-7 rounded-xl font-bold text-xs border cursor-pointer ${
                            style.bold ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1c1c1e] text-zinc-400 border-white/10'
                          }`}
                        >
                          B
                        </button>

                        <button
                          type="button"
                          onClick={() => setStyle({ ...style, italic: !style.italic })}
                          className={`w-7 h-7 rounded-xl italic text-xs border cursor-pointer ${
                            style.italic ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1c1c1e] text-zinc-400 border-white/10'
                          }`}
                        >
                          I
                        </button>

                        <button
                          type="button"
                          onClick={() => setStyle({ ...style, underline: !style.underline })}
                          className={`w-7 h-7 rounded-xl underline text-xs border cursor-pointer ${
                            style.underline ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1c1c1e] text-zinc-400 border-white/10'
                          }`}
                        >
                          U
                        </button>

                        <button
                          type="button"
                          onClick={() => setStyle({ ...style, strikethrough: !style.strikethrough })}
                          className={`w-7 h-7 rounded-xl line-through text-xs border cursor-pointer ${
                            style.strikethrough ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1c1c1e] text-zinc-400 border-white/10'
                          }`}
                        >
                          S
                        </button>
                      </div>

                      {/* Live Preview Box */}
                      <div className="mt-2.5 p-2 rounded-xl border border-white/10 text-center">
                        <span className="text-[10px] text-zinc-400 block mb-1">Preview</span>
                        <div
                          className="py-1.5 px-3 rounded-lg font-mono text-xs inline-block"
                          style={{
                            backgroundColor: style.backgroundColor,
                            color: style.textColor,
                            fontWeight: style.bold ? '700' : 'normal',
                            fontStyle: style.italic ? 'italic' : 'normal',
                            textDecoration: `${style.underline ? 'underline' : ''} ${style.strikethrough ? 'line-through' : ''}`.trim(),
                          }}
                        >
                          Sample Cell (95)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Color Scale Options */}
                {ruleType === 'color_scale' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#1c1c1e] p-2 rounded-xl border border-white/10">
                        <label className="text-[10px] text-zinc-400 block mb-1">Min Value</label>
                        <input
                          type="color"
                          value={minColor}
                          onChange={(e) => setMinColor(e.target.value)}
                          className="w-full h-7 rounded cursor-pointer"
                        />
                      </div>

                      <div className="bg-[#1c1c1e] p-2 rounded-xl border border-white/10">
                        <label className="text-[10px] text-zinc-400 block mb-1">Midpoint (50%)</label>
                        <input
                          type="color"
                          value={midColor}
                          onChange={(e) => setMidColor(e.target.value)}
                          className="w-full h-7 rounded cursor-pointer"
                        />
                      </div>

                      <div className="bg-[#1c1c1e] p-2 rounded-xl border border-white/10">
                        <label className="text-[10px] text-zinc-400 block mb-1">Max Value</label>
                        <input
                          type="color"
                          value={maxColor}
                          onChange={(e) => setMaxColor(e.target.value)}
                          className="w-full h-7 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Gradient preview */}
                    <div className="h-6 rounded-xl border border-white/15 shadow-inner" style={{
                      background: `linear-gradient(to right, ${minColor}, ${midColor}, ${maxColor})`
                    }} />
                  </div>
                )}

                {/* Data Bar Options */}
                {ruleType === 'data_bar' && (
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold text-zinc-400">
                      Bar Color Fill
                    </label>
                    <div className="flex items-center gap-2">
                      {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBarColor(c)}
                          className={`w-7 h-7 rounded-xl border transition-transform cursor-pointer ${
                            barColor === c ? 'scale-110 ring-2 ring-white' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={barColor}
                        onChange={(e) => setBarColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent"
                      />
                    </div>

                    <div className="p-3 bg-[#1c1c1e] rounded-xl border border-white/10">
                      <span className="text-[10px] text-zinc-400 block mb-1.5">Data Bar Preview:</span>
                      <div className="relative h-6 bg-zinc-800 rounded-lg overflow-hidden flex items-center px-2 font-mono text-xs text-white">
                        <div 
                          className="absolute left-0 top-0 bottom-0 opacity-75 rounded-lg transition-all"
                          style={{ width: '65%', backgroundColor: barColor }}
                        />
                        <span className="relative z-10 font-bold">65% Filled Value</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Icon Set Options */}
                {ruleType === 'icon_set' && (
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold text-zinc-400">
                      Icon Set Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIconType('traffic_lights')}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          iconType === 'traffic_lights' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#1c1c1e] border-white/10 text-zinc-300'
                        }`}
                      >
                        <span>Traffic Lights</span>
                        <span>🟢 🟡 🔴</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIconType('arrows')}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          iconType === 'arrows' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#1c1c1e] border-white/10 text-zinc-300'
                        }`}
                      >
                        <span>Directional</span>
                        <span>⬆️ ➡️ ⬇️</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIconType('symbols')}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          iconType === 'symbols' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#1c1c1e] border-white/10 text-zinc-300'
                        }`}
                      >
                        <span>Status Symbols</span>
                        <span>✅ ⚠️ ❌</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIconType('flags')}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          iconType === 'flags' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#1c1c1e] border-white/10 text-zinc-300'
                        }`}
                      >
                        <span>Flags</span>
                        <span>🚩 🏳️ 🏴</span>
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={reverseIcons}
                        onChange={(e) => setReverseIcons(e.target.checked)}
                        className="rounded accent-blue-500"
                      />
                      <span>Reverse Icon Order (Lower values get green/high)</span>
                    </label>
                  </div>
                )}

                {/* Save Rule Button */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRuleId(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrentRule}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 cursor-pointer active:scale-95"
                  >
                    Save Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-zinc-400">
                <Paintbrush className="w-10 h-10 text-zinc-600" />
                <h4 className="text-sm font-bold text-white">Select a rule to edit or add a new one</h4>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Create custom cell highlights, color gradients, data bars, and icons like in Google Sheets and Excel.
                </p>
                <button
                  type="button"
                  onClick={handleAddNewRule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Formatting Rule</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#161618] flex items-center justify-between text-xs text-zinc-400">
          <span>{activeRules.filter((r) => r.enabled).length} active rule(s) applied to register</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
