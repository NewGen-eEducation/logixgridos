import React, { useState } from 'react';
import { 
  Youtube, 
  ExternalLink, 
  ShieldCheck, 
  Trophy, 
  Code2, 
  Zap, 
  BookOpen, 
  Brain, 
  Sparkles, 
  ArrowRight, 
  GraduationCap, 
  LayoutGrid, 
  MonitorPlay, 
  Compass, 
  CheckCircle2,
  Table2,
  ArrowLeftRight,
  Maximize2,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { Language } from '../utils/translations';
import { ThemeId } from '../types/theme';

interface AboutUsProps {
  lang?: Language;
  onNavigateToTable?: () => void;
  onNavigateToLookup?: () => void;
  onNavigateToExplorer?: () => void;
  currentTheme?: ThemeId;
}

export const AboutUs: React.FC<AboutUsProps> = ({
  lang = 'en',
  onNavigateToTable,
  onNavigateToLookup,
  onNavigateToExplorer,
  currentTheme,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const isLight = currentTheme === 'light' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 animate-fade-in-scale">
      
      {/* =========================================================================
          HERO BANNER: Welcome to LogiXGridOS & NewGen eEducation
          ========================================================================= */}
      <section className={`relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 transition-all ${
        isLight
          ? 'bg-gradient-to-br from-red-50/90 via-white to-rose-50/70 border border-red-200/80 shadow-xl text-slate-900'
          : 'bg-radial from-[#25080c] via-[#140608] to-[#0c0406] border border-red-500/30 shadow-2xl shadow-red-950/40 text-white'
      }`}>
        {/* Subtle decorative glowing mesh */}
        <div className={`absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-red-300/20' : 'bg-red-600/15'
        }`} />
        <div className={`absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-blue-300/15' : 'bg-blue-600/10'
        }`} />

        <div className="relative z-10 space-y-6">
          {/* Brand Row with Official LogiXGridOS App Icon */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border shadow-lg shrink-0 transition-transform hover:scale-105 ${
              isLight ? 'border-red-300 bg-white shadow-red-200/50' : 'border-red-500/50 bg-black shadow-red-950/60'
            }`}>
              <img
                src="/assets/aistudio/final_9ab59f78.jpeg"
                alt="LogiXGridOS Official Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl sm:text-2xl font-black tracking-tight flex items-center ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Logi<span className="text-red-500">X</span>Grid<span className="text-red-500">OS</span>
              </span>
              <span className={`text-lg ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>✕</span>
              <span className={`text-lg sm:text-xl font-bold flex items-center ${
                isLight ? 'text-slate-900' : 'text-zinc-100'
              }`}>
                NewGen&nbsp;<span className="text-red-500 font-extrabold animate-red-e">e</span>Education
              </span>
            </div>
            
            <a
              href="https://youtube.com/@gudurusathishkumar"
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition-all group active:scale-95 shadow-sm ${
                isLight
                  ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                  : 'bg-[#ff0000]/15 hover:bg-[#ff0000]/25 border border-[#ff0000]/40 text-red-200 hover:text-white'
              }`}
              title="Visit official YouTube channel"
            >
              <Youtube className="w-4 h-4 text-red-500 fill-current group-hover:scale-110 transition-transform" />
              <span>@gudurusathishkumar</span>
              <ExternalLink className={`w-3 h-3 transition-colors ${isLight ? 'text-red-500' : 'text-red-400 opacity-70 group-hover:opacity-100'}`} />
            </a>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              About <span className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">Us</span>
            </h1>
            <p className={`text-base sm:text-lg leading-relaxed max-w-4xl font-normal ${
              isLight ? 'text-slate-700' : 'text-zinc-300'
            }`}>
              Welcome to <strong className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>LogiXGridOS</strong> and <strong className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>NewGen eEducation</strong>—your ultimate digital ecosystem for next-generation learning and effortless data intelligence. Whether you are a student trying to master complex concepts or a professional looking to analyze data without wrestling with messy formulas, we are here to simplify your journey.
            </p>
          </div>

          {/* Mission Callout Card */}
          <div className={`relative rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-md border ${
            isLight
              ? 'bg-white/95 border-slate-200 shadow-sm text-slate-800'
              : 'bg-[#1c1c1e]/80 border-white/10 text-zinc-200'
          }`}>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
              isLight
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-gradient-to-br from-red-500/20 to-amber-500/20 border-red-500/30 text-red-400'
            }`}>
              <Sparkles className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-bold text-red-500">Our Core Mission</span>
              <p className={`text-sm sm:text-base font-medium leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                Our ecosystem brings together powerful platforms driven by a single mission: <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>to replace stress and confusion with clarity and smart solutions.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOUNDER SPOTLIGHT: Guduru Sathish Kumar
          ========================================================================= */}
      <section className={`relative rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden border transition-all ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-md'
          : 'bg-[#121214] border-white/10 text-white'
      }`}>
        {/* Glow corner */}
        <div className={`absolute top-0 right-0 w-96 h-96 pointer-events-none ${
          isLight ? 'bg-gradient-to-bl from-blue-200/20 via-transparent to-transparent' : 'bg-gradient-to-bl from-blue-500/10 via-transparent to-transparent'
        }`} />

        <div className="relative z-10 space-y-8">
          
          {/* Founder Header Row */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-zinc-900 p-0.5 shadow-lg shadow-red-950/60 flex items-center justify-center shrink-0">
                <div className={`w-full h-full rounded-[14px] flex items-center justify-center font-black text-xl ${
                  isLight ? 'bg-white text-red-600' : 'bg-[#1a0a0f] text-red-400'
                }`}>
                  GSK
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍💼</span>
                  <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    Meet Our Founder: <span className="text-red-500">Guduru Sathish Kumar</span>
                  </h2>
                </div>
                <p className={`text-xs sm:text-sm mt-0.5 font-medium ${
                  isLight ? 'text-slate-500' : 'text-zinc-400'
                }`}>
                  Proven Achiever · Full-Stack Innovator · Visionary Digital Educator
                </p>
              </div>
            </div>

            <a
              href="https://youtube.com/@gudurusathishkumar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 self-start sm:self-center active:scale-95 cursor-pointer"
            >
              <Youtube className="w-4 h-4 fill-current" />
              <span>Connect on YouTube</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>

          {/* Founder Bio Paragraph */}
          <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${
            isLight ? 'text-slate-700' : 'text-zinc-300'
          }`}>
            <p>
              The driving force behind this ecosystem is <strong className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Guduru Sathish Kumar</strong>, a proven achiever, developer, and educator. Sathish’s journey is defined by a relentless pursuit of excellence and a passion for building practical solutions.
            </p>
          </div>

          {/* Three Key Pillar Cards for Founder */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Card 1: Proven Government Track Record */}
            <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all group ${
              isLight
                ? 'bg-slate-50 border-slate-200 hover:bg-white hover:border-red-400 shadow-xs'
                : 'bg-[#1c1c1e] border-white/10 hover:border-red-500/40'
            }`}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${
                isLight ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Proven Government Track Record
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  He successfully cracked multiple highly competitive exams and secured prestigious government roles:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-[#252528] border-white/5 text-zinc-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Police</span>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-[#252528] border-white/5 text-zinc-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Panchayat Secy.</span>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-[#252528] border-white/5 text-zinc-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>VRO</span>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-[#252528] border-white/5 text-zinc-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Junior Assistant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: State Ranker */}
            <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all group ${
              isLight
                ? 'bg-slate-50 border-slate-200 hover:bg-white hover:border-amber-400 shadow-xs'
                : 'bg-[#1c1c1e] border-white/10 hover:border-amber-500/40'
            }`}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <Trophy className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  State Ranker
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  His deep conceptual understanding of subjects earned him top <strong className={isLight ? 'text-amber-700 font-semibold' : 'text-amber-300 font-semibold'}>State Ranks</strong> in competitive examinations, validating a learning philosophy built on fundamental first principles rather than rote cramming.
                </p>
              </div>
            </div>

            {/* Card 3: Innovator & Developer */}
            <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all group ${
              isLight
                ? 'bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400 shadow-xs'
                : 'bg-[#1c1c1e] border-white/10 hover:border-blue-500/40'
            }`}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${
                isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                <Code2 className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Innovator & Developer
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Moving beyond traditional career paths, Sathish channeled his technical expertise to build a <strong className={isLight ? 'text-blue-700 font-semibold' : 'text-blue-300 font-semibold'}>custom, personal App Store</strong>—a unique suite of self-developed applications designed to address multiple concepts useful for a human's daily needs.
                </p>
              </div>
            </div>

          </div>

          {/* Quote / Summary */}
          <div className={`p-4 sm:p-5 rounded-2xl border text-sm sm:text-base font-medium italic ${
            isLight
              ? 'bg-red-50/70 border-red-200 text-slate-800'
              : 'bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900/60 border-red-500/20 text-zinc-200'
          }`}>
            "Leveraging his vast experience in cracking exams and building software, Sathish founded this ecosystem to change how the world learns and handles data."
          </div>

          {/* =========================================================================
              FOUNDER JOURNEY & CREDENTIALS INFOGRAPHIC
              ========================================================================= */}
          <div className={`mt-8 pt-8 border-t space-y-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <h3 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    From Classroom to Community: <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>A Journey of Knowledge & Service</span>
                  </h3>
                </div>
                <p className={`text-xs sm:text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Official infographic chronicle: TSPSC Success, Public Service, Learning & Research Fields
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLightboxOpen(true);
                    setZoomLevel(1);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isLight
                      ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900 shadow-xs'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Click to Enlarge / పూర్తి రిజల్యూషన్</span>
                </button>

                {onNavigateToExplorer && (
                  <button
                    type="button"
                    onClick={onNavigateToExplorer}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      isLight
                        ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                        : 'bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 hover:text-white'
                    }`}
                  >
                    <Youtube className="w-3.5 h-3.5 text-red-500 fill-current" />
                    <span>Digital Classes</span>
                  </button>
                )}
              </div>
            </div>

            {/* Infographic Image Preview Card */}
            <div
              onClick={() => {
                setIsLightboxOpen(true);
                setZoomLevel(1);
              }}
              className={`relative group cursor-pointer overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ${
                isLight ? 'border-amber-300 bg-white hover:border-amber-500' : 'border-amber-500/30 bg-[#0e0a0d] hover:border-amber-400'
              }`}
            >
              <img
                src="/assets/aistudio/Guduru_sathish_kumar_0a3a04d4.png"
                alt="Guduru Sathish Kumar - From Classroom to Community Journey"
                className="w-full h-auto max-h-[580px] object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-300"
              />
              
              {/* Hover overlay badge */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="px-4 py-2 rounded-xl bg-black/80 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md">
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  <span>Click to Inspect Full-Size Infographic</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Lightbox Modal for Infographic */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-fade-in">
          {/* Lightbox Toolbar */}
          <div className="px-4 py-3 bg-[#18181b] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-white truncate">
                Guduru Sathish Kumar — Official Infographic & Profile
              </span>
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                ({Math.round(zoomLevel * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <a
                href="/assets/aistudio/Guduru_sathish_kumar_0a3a04d4.png"
                download="Guduru_Sathish_Kumar_Journey.png"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
                title="Download Infographic"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-2"
                title="Close Lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Content Image */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
            <img
              src="/assets/aistudio/Guduru_sathish_kumar_0a3a04d4.png"
              alt="Guduru Sathish Kumar - Infographic Full Resolution"
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
              className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TWIN PILLARS: LogiXGridOS & NewGen eEducation
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* PILLAR 1: LogiXGridOS */}
        <section className={`rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between border transition-all ${
          isLight
            ? 'bg-white border-red-200/90 text-slate-800 shadow-md hover:border-red-400'
            : 'bg-[#121214] border-red-500/30 text-white hover:border-red-500/50'
        }`}>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl overflow-hidden border shadow-lg shrink-0 transition-transform hover:scale-105 ${
                  isLight ? 'border-red-300 bg-white shadow-red-200/50' : 'border-red-500/50 bg-black shadow-red-950/60'
                }`}>
                  <img
                    src="/assets/aistudio/final_9ab59f78.jpeg"
                    alt="LogiXGridOS Official Logo Icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-black flex items-center gap-1.5 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    Logi<span className="text-red-500">X</span>Grid<span className="text-red-500">OS</span>
                  </h3>
                  <span className="text-xs text-red-500 font-semibold">Smart • Secure • Powerful Workstation</span>
                </div>
              </div>
            </div>

            <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              Data analysis shouldn't require you to memorize complex coding or endless Excel formulas. <strong className={`font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>LogiXGridOS</strong> is an innovative analytics workstation and OS portal built to give you complete data insights instantly.
            </p>

            <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              Born out of Sathish’s philosophy of practical utility, LogiXGridOS bypasses traditional formula barriers. It allows anyone to perform deep, meaningful data analytics effortlessly. It is fast, intuitive, and built for the modern era.
            </p>

            {/* Bullet features */}
            <div className="space-y-2 pt-2">
              <div className={`flex items-start gap-2 text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong className={isLight ? 'text-slate-900' : 'text-white'}>Zero Formula Syntax:</strong> Instant computations, statistics, aggregates and summaries without typing `=VLOOKUP` or `=INDEX(MATCH)`.</span>
              </div>
              <div className={`flex items-start gap-2 text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong className={isLight ? 'text-slate-900' : 'text-white'}>Multi-File Excel Lookup:</strong> Automatic column alignment, multi-source joins, and print-ready report studio.</span>
              </div>
              <div className={`flex items-start gap-2 text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong className={isLight ? 'text-slate-900' : 'text-white'}>Bilingual & Telugu IME:</strong> Full transliteration phonetic keyboard support for English and Telugu data entry.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-2.5">
            {onNavigateToTable && (
              <button
                type="button"
                onClick={onNavigateToTable}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 active:scale-95 cursor-pointer"
              >
                <Table2 className="w-4 h-4" />
                <span>Open LogiXGridOS Table</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onNavigateToLookup && (
              <button
                type="button"
                onClick={onNavigateToLookup}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                    : 'bg-[#1c1c1e] hover:bg-white/10 border-white/10 text-zinc-200 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 text-red-500" />
                <span>Lookup Studio</span>
              </button>
            )}
          </div>
        </section>

        {/* PILLAR 2: NewGen eEducation */}
        <section className={`rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between border transition-all ${
          isLight
            ? 'bg-white border-red-200/90 text-slate-800 shadow-md hover:border-red-400'
            : 'bg-[#121214] border-[#ff0000]/30 text-white hover:border-[#ff0000]/50'
        }`}>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-red-500 ${
                  isLight ? 'bg-red-50 border-red-200' : 'bg-[#ff0000]/15 border-[#ff0000]/30'
                }`}>
                  <MonitorPlay className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-black flex items-center gap-1.5 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                     NewGen <span className="text-red-500 font-extrabold animate-red-e">e</span>Education
                  </h3>
                  <span className="text-xs text-red-500 font-semibold">Smart Learning, Stress-Free</span>
                </div>
              </div>
            </div>

            <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              <strong className={`font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>NewGen eEducation</strong> is our premier digital education YouTube channel dedicated to preparing you for the future. We bridge the gap between academic theory and real-world technology.
            </p>

            {/* What We Teach Sub-Section */}
            <div className="space-y-3 pt-1">
              <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-zinc-400'
              }`}>
                <BookOpen className="w-3.5 h-3.5 text-red-500" />
                What We Teach
              </h4>
              <div className="space-y-2.5">
                <div className={`p-3 rounded-xl border space-y-0.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1c1c1e] border-white/5'
                }`}>
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>💻</span> Computer Science Core
                  </span>
                  <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Breaking down programming, algorithms, and fundamental computer science subjects into bite-sized, easy-to-understand videos.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border space-y-0.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1c1c1e] border-white/5'
                }`}>
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>🚀</span> Current & Emerging Technologies
                  </span>
                  <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Keeping you updated with the latest tech trends, AI, tools, and industry advancements.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border space-y-0.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1c1c1e] border-white/5'
                }`}>
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>🧠</span> All-Subject Conceptual Mastery
                  </span>
                  <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Helping you learn any subject by understanding the core concepts rather than just memorizing facts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <a
              href="https://youtube.com/@gudurusathishkumar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 active:scale-95 cursor-pointer"
            >
              <Youtube className="w-4 h-4 fill-current" />
              <span>Subscribe on YouTube (@gudurusathishkumar)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>
        </section>

      </div>

      {/* =========================================================================
          LEARNING PHILOSOPHY: Stress-Free & Conceptual
          ========================================================================= */}
      <section className={`rounded-3xl border p-6 sm:p-10 shadow-xl space-y-6 transition-all ${
        isLight
          ? 'bg-white border-blue-200 text-slate-800 shadow-md'
          : 'bg-gradient-to-br from-[#131b24] via-[#121214] to-[#17141f] border-blue-500/20 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Our Learning Philosophy: <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Stress-Free & Conceptual</span>
            </h2>
            <p className={`text-xs sm:text-sm font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Transforming how knowledge is internalized and applied
            </p>
          </div>
        </div>

        <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
          <p>
            Designed by a state-rank holder who knows exactly what it takes to master vast syllabi, <strong className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>we reject rote memorization and exam-night panic.</strong> Education should be exciting, not exhausting.
          </p>
          <p>
            At NewGen eEducation, we design our tutorials visually and conceptually so that complex topics stick with you naturally. We teach you how to think, ensuring a completely stress-free learning experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className={`p-4 rounded-2xl border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-[#1c1c1e] border-white/5'
          }`}>
            <div className="text-blue-500 font-bold text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>Anti-Rote</span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Zero memorization without understanding. Concepts stick naturally.</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-[#1c1c1e] border-white/5'
          }`}>
            <div className="text-emerald-500 font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Stress-Free</span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Visual breakdowns replace exam panic with complete confidence.</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-[#1c1c1e] border-white/5'
          }`}>
            <div className="text-amber-500 font-bold text-sm flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>First Principles</span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Learn why things work at the core rather than just surface facts.</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-[#1c1c1e] border-white/5'
          }`}>
            <div className="text-rose-500 font-bold text-sm flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span>Practical Impact</span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Real-world applications tested in software development and competitive arenas.</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          OUR VISION & CALL TO ACTION
          ========================================================================= */}
      <section className={`relative rounded-3xl p-8 sm:p-12 text-center shadow-2xl space-y-6 border transition-all ${
        isLight
          ? 'bg-gradient-to-br from-red-50/90 via-white to-rose-50/80 border-red-200 text-slate-800 shadow-lg'
          : 'bg-radial from-[#1e0a12] via-[#120508] to-[#090204] border-red-500/40 text-white shadow-red-950/50'
      }`}>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${
            isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Empowering Minds Worldwide</span>
          </div>

          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Our Vision
          </h2>

          <p className={`text-sm sm:text-base lg:text-lg leading-relaxed font-normal ${
            isLight ? 'text-slate-700' : 'text-zinc-200'
          }`}>
            To empower minds by building smart software and delivering world-class digital education. We want to make technology accessible, data analytics simple, and learning an enjoyable habit for everyone, everywhere.
          </p>

          <p className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 via-rose-500 to-amber-600 bg-clip-text text-transparent pt-2">
            Join us on this journey to work smarter, learn faster, and live stress-free!
          </p>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {onNavigateToTable && (
            <button
              type="button"
              onClick={onNavigateToTable}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
            >
              <Table2 className="w-4 h-4" />
              <span>Explore LogiXGridOS</span>
            </button>
          )}

          <a
            href="https://youtube.com/@gudurusathishkumar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
          >
            <Youtube className="w-4 h-4 fill-current" />
            <span>Subscribe on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

    </div>
  );
};
