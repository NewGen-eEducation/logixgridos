import React, { useState, useEffect } from 'react';
import { Register, RowData, ColumnDef, ActiveTab, DepartmentProfile } from './types/register';
import { sampleRegisters } from './data/sampleRegisters';
import { Language, translations } from './utils/translations';
import { exportToCSV } from './utils/calculations';
import { exportRegisterToExcelOrCSV } from './utils/exportUtils';
import { Navbar } from './components/Navbar';
import { RegisterSelector } from './components/RegisterSelector';
import { RegisterTable } from './components/RegisterTable';
import { FormBuilder } from './components/FormBuilder';
import { FillForm } from './components/FillForm';
import { ColumnModal } from './components/ColumnModal';
import { RowModal } from './components/RowModal';
import { PivotTable } from './components/PivotTable';
import { ExcelLookupStudio } from './components/ExcelLookupStudio';
import { ExplorerTab } from './components/ExplorerTab';
import { AboutUs } from './components/AboutUs';
import { SettingsTab } from './components/SettingsTab';
import { ImportExportModal } from './components/ImportExportModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DirectAPKInstallBanner } from './components/DirectAPKInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { defaultDepartmentProfile } from './components/DepartmentSettingsModal';
import { PinSecurityConfig, DEFAULT_PIN_SECURITY_CONFIG } from './types/security';
import { LockScreen } from './components/LockScreen';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { ThemeId, APP_THEMES } from './types/theme';
import { idbGetItemSync, idbSetItem, idbRemoveItem, isIDBHydrated, initIndexedDB } from './utils/indexedDBStorage';
import { ThemeModal } from './components/ThemeModal';
import { TeluguKeyboardModal } from './components/TeluguKeyboardModal';
import { ScreenDrawOverlay } from './components/ScreenDrawOverlay';
import { useRegisterHistory } from './hooks/useRegisterHistory';
import { Undo2, Redo2, Check } from 'lucide-react';

const STORAGE_KEY_REGISTERS = 'dyn_registers_data_v3';
const STORAGE_KEY_ACTIVE_ID = 'dyn_active_reg_id_v3';
const STORAGE_KEY_LANG = 'dyn_lang_pref_v3';
const STORAGE_KEY_FIT_SCREEN = 'dyn_fit_screen_v3';
const STORAGE_KEY_DEPT_PROFILE = 'dyn_dept_profile_v3';
const STORAGE_KEY_PIN_SECURITY = 'dyn_pin_security_v3';
const STORAGE_KEY_THEME = 'dyn_theme_pref_v3';

