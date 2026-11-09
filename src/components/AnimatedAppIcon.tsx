import React, { useState, useEffect } from 'react';
import { ThemeId } from '../types/theme';

interface AnimatedAppIconProps {
  className?: string;
  onClick?: () => void;
  currentTheme?: ThemeId;
}

export const AnimatedAppIcon: React.FC<AnimatedAppIconProps> = ({
  className = '',
  onClick,
  currentTheme,
}) => {
  // Shifts every 3 seconds between the red 'e' squircle and LogiXGridOS pill badge at Title Bar Only
  const [isExpanded, setIsExpanded] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Fallback detection if currentTheme prop is not provided: inspect data-theme on documentElement
  const [isLightMode, setIsLightMode] = useState(() => {
    if (currentTheme) return currentTheme === 'light';
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light';
    }
    return false;
  });

  useEffect(() => {
    if (currentTheme) {
      setIsLightMode(currentTheme === 'light');
    } else if (typeof document !== 'undefined') {
      const observer = new MutationObserver(() => {
        setIsLightMode(document.documentElement.getAttribute('data-theme') === 'light');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => observer.disconnect();
    }
  }, [currentTheme]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsExpanded((prev) => !prev);
      setPulseKey((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 cursor-pointer select-none group transition-all duration-500 ease-in-out ${className}`}
      title={isExpanded ? 'LogiXGridOS' : 'NewGen eEducation'}
    >
      {/* 1. Synchronized Border-Following Glow Pulse */}
      <div
        key={`border-glow-${pulseKey}`}
        className={`absolute -inset-[2px] pointer-events-none transition-all duration-500 ease-in-out animate-border-glow-pulse-3s ${
          isExpanded ? 'rounded-full' : 'rounded-[14px] sm:rounded-[16px]'
        }`}
      />

      {/* 2. Border-Following Rotating Beam Wrapper */}
      <div
        className={`relative p-[1.5px] overflow-hidden transition-[width,border-radius,box-shadow,border-color] duration-700 ease-in-out ${
          isLightMode
            ? 'shadow-[0_0_10px_rgba(239,68,68,0.35)] group-hover:shadow-[0_0_18px_rgba(239,68,68,0.6)]'
            : 'shadow-[0_0_14px_rgba(239,68,68,0.55)] group-hover:shadow-[0_0_22px_rgba(239,68,68,0.85)]'
        } h-9 sm:h-9.5 ${
          isExpanded
            ? 'w-[150px] sm:w-[162px] rounded-full'
            : 'w-9 sm:w-9.5 rounded-[13px] sm:rounded-[15px]'
        }`}
      >
        {/* Animated 3-second rotating gradient beam traveling continuously along the rounded borders */}
        <div
          className="absolute -inset-[200%] pointer-events-none opacity-95 group-hover:opacity-100"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(239, 68, 68, 0.45) 75%, rgba(255, 59, 48, 1) 92%, transparent 100%)',
            animation: 'round-spin-3s 3s linear infinite',
          }}
        />

        {/* 3. Inner Container with Smooth morphing and layout transition */}
        <div
          className={`relative z-10 flex items-center justify-center h-full w-full overflow-hidden transition-[border-radius,background-color,border-color,box-shadow] duration-700 ease-in-out ${
            isLightMode
              ? 'bg-gradient-to-b from-white via-rose-50 to-red-50/80 border border-red-300/80 group-hover:border-red-400 shadow-xs'
              : 'bg-gradient-to-b from-[#1f0609] via-[#120305] to-[#080203] border border-red-500/40 group-hover:border-red-400'
          } ${
            isExpanded
              ? 'rounded-full'
              : 'rounded-[11.5px] sm:rounded-[13.5px]'
          }`}
        >
          {/* State 1: Red 'e' squircle/orb with smooth slide and fade */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
              isExpanded
                ? 'opacity-0 scale-75 -translate-x-3 pointer-events-none'
                : 'opacity-100 scale-100 translate-x-0'
            }`}
          >
            <div
              className={`relative w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center transition-all duration-700 ${
                isLightMode
                  ? 'bg-gradient-to-b from-rose-50 to-red-100 border border-red-300/80 shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                  : 'bg-gradient-to-b from-red-600/30 via-red-900/60 to-black border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
              }`}
            >
              <span className="text-red-500 font-black text-sm sm:text-base leading-none drop-shadow-[0_0_8px_rgba(239,68,68,0.95)] animate-red-e">
                e
              </span>
            </div>
          </div>

          {/* State 2: LogiXGridOS with X and OS in Red Color, remaining in White/Dark Color + Red glowing dot with smooth glide */}
          <div
            className={`flex items-center justify-center gap-1.5 leading-none transition-all duration-700 ease-in-out whitespace-nowrap px-3 sm:px-3.5 ${
              isExpanded
                ? 'opacity-100 scale-100 translate-x-0'
                : 'opacity-0 scale-90 translate-x-3 pointer-events-none'
            }`}
          >
            <span className="text-xs sm:text-[13px] font-black tracking-tight select-none whitespace-nowrap">
              <span className={isLightMode ? 'text-slate-900 font-black' : 'text-white'}>Logi</span>
              <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.95)]">X</span>
              <span className={isLightMode ? 'text-slate-900 font-black' : 'text-white'}>Grid</span>
              <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.95)]">OS</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,0.95)] shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};
