import React from 'react';
import { ActiveTab, DepartmentProfile } from '../types/register';
import { Language } from '../utils/translations';
import { 
  Plus, 
  Keyboard,
  Building2, 
  Edit3, 
  Lock, 
  Palette, 
  Sun, 
  Moon,
  Table2,
  FileEdit,
  Send,
  SplitSquareVertical,
  Maximize2,
  Minimize2,
  Youtube,
  ExternalLink,
  ArrowLeftRight,
  FolderOpen,
  Info,
  Settings,
  PenTool,
} from 'lucide-react';
import { ThemeId, APP_THEMES } from '../types/theme';
import { PWAInstallButton } from './PWAInstallButton';
import { AnimatedAppIcon } from './AnimatedAppIcon';
import { useTeluguIME } from '../context/TeluguIMEContext';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  lang: Language;
  onLangToggle: () => void;
  onAddRow: () => void;
  registerTitle: string;
  themeColor?: string;
  isFitToScreen?: boolean;
  onToggleFitScreen?: () => void;
  onOpenExcelImportModal?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  rowsCount?: number;
  columnsCount?: number;
  deptProfile?: DepartmentProfile;
  onOpenDeptSettings?: () => void;
  isPinLockEnabled?: boolean;
  onLockNow?: () => void;
  onOpenSecurityModal?: () => void;
  currentTheme?: ThemeId;
  onOpenThemeModal?: () => void;
  onToggleLightDark?: () => void;
  onOpenTeluguKeyboard?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isDrawActive?: boolean;
  onToggleDraw?: () => void;
}

