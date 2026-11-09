import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
}) => {
  const sizeClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base font-black',
    lg: 'text-lg sm:text-xl font-black',
    xl: 'text-2xl sm:text-3xl font-black',
  };

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center gap-2 leading-none flex-wrap">
        <span className={`tracking-tight text-white flex items-center select-none ${sizeClasses[size]}`}>
          <span className="text-white">Logi</span>
          <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">X</span>
          <span className="text-white">Grid</span>
          <span className="text-red-500 font-black ml-0.5 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">OS</span>
        </span>
        <span className="text-zinc-500 text-[11px] font-normal hidden sm:inline">•</span>
        <span className="text-xs sm:text-[13px] text-zinc-300 font-semibold flex items-center tracking-tight">
          <span>NewGen </span>
          <span className="ml-1 flex items-baseline">
            <span 
              className="text-red-500 font-bold animate-red-e drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]"
              title="eEducation"
            >
              e
            </span>
            <span className="font-semibold text-zinc-200">Education</span>
          </span>
        </span>
      </div>
      {showSubtitle && (
        <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase mt-0.5">
          Smart • Secure • Powerful
        </span>
      )}
    </div>
  );
};