function MainApp() {
  // State: Language preference
  const [lang, setLang] = useState<Language>(() => {
    const saved = idbGetItemSync<string>(STORAGE_KEY_LANG);
    return saved === 'te' ? 'te' : 'en';
  });

  // State: Auto-fit to screen size (default true for full-screen data analysis)
  const [isFitToScreen, setIsFitToScreen] = useState<boolean>(() => {
    const saved = idbGetItemSync<string | boolean>(STORAGE_KEY_FIT_SCREEN);
    return saved !== null && saved !== undefined ? String(saved) === 'true' : true;
  });

  // State: All Registers / Forms
  const [registers, setRegisters] = useState<Register[]>(() => {
    try {
      const saved = idbGetItemSync<Register[] | string>(STORAGE_KEY_REGISTERS);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return sampleRegisters;
  });

  // State: Active Register ID
  const [activeRegId, setActiveRegId] = useState<string>(() => {
    const saved = idbGetItemSync<string>(STORAGE_KEY_ACTIVE_ID);
    if (saved && registers.some((r) => r.id === saved)) return saved;
    return registers[0]?.id || sampleRegisters[0].id;
  });

  // State: Active View Tab (Explorer is the default Home Page)
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorer');

  // Modal States
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<RowData | null>(null);

  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showTeluguKeyboard, setShowTeluguKeyboard] = useState(false);

  // State: Theme preference
  const [theme, setTheme] = useState<ThemeId>(() => {
    try {
      const saved = idbGetItemSync<ThemeId>(STORAGE_KEY_THEME);
      if (saved && APP_THEMES.some((t) => t.id === saved)) return saved as ThemeId;
    } catch {
      // ignore
    }
    return 'midnight';
  });

  // Apply data-theme attribute on document root and body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    idbSetItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Toggle between Dark and Light mode
  const handleToggleLightDark = () => {
    setTheme((prev) => (prev === 'light' ? 'midnight' : 'light'));
  };

  // State: Department Profile (blank / disabled)
  const [deptProfile, setDeptProfile] = useState<DepartmentProfile>(() => {
    try {
      idbRemoveItem(STORAGE_KEY_DEPT_PROFILE);
    } catch {
      // ignore
    }
    return defaultDepartmentProfile;
  });

  // State: PIN Lock Protection & Security Settings
  const [securityConfig, setSecurityConfig] = useState<PinSecurityConfig>(() => {
    try {
      const saved = idbGetItemSync<PinSecurityConfig | string>(STORAGE_KEY_PIN_SECURITY);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (parsed && typeof parsed.pin === 'string') return { ...DEFAULT_PIN_SECURITY_CONFIG, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PIN_SECURITY_CONFIG;
  });

  // State: App Lock status (if enabled, user starts locked)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const saved = idbGetItemSync<PinSecurityConfig | string>(STORAGE_KEY_PIN_SECURITY);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (parsed && parsed.isEnabled === true) return true;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isDrawActive, setIsDrawActive] = useState(false);

  const handleSaveSecurityConfig = (updated: PinSecurityConfig) => {
    setSecurityConfig(updated);
    try {
      idbSetItem(STORAGE_KEY_PIN_SECURITY, updated);
    } catch {
      // ignore
    }
    if (!updated.isEnabled) {
      setIsLocked(false);
    }
  };

  const handleLockNow = () => {
    if (securityConfig.isEnabled) {
      setIsLocked(true);
    } else {
      setShowSecurityModal(true);
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  // Open spreadsheet as brand new Register (like File -> Open in Excel / Sheets)
  const handleOpenAsNewRegister = (newRegister: Register) => {
    setRegisters((prev) => [...prev, newRegister]);
    setActiveRegId(newRegister.id);
    setActiveTab('register');
  };

  // Open multiple spreadsheet sheets simultaneously
  const handleOpenMultipleRegisters = (newRegisters: Register[]) => {
    if (newRegisters.length === 0) return;
    setRegisters((prev) => [...prev, ...newRegisters]);
    setActiveRegId(newRegisters[0].id);
    setActiveTab('register');
  };

  // Append spreadsheet data to current register (adds any new dynamic columns and rows)
  const handleAppendSpreadsheetToCurrent = (importedColumns: ColumnDef[], importedRows: RowData[]) => {
    updateCurrentRegister((reg) => {
      const existingIds = new Set(reg.columns.map((c) => c.id));
      const existingNames = new Set(reg.columns.map((c) => c.name.toLowerCase()));

      const newColsToAdd = importedColumns.filter(
        (c) => !existingIds.has(c.id) && !existingNames.has(c.name.toLowerCase())
      );

      return {
        ...reg,
        columns: [...reg.columns, ...newColsToAdd],
        rows: [...reg.rows, ...importedRows],
      };
    });
  };

  // Sync with IndexedDB
  useEffect(() => {
    idbSetItem(STORAGE_KEY_REGISTERS, registers);
  }, [registers]);

  useEffect(() => {
    idbSetItem(STORAGE_KEY_ACTIVE_ID, activeRegId);
  }, [activeRegId]);

  useEffect(() => {
    idbSetItem(STORAGE_KEY_LANG, lang);
  }, [lang]);

  useEffect(() => {
    idbSetItem(STORAGE_KEY_FIT_SCREEN, String(isFitToScreen));
  }, [isFitToScreen]);

  // Current active register object
  const activeRegister = registers.find((r) => r.id === activeRegId) || registers[0];

  // History tracking for Undo/Redo & Universal Shortcuts
  const {
    updateCurrentRegister,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    toast,
  } = useRegisterHistory({
    registers,
    setRegisters,
    activeRegId,
  });

  // Row CRUD
  const handleOpenAddRow = () => {
    setEditingRowIndex(null);
    setEditingRowData(null);
    setShowRowModal(true);
  };

  const handleOpenEditRow = (row: RowData, rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    setEditingRowData(row);
    setShowRowModal(true);
  };

  const handleSaveRow = (rowData: RowData, targetIndex?: number | null) => {
    updateCurrentRegister((reg) => {
      const rows = [...reg.rows];
      if (targetIndex !== undefined && targetIndex !== null && targetIndex >= 0) {
        rows[targetIndex] = rowData;
      } else {
        rows.push(rowData);
      }
      return { ...reg, rows };
    });
    setShowRowModal(false);
  };

  // Google Forms submission directly records into register table
  const handleFormSubmitResponse = (submittedRow: RowData) => {
    updateCurrentRegister((reg) => ({
      ...reg,
      rows: [submittedRow, ...reg.rows],
    }));
  };

  const handleDeleteRow = (rowIndex: number) => {
    updateCurrentRegister((reg) => ({
      ...reg,
      rows: reg.rows.filter((_, idx) => idx !== rowIndex),
    }));
  };

  const handleDuplicateRow = (rowIndex: number) => {
    updateCurrentRegister((reg) => {
      const target = reg.rows[rowIndex];
      if (!target) return reg;
      const copy = { ...target };
      if (copy['roll_no']) copy['roll_no'] = `${copy['roll_no']}-COPY`;
      if (copy['voucher_no']) copy['voucher_no'] = `${copy['voucher_no']}-COPY`;
      if (copy['asset_id']) copy['asset_id'] = `${copy['asset_id']}-COPY`;

      const rows = [...reg.rows];
      rows.splice(rowIndex + 1, 0, copy);
      return { ...reg, rows };
    });
  };

  const handleBulkDelete = (indices: number[]) => {
    updateCurrentRegister((reg) => ({
      ...reg,
      rows: reg.rows.filter((_, idx) => !indices.includes(idx)),
    }));
  };

  const handleClearAllRows = () => {
    updateCurrentRegister((reg) => ({
      ...reg,
      rows: [],
    }));
  };

  const handleDeleteRegister = (regId: string) => {
    if (registers.length <= 1) {
      const defaultReg: Register = {
        id: `reg-${Date.now()}`,
        title: 'New Response Form & Table',
        description: 'New response form and data table',
        category: 'custom',
        columns: [
          { id: 'timestamp', name: 'Timestamp', type: 'date', width: 140 },
          { id: 'name', name: 'Respondent Name', type: 'text', required: true, width: 180 },
          { id: 'category', name: 'Category', type: 'select', options: ['General', 'Support', 'Feedback'], width: 150 },
          { id: 'score', name: 'Score / Value', type: 'number', width: 140 },
        ],
        rows: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        themeColor: '#673ab7',
      };
      setRegisters([defaultReg]);
      setActiveRegId(defaultReg.id);
      return;
    }

    const remaining = registers.filter((r) => r.id !== regId);
    setRegisters(remaining);
    if (activeRegId === regId) {
      setActiveRegId(remaining[0].id);
    }
  };

  // Rename Register (Title, Telugu Title & Description)
  const handleRenameRegister = (id: string, newTitle: string, newTitleTe?: string, newDesc?: string) => {
    setRegisters((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            title: newTitle.trim(),
            titleTe: newTitleTe ? newTitleTe.trim() : r.titleTe,
            description: newDesc !== undefined ? newDesc.trim() : r.description,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return r;
      })
    );
  };

  const handleBulkDuplicate = (indices: number[]) => {
    updateCurrentRegister((reg) => {
      const toDuplicate = reg.rows
        .filter((_, idx) => indices.includes(idx))
        .map((r) => ({ ...r }));
      return {
        ...reg,
        rows: [...reg.rows, ...toDuplicate],
      };
    });
  };

  const handleInlineUpdateCell = (rowIndex: number, columnId: string, value: any) => {
    updateCurrentRegister((reg) => {
      const rows = [...reg.rows];
      if (rows[rowIndex]) {
        rows[rowIndex] = {
          ...rows[rowIndex],
          [columnId]: value,
        };
      }
      return { ...reg, rows };
    });
  };

  // Column Schema Update
  const handleSaveColumns = (updatedColumns: ColumnDef[]) => {
    updateCurrentRegister((reg) => ({
      ...reg,
      columns: updatedColumns,
    }));
  };

  // Create new Register / Form
  const handleCreateRegister = (
    title: string,
    desc: string,
    category: 'education' | 'finance' | 'inventory' | 'custom'
  ) => {
    let defaultCols: ColumnDef[] = [
      { id: 'timestamp', name: 'Timestamp', type: 'date', width: 140 },
      { id: 'name', name: 'Full Name', type: 'text', required: true, width: 180 },
      { id: 'category', name: 'Category', type: 'select', options: ['Option 1', 'Option 2', 'Option 3'], width: 160 },
      { id: 'quantity', name: 'Quantity / Units', type: 'number', width: 140, validation: { enabled: true, category: 'number', operator: 'greater_than', value: 0, customErrorMessage: 'Must be greater than 0' } },
      { id: 'rating', name: 'Satisfaction Rating', type: 'linear_scale', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Poor', scaleMaxLabel: 'Excellent', width: 160 },
    ];

    if (category === 'education') {
      defaultCols = [
        { id: 'timestamp', name: 'Timestamp', type: 'date', width: 140 },
        { id: 'roll_no', name: 'Roll Number', type: 'text', required: true, width: 130 },
        { id: 'student_name', name: 'Student Name', type: 'text', required: true, width: 180 },
        { id: 'email', name: 'Email Address', type: 'text', required: true, width: 190, validation: { enabled: true, category: 'text', operator: 'email', customErrorMessage: 'Valid email required' } },
        { id: 'attendance_pct', name: 'Attendance %', type: 'number', unit: '%', width: 130, validation: { enabled: true, category: 'number', operator: 'between', value: 0, secondValue: 100, customErrorMessage: 'Between 0% and 100%' } },
        { id: 'marks_scored', name: 'Exam Marks', type: 'number', width: 130 },
      ];
    } else if (category === 'finance') {
      defaultCols = [
        { id: 'timestamp', name: 'Timestamp', type: 'date', width: 140 },
        { id: 'voucher_no', name: 'Voucher No', type: 'text', required: true, width: 130 },
        { id: 'description', name: 'Particulars', type: 'paragraph', required: true, width: 220 },
        { id: 'credit', name: 'Inflow (₹)', type: 'currency', unit: '₹', width: 140, validation: { enabled: true, category: 'number', operator: 'greater_than_or_equal', value: 0, customErrorMessage: 'Cannot be negative' } },
        { id: 'debit', name: 'Outflow (₹)', type: 'currency', unit: '₹', width: 140, validation: { enabled: true, category: 'number', operator: 'greater_than_or_equal', value: 0, customErrorMessage: 'Cannot be negative' } },
        { id: 'mode', name: 'Payment Mode', type: 'multiple_choice', options: ['Cash', 'Online Transfer', 'Cheque'], width: 150 },
      ];
    }

    const newRegister: Register = {
      id: `reg-${Date.now()}`,
      title,
      description: desc || 'Custom form & responses table',
      category,
      columns: defaultCols,
      rows: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      themeColor: '#673ab7',
    };

    setRegisters([...registers, newRegister]);
    setActiveRegId(newRegister.id);
  };

  // Reset to default samples
  const handleResetDefaults = () => {
    setRegisters(sampleRegisters);
    setActiveRegId(sampleRegisters[0].id);
    idbRemoveItem(STORAGE_KEY_REGISTERS);
  };

  // Import rows
  const handleImportRows = (importedRows: RowData[]) => {
    updateCurrentRegister((reg) => ({
      ...reg,
      rows: [...reg.rows, ...importedRows],
    }));
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!activeRegister) return;
    exportToCSV({
      columns: activeRegister.columns,
      rows: activeRegister.rows,
      title: activeRegister.title,
    });
  };

  const registerTitle = (lang === 'te' && activeRegister.titleTe) ? activeRegister.titleTe : activeRegister.title;

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col font-sans text-zinc-100 w-full relative">
      {/* Top App Bar with Navigation Badges and Utility Actions */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        onLangToggle={() => setLang((prev) => (prev === 'en' ? 'te' : 'en'))}
        onAddRow={handleOpenAddRow}
        registerTitle={registerTitle}
        themeColor={activeRegister.themeColor}
        isFitToScreen={isFitToScreen}
        onToggleFitScreen={() => setIsFitToScreen((prev) => !prev)}
        onOpenExcelImportModal={() => setShowExcelImportModal(true)}
        onExportExcel={() => exportRegisterToExcelOrCSV({ register: activeRegister, format: 'xlsx', deptProfile })}
        onExportCSV={() => exportRegisterToExcelOrCSV({ register: activeRegister, format: 'csv', deptProfile })}
        rowsCount={activeRegister.rows.length}
        columnsCount={activeRegister.columns.length}
        deptProfile={deptProfile}
        isPinLockEnabled={securityConfig.isEnabled}
        onLockNow={handleLockNow}
        onOpenSecurityModal={() => setShowSecurityModal(true)}
        currentTheme={theme}
        onOpenThemeModal={() => setShowThemeModal(true)}
        onToggleLightDark={handleToggleLightDark}
        onOpenTeluguKeyboard={() => setShowTeluguKeyboard(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        isDrawActive={isDrawActive}
        onToggleDraw={() => setIsDrawActive((prev) => !prev)}
      />

        {/* Direct APK / Offline Install Notification & Action Banner */}
        <DirectAPKInstallBanner />

        {/* Searchable Dropdown for All Tables & Uploaded Excel Sheets (hidden on About, Explorer & Settings) */}
        {activeTab !== 'about' && activeTab !== 'explorer' && activeTab !== 'settings' && (
          <RegisterSelector
            registers={registers}
            activeRegisterId={activeRegId}
            onSelectRegister={(id) => {
              setActiveRegId(id);
              setActiveTab('register');
            }}
            onCreateRegister={handleCreateRegister}
            onDeleteRegister={handleDeleteRegister}
            onRenameRegister={handleRenameRegister}
            onResetDefaults={handleResetDefaults}
            onOpenExcelImportModal={() => setShowExcelImportModal(true)}
            onExportExcel={() => exportRegisterToExcelOrCSV({ register: activeRegister, format: 'xlsx', deptProfile })}
            onExportCSV={() => exportRegisterToExcelOrCSV({ register: activeRegister, format: 'csv', deptProfile })}
            onUploadExcelDirect={handleOpenMultipleRegisters}
            onOpenSheet={() => setActiveTab('register')}
            lang={lang}
            isFitToScreen={isFitToScreen}
          />
        )}

        {/* Main Workspace Body - auto-fitted to screen with smooth responsive paddings */}
        <main className="flex-1 w-full px-2.5 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 pb-12 transition-all">
        {/* 1. Responses Table View */}
        {activeTab === 'register' && (
          <RegisterTable
            register={activeRegister}
            lang={lang}
            onAddRow={handleOpenAddRow}
            onEditRow={handleOpenEditRow}
            onDeleteRow={handleDeleteRow}
            onDuplicateRow={handleDuplicateRow}
            onBulkDelete={handleBulkDelete}
            onBulkDuplicate={handleBulkDuplicate}
            onClearAllRows={handleClearAllRows}
            onDeleteRegister={() => handleDeleteRegister(activeRegId)}
            onInlineUpdateCell={handleInlineUpdateCell}
            onOpenColumnModal={() => setShowColumnModal(true)}
            onOpenImportModal={() => setShowImportExportModal(true)}
            onOpenExcelImportModal={() => setShowExcelImportModal(true)}
            onExportCSV={handleExportCSV}
            onNavigateToFillForm={() => setActiveTab('fill_form')}
            onNavigateToBuilder={() => setActiveTab('form_builder')}
            onNavigateToPivot={() => setActiveTab('pivot')}
            deptProfile={deptProfile}
            onUpdateRegister={updateCurrentRegister}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            undoCount={undoCount}
            redoCount={redoCount}
          />
        )}

        {/* 2. Google Forms Builder View */}
        {activeTab === 'form_builder' && (
          <FormBuilder
            register={activeRegister}
            onUpdateRegister={updateCurrentRegister}
            onDeleteRow={handleDeleteRow}
            onClearAllRows={handleClearAllRows}
            onDeleteRegister={handleDeleteRegister}
            onNavigateToFillForm={() => setActiveTab('fill_form')}
            onNavigateToTable={() => setActiveTab('register')}
            lang={lang}
          />
        )}

        {/* 3. Live Google Forms Respondent Fill Mode */}
        {activeTab === 'fill_form' && (
          <FillForm
            register={activeRegister}
            onSubmitResponse={handleFormSubmitResponse}
            onNavigateToBuilder={() => setActiveTab('form_builder')}
            onNavigateToTable={() => setActiveTab('register')}
            lang={lang}
            deptProfile={deptProfile}
          />
        )}

        {/* 4. Pivot Table Cross-Tabulation View */}
        {activeTab === 'pivot' && (
          <PivotTable 
            register={activeRegister} 
            onUpdateRegister={updateCurrentRegister}
            lang={lang} 
            deptProfile={deptProfile}
          />
        )}

        {/* 5. Excel Multi-File Lookup, Column Arranger & Print Studio */}
        {activeTab === 'lookup_studio' && (
          <ExcelLookupStudio
            currentTheme={theme}
            deptProfile={deptProfile}
            lang={lang}
            activeRegister={activeRegister}
            registers={registers}
            onImportAsRegister={handleOpenAsNewRegister}
          />
        )}

        {/* 6. Explorer: File & Web App Manager */}
        {activeTab === 'explorer' && (
          <ExplorerTab
            lang={lang}
            registers={registers}
            activeRegId={activeRegId}
            currentTheme={theme}
            isDrawActive={isDrawActive}
            onToggleDraw={() => setIsDrawActive((prev) => !prev)}
            onSelectRegister={(id) => {
              setActiveRegId(id);
              setActiveTab('register');
            }}
            onImportRegister={handleOpenAsNewRegister}
            onRenameRegister={handleRenameRegister}
            onNavigateToTab={setActiveTab}
            onNavigateToTable={() => setActiveTab('register')}
          />
        )}

        {/* 7. About Us: Founder Story, AnalytixGrid & NewGen eEducation Ecosystem */}
        {activeTab === 'about' && (
          <AboutUs
            lang={lang}
            currentTheme={theme}
            onNavigateToTable={() => setActiveTab('register')}
            onNavigateToLookup={() => setActiveTab('lookup_studio')}
            onNavigateToExplorer={() => setActiveTab('explorer')}
          />
        )}

        {/* 8. Settings Hub: Theme, PIN Lock, Telugu Keyboard & Preferences */}
        {activeTab === 'settings' && (
          <SettingsTab
            currentTheme={theme}
            onSelectTheme={setTheme}
            securityConfig={securityConfig}
            onSaveSecurityConfig={handleSaveSecurityConfig}
            onLockNow={handleLockNow}
            onOpenTeluguKeypadModal={() => setShowTeluguKeyboard(true)}
            lang={lang}
            onLangToggle={() => setLang((prev) => (prev === 'en' ? 'te' : 'en'))}
            isFitToScreen={isFitToScreen}
            onToggleFitScreen={() => setIsFitToScreen((prev) => !prev)}
          />
        )}
      </main>

      {/* Simple Single-Line Footer */}
      <footer className={`border-t px-4 py-2 text-center text-[11px] select-none shrink-0 z-10 transition-colors ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-500'
          : 'border-white/10 bg-[#121214] text-zinc-400'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className={`font-semibold flex items-center ${theme === 'light' ? 'text-slate-800' : 'text-zinc-200'}`}>
            NewGen&nbsp;<span className="text-red-500 font-bold animate-red-e">e</span>Education
          </span>
          <span className={theme === 'light' ? 'text-slate-300' : 'text-zinc-600'}>•</span>
          <span>
            Developer: <a href="https://youtube.com/@gudurusathishkumar" target="_blank" rel="noopener noreferrer" className={`font-medium hover:underline inline-flex items-center gap-1 ${theme === 'light' ? 'text-slate-700 hover:text-red-600' : 'text-zinc-300 hover:text-white'}`}>Guduru Sathish Kumar <span className="text-red-500 text-[10px]">(youtube.com/@gudurusathishkumar)</span></a>
          </span>
        </div>
      </footer>

      {/* Modals */}
      {showRowModal && (
        <RowModal
          columns={activeRegister.columns}
          initialData={editingRowData}
          rowIndex={editingRowIndex}
          onSave={handleSaveRow}
          onClose={() => setShowRowModal(false)}
          lang={lang}
        />
      )}

      {showColumnModal && (
        <ColumnModal
          columns={activeRegister.columns}
          onSaveColumns={handleSaveColumns}
          onClose={() => setShowColumnModal(false)}
          lang={lang}
        />
      )}

      {showImportExportModal && (
        <ImportExportModal
          columns={activeRegister.columns}
          rows={activeRegister.rows}
          registerTitle={activeRegister.title}
          onImportRows={handleImportRows}
          onClose={() => setShowImportExportModal(false)}
          lang={lang}
        />
      )}

      {showExcelImportModal && (
        <ExcelImportModal
          currentRegisterTitle={activeRegister.title}
          onOpenAsNewRegister={handleOpenAsNewRegister}
          onOpenMultipleRegisters={handleOpenMultipleRegisters}
          onAppendToCurrent={handleAppendSpreadsheetToCurrent}
          onClose={() => setShowExcelImportModal(false)}
          lang={lang}
        />
      )}

      {/* Department Name, Address & Print Header Customization Modal */}
      {/* PIN Lock Protection & Security Settings Modal */}
      {showSecurityModal && (
        <SecuritySettingsModal
          config={securityConfig}
          onSaveConfig={handleSaveSecurityConfig}
          onLockNow={handleLockNow}
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {/* Themes & Appearance Selection Modal */}
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentTheme={theme}
        onSelectTheme={(newTheme) => setTheme(newTheme)}
        lang={lang}
      />

      {/* Telugu Phonetic Keyboard & Transliteration Modal */}
      <TeluguKeyboardModal
        isOpen={showTeluguKeyboard}
        onClose={() => setShowTeluguKeyboard(false)}
      />

      {/* MS Excel Screen Drawing Tools & Overlay */}
      <ScreenDrawOverlay
        isOpen={isDrawActive}
        onClose={() => setIsDrawActive(false)}
        lang={lang}
        currentTheme={theme}
        registerTitle={registerTitle}
        activeTab={activeTab}
        activeTabKey={`${activeTab}${activeTab === 'register' ? `_${activeRegId}` : ''}`}
      />

      {/* Full-Screen PIN Lock Protection Screen */}
      {isLocked && securityConfig.isEnabled && (
        <LockScreen
          config={securityConfig}
          onUnlock={handleUnlock}
          onOpenSecurityModal={() => setShowSecurityModal(true)}
        />
      )}

      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Floating Undo/Redo Action Toast Notification */}
      {toast && (
        <div 
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-900/95 border border-white/20 text-white text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {toast.type === 'undo' ? (
            <div className="w-5 h-5 rounded-lg bg-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <Undo2 className="w-3.5 h-3.5" />
            </div>
          ) : toast.type === 'redo' ? (
            <div className="w-5 h-5 rounded-lg bg-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
              <Redo2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-lg bg-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
          )}
          <span>{toast.message}</span>
          <span className="text-[10px] text-zinc-400 font-mono border border-white/10 px-1.5 py-0.5 rounded-md bg-black/40">
            {toast.type === 'undo' ? 'Ctrl+Z' : 'Ctrl+Y'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(() => isIDBHydrated());

  useEffect(() => {
    if (!isReady) {
      initIndexedDB().then(() => {
        setIsReady(true);
      });
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0e0e12] text-white flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">AnalytixGrid</div>
        <div className="text-xs text-zinc-500">Connecting IndexedDB Storage Engine...</div>
      </div>
    );
  }

  return <MainApp />;
}