interface NavBadgeItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  lang,
  onLangToggle,
  onAddRow,
  registerTitle,
  themeColor = '#0a84ff',
  isFitToScreen = true,
  onToggleFitScreen,
  onOpenExcelImportModal,
  onExportExcel,
  onExportCSV,
  rowsCount = 0,
  columnsCount = 0,
  deptProfile,
  onOpenDeptSettings,
  isPinLockEnabled,
  onLockNow,
  onOpenSecurityModal,
  currentTheme = 'midnight',
  onOpenThemeModal,
  onToggleLightDark,
  onOpenTeluguKeyboard,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isDrawActive = false,
  onToggleDraw,
}) => {
  const { isTeluguEnabled, toggleTelugu } = useTeluguIME();

  const navItems: NavBadgeItem[] = [
    { 
      id: 'explorer', 
      label: lang === 'te' ? 'ఎక్స్‌ప్లోరర్ (హోమ్)' : 'Explorer (Home)', 
      shortLabel: lang === 'te' ? 'హోమ్' : 'Explorer', 
      icon: FolderOpen, 
      description: lang === 'te' ? 'సెంట్రల్ హోమ్ హబ్: లోకల్ ఫైల్స్, యాప్ స్టోర్, డిజిటల్ క్లాసెస్ & రిజిస్టర్లు' : 'Central Home Portal: Local Files, App Store, Digital Classes & Tables' 
    },
    { 
      id: 'register', 
      label: 'Data Table', 
      shortLabel: 'Table', 
      icon: Table2, 
      description: 'View, edit, filter & dynamic spreadsheet records' 
    },
    { 
      id: 'form_builder', 
      label: 'Form Builder', 
      shortLabel: 'Builder', 
      icon: FileEdit, 
      description: 'Design form fields, question types & validation' 
    },
    { 
      id: 'fill_form', 
      label: 'Fill Form', 
      shortLabel: 'Fill Form', 
      icon: Send, 
      description: 'Live respondent submission view' 
    },
    { 
      id: 'pivot', 
      label: 'Pivot Table', 
      shortLabel: 'Pivot', 
      icon: SplitSquareVertical, 
      description: 'Cross-tabulation & 2D summary matrix' 
    },
    { 
      id: 'lookup_studio', 
      label: lang === 'te' ? 'లుకప్ స్టూడియో' : 'Lookup Studio', 
      shortLabel: lang === 'te' ? 'లుకప్' : 'Lookup', 
      icon: ArrowLeftRight, 
      description: lang === 'te' ? 'మల్టీ-ఫైల్ ఎక్సెల్ లుకప్ & ప్రింట్ స్టూడియో' : 'Multi-file Excel lookup, column arranger & print studio' 
    },
    { 
      id: 'about', 
      label: lang === 'te' ? 'మా గురించి' : 'About Us', 
      shortLabel: lang === 'te' ? 'గురించి' : 'About', 
      icon: Info, 
      description: lang === 'te' ? 'లాజిక్స్‌గ్రిడ్ ఓఎస్ & న్యూజెన్ ఇ-ఎడ్యుకేషన్' : 'About LogiXGridOS, NewGen eEducation & Founder Guduru Sathish Kumar' 
    },
    { 
      id: 'settings', 
      label: lang === 'te' ? 'సెట్టింగ్స్' : 'Settings', 
      shortLabel: lang === 'te' ? 'సెట్టింగ్స్' : 'Settings', 
      icon: Settings, 
      description: lang === 'te' ? 'థీమ్ సెట్టింగ్స్, పిన్ లాక్ & తెలుగు కీబోర్డ్' : 'Theme Settings, PIN Lock Security & Telugu Keyboard' 
    },
  ];

  const isLight = currentTheme === 'light';

  return (
    <header className={`border-b backdrop-blur-2xl sticky top-0 z-30 transition-colors w-full ${
      isLight ? 'border-slate-200 bg-white/95 text-slate-900 shadow-xs' : 'border-white/10 bg-[#121214]/90 text-white'
    }`}>
      {/* Top Header Row: Branding, Navigation Badges, and Tools */}
      <div className="w-full px-3 sm:px-5 lg:px-6 h-14 flex items-center justify-between gap-2.5">
        
        {/* Left: NewGen eEducation Branding, animated red 'e', YouTube badge & App context */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          {/* Animated Red 'e' & 'excel' App Icon with 3-second round animation */}
          <AnimatedAppIcon currentTheme={currentTheme} />

          <div className="min-w-0">
            {/* Top Row: NewGen eEducation Brand Title + YouTube Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center leading-none">
                <span className={`text-sm sm:text-base font-extrabold flex items-center tracking-tight select-none ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  <span>NewGen&nbsp;</span>
                  <span className="text-red-500 font-black animate-red-e drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
                    e
                  </span>
                  <span>Education</span>
                </span>
              </div>

              {/* YouTube Channel Badge */}
              <a
                href="https://youtube.com/@gudurusathishkumar"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold transition-all group shadow-xs active:scale-95 shrink-0 ${
                  isLight
                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                    : 'bg-[#ff0000]/10 hover:bg-[#ff0000]/20 border border-[#ff0000]/30 hover:border-[#ff0000]/50 text-white'
                }`}
                title="Visit Guduru Sathish Kumar on YouTube"
              >
                <div className="w-3.5 h-3.5 rounded-xs bg-[#ff0000] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Youtube className="w-2.5 h-2.5 text-white fill-current" />
                </div>
                <span className={`font-medium hidden sm:inline ${isLight ? 'text-red-800' : 'text-zinc-200 group-hover:text-white'}`}>
                  @gudurusathishkumar
                </span>
                <ExternalLink className={`w-2.5 h-2.5 transition-colors shrink-0 ${isLight ? 'text-red-500' : 'text-zinc-400 group-hover:text-red-400'}`} />
              </a>
            </div>

            {/* Bottom Row: Tagline */}
            <div className={`text-[10px] sm:text-[11px] truncate flex items-center gap-1.5 mt-0.5 ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              <span className="truncate">
                Interactive dynamic forms & records
              </span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons & Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* PWA / APK Install Button */}
          <div className="hidden xl:inline-block">
            <PWAInstallButton variant="navbar" />
          </div>

          {/* Single Theme Badge */}
          {onOpenThemeModal && (
            <button
              type="button"
              onClick={onOpenThemeModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                  : 'bg-[#1c1c1e] hover:bg-white/10 text-zinc-200 hover:text-white border-white/10'
              }`}
              title="Change Appearance Theme (Presets & Colors)"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span 
                className="w-2 h-2 rounded-full shrink-0 hidden xs:inline-block" 
                style={{ backgroundColor: APP_THEMES.find(t => t.id === currentTheme)?.accentColor || '#0a84ff' }} 
              />
              <span className="text-[11px] font-medium">Theme</span>
            </button>
          )}

          {/* ⌨️ Direct In-Place Telugu Phonetic Keyboard Toggle */}
          <button
            type="button"
            onClick={toggleTelugu}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-xs font-['Noto_Sans_Telugu'] ${
              isTeluguEnabled
                ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40 shadow-emerald-500/20'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-[#1c1c1e] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
            }`}
            title={`Telugu Phonetic Typing is ${isTeluguEnabled ? 'ACTIVE (ON)' : 'OFF'}. Type in English phonetics anywhere to output Telugu. (Press Ctrl+G to toggle)`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${isTeluguEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[11px] font-semibold">{isTeluguEnabled ? 'తెలుగు ON' : 'తెలుగు OFF'}</span>
          </button>

          {/* ⌨️ On-Screen Visual Telugu Keypad */}
          {onOpenTeluguKeyboard && (
            <button
              type="button"
              onClick={onOpenTeluguKeyboard}
              className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-xs font-['Noto_Sans_Telugu'] ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-[#1c1c1e] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
              }`}
              title="Open Visual On-Screen Telugu Keypad & Character Palette"
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] hidden xs:inline">Keypad</span>
            </button>
          )}

          {/* 🔒 Lock & PIN Settings Badge (Prominent) */}
          {onOpenSecurityModal && (
            <button
              type="button"
              onClick={isPinLockEnabled && onLockNow ? onLockNow : onOpenSecurityModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs ${
                isPinLockEnabled
                  ? isLight
                    ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                  : 'bg-[#1c1c1e] hover:bg-[#28282c] border-white/15 text-zinc-200 hover:text-white'
              }`}
              title={isPinLockEnabled ? 'PIN Lock Active: Tap to Lock Screen Now' : 'Tap to configure PIN Lock & Protection Settings'}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-bold">
                {isPinLockEnabled ? 'Lock' : 'PIN Lock'}
              </span>
              {isPinLockEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              )}
            </button>
          )}

          {/* ✏️ MS Excel Draw Tools Screen Annotation Toggle */}
          {onToggleDraw && (
            <button
              type="button"
              onClick={onToggleDraw}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs ${
                isDrawActive
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40'
                  : isLight
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700'
                  : 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-300 hover:text-white'
              }`}
              title={
                lang === 'te'
                  ? 'MS Excel తరహా స్క్రీన్ డ్రాయింగ్ పరికరాలు (డ్రా, హైలైటర్, పెన్సిల్, ఆకారాలు & ప్రింట్/పీడీఎఫ్)'
                  : 'MS Excel-style Screen Drawing Tools (Draw on entire current screen, shapes, highlighter & Print/PDF record)'
              }
            >
              <PenTool className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] font-bold">
                {lang === 'te' ? 'డ్రా' : 'Draw'}
              </span>
              {isDrawActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Line 2 (Next Line): Dedicated Navigation Bar Row */}
      <div className={`w-full border-t px-3 sm:px-5 lg:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-[#161618]/70'
      }`}>
        <nav className={`flex items-center gap-1.5 p-1 rounded-2xl overflow-x-auto scrollbar-none ${
          isLight ? 'bg-white border border-slate-200 shadow-xs' : 'bg-[#1c1c1e] border border-white/10 shadow-inner'
        }`}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const isExplorer = item.id === 'explorer';

            let btnClasses = '';
            if (isExplorer) {
              btnClasses = isActive
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 border border-white/30 ring-2 ring-purple-400/40 font-bold'
                : isLight
                ? 'bg-gradient-to-r from-amber-100 via-rose-100 to-violet-100 hover:from-amber-200 hover:via-rose-200 hover:to-violet-200 text-slate-800 border border-rose-300 font-semibold shadow-xs'
                : 'bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-violet-600/15 hover:from-amber-500/25 hover:via-rose-500/25 hover:to-violet-600/25 text-amber-200 hover:text-white border border-rose-500/40 hover:border-rose-400/70 font-semibold shadow-xs';
            } else {
              btnClasses = isActive
                ? 'bg-[#0a84ff] text-white shadow-md shadow-blue-500/25 border border-blue-400/40 ring-1 ring-blue-400/20 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent';
            }

            return (
              <React.Fragment key={item.id}>
                <button
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap ${btnClasses}`}
                  title={item.description}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isExplorer
                        ? isActive
                          ? 'text-white'
                          : isLight
                          ? 'text-amber-600'
                          : 'text-amber-400'
                        : isActive
                        ? 'text-white'
                        : isLight
                        ? 'text-slate-500'
                        : 'text-zinc-400'
                    }`}
                  />
                  <span className="hidden xs:inline">{item.label}</span>
                  <span className="xs:hidden">{item.shortLabel}</span>
                  {isActive && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ml-0.5 animate-pulse ${
                        isExplorer ? 'bg-amber-200' : 'bg-white'
                      }`}
                    />
                  )}
                </button>
                {/* Visual divider after colorful Explorer home tab */}
                {isExplorer && (
                  <div className={`w-[1px] h-4 mx-0.5 hidden sm:block shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Right Context Info on Navigation Line: Active Records and Columns */}
        {rowsCount !== undefined && columnsCount !== undefined && (
          <div className={`hidden md:flex items-center gap-2.5 text-[11px] font-medium shrink-0 ${
            isLight ? 'text-slate-600' : 'text-zinc-400'
          }`}>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-white/5'
            }`}>
              <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Records:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>{rowsCount}</span>
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-white/5'
            }`}>
              <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Columns:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>{columnsCount}</span>
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
